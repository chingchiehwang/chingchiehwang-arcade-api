import { isShipSunk } from '@chingchiehwang/arcade-core';

export const Status = Object.freeze({
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished'
});

export class Game {
  constructor(doc) {
    Object.assign(this, doc);
  }

  isWaiting() {
    return this.players.length < 2;
  }

  isFinished() {
    return this.winner !== null;
  }

  isActive() {
    return !this.isWaiting() && !this.isFinished();
  }

  getStatus() {
    if (this.isWaiting()) return Status.WAITING;
    if (this.isFinished()) return Status.FINISHED;
    return Status.ACTIVE;
  }

  getPlayerIndex(user) {
    if (!user) return -1;
    return this.players.findIndex((p) => p.id.equals(user._id));
  }

  getGridForUser(i, user) {
    const grid = this.grids[i];
    const user_idx = this.getPlayerIndex(user);

    if (this.isFinished()) return grid;
    if (i === user_idx) return grid;
    if (user_idx === -1) return null;

    return {
      ships: grid.ships.filter((ship) => isShipSunk(grid, ship)),
      shots: grid.shots
    };
  }

  getSummary() {
    return {
      id: this._id,
      status: this.getStatus(),
      players: this.players.map((p) => ({ id: p.id.toString(), email: p.email })),
      turn: this.turn,
      winner: this.winner
    };
  }

  getView(user) {
    const grids = [];

    for (let i = 0; i < this.players.length; i++) {
      const grid = this.getGridForUser(i, user);
      if (grid) {
        grids.push({ owner: this.players[i].email, grid: grid });
      }
    }

    return { ...this.getSummary(), grids: grids };
  }
}
