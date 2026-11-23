import { Hono } from 'hono';
import { z } from 'zod';
import {
  createRandomBoard,
  isValidShot,
  updateBoard,
  isGameComplete,
  findShipAt,
  isShipSunk
} from '@chingchiehwang/arcade-core';
import { games } from '../db.js';
import { Game } from '../game.js';
import { requireUser, validate } from '../middleware.js';

const router = new Hono();

const idSchema = z.object({
  id: z.uuid('Invalid game id')
});

const shotSchema = z.object({
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(9)
});

async function findGame(id) {
  const doc = await games.findOne({ _id: id });
  if (!doc) return null;
  return new Game(doc);
}

async function saveGame(game) {
  await games.replaceOne({ _id: game._id }, game);
}

router.get('/', async (c) => {
  const user = c.get('user');
  let waiting = [];
  let mine = [];
  if (user) {
    waiting = await games.find({ players: { $size: 1 }, 'players.id': { $ne: user._id } }).toArray();
    mine = await games.find({ 'players.id': user._id }).toArray();
  } else {
    waiting = await games.find({ players: { $size: 1 } }).toArray();
  }
  return c.json(
    {
      waiting: waiting.map((doc) => new Game(doc).getSummary()),
      mine: mine.map((doc) => new Game(doc).getSummary())
    },
    200
  );
});

router.post('/', requireUser, async (c) => {
  const user = c.get('user');
  const game = new Game({
    _id: crypto.randomUUID(),
    players: [{ id: user._id, email: user.email }],
    grids: [createRandomBoard(), createRandomBoard()],
    turn: null,
    winner: null
  });
  await games.insertOne(game);
  return c.json({ game: game.getView(user) }, 201);
});

router.get('/:id', validate('param', idSchema), async (c) => {
  const user = c.get('user');
  const game = await findGame(c.req.valid('param').id);

  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  if (!user && !game.isFinished()) {
    return c.json({ error: 'Log in to see this game' }, 401);
  }
  if (game.isActive() && game.getPlayerIndex(user) === -1) {
    return c.json({ error: 'You are not in this game' }, 403);
  }

  return c.json({ game: game.getView(user) }, 200);
});

router.post('/:id/players', requireUser, validate('param', idSchema), async (c) => {
  const user = c.get('user');
  const game = await findGame(c.req.valid('param').id);

  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  if (game.getPlayerIndex(user) !== -1) {
    return c.json({ error: 'You are already in this game' }, 409);
  }
  if (!game.isWaiting()) {
    return c.json({ error: 'This game is full' }, 409);
  }

  game.players.push({ id: user._id, email: user.email });
  game.turn = 0;
  await saveGame(game);

  return c.json({ game: game.getView(user) }, 201);
});

router.post(
  '/:id/shots',
  requireUser,
  validate('param', idSchema),
  validate('json', shotSchema),
  async (c) => {
    const user = c.get('user');
    const { x, y } = c.req.valid('json');
    const game = await findGame(c.req.valid('param').id);

    if (!game) {
      return c.json({ error: 'Game not found' }, 404);
    }
    const user_idx = game.getPlayerIndex(user);
    if (user_idx === -1) {
      return c.json({ error: 'You are not in this game' }, 403);
    }
    if (!game.isActive()) {
      return c.json({ error: 'This game is not being played' }, 409);
    }
    if (game.turn !== user_idx) {
      return c.json({ error: 'It is not your turn' }, 409);
    }

    const other = user_idx === 0 ? 1 : 0;
    if (!isValidShot(game.grids[other], x, y)) {
      return c.json({ error: 'You already fired at that block' }, 409);
    }

    const grid = updateBoard(game.grids[other], x, y);
    game.grids[other] = grid;

    if (isGameComplete(grid)) {
      game.winner = user_idx;
      game.turn = null;
    } else {
      game.turn = other;
    }
    await saveGame(game);

    const ship = findShipAt(grid, x, y);
    const sunk = ship !== null && isShipSunk(grid, ship);
    return c.json({ result: grid.shots[y][x], sunk: sunk, game: game.getView(user) }, 201);
  }
);

export default router;
