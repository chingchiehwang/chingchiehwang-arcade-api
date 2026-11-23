import { zValidator } from '@hono/zod-validator';
import { users, sessions } from './db.js';

export async function getUser(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.replace('Bearer ', '');
  let user = null;

  if (token) {
    const session = await sessions.findOne({ token: token });
    if (session && session.expiresAt > new Date()) {
      user = await users.findOne({ _id: session.userId });
    }
  }

  c.set('token', token);
  c.set('user', user);
  await next();
}

export async function requireUser(c, next) {
  if (!c.get('user')) {
    return c.json({ error: 'You need to log in' }, 401);
  }
  await next();
}

export function validate(target, schema) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400);
    }
  });
}
