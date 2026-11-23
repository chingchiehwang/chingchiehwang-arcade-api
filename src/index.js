import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getUser } from './middleware.js';
import auth from './routes/auth.js';
import games from './routes/games.js';

const app = new Hono();

app.use('*', getUser);
app.route('/api/auth', auth);
app.route('/api/games', games);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, err.status || 500);
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port: port });
