import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { users, sessions } from '../db.js';
import { requireUser, validate } from '../middleware.js';

const auth = new Hono();

const credentials = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function createSession(userId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sessions.insertOne({ token: token, userId: userId, expiresAt: expiresAt });
  return token;
}

function publicUser(user) {
  return { id: user._id.toString(), email: user.email };
}

auth.post('/signup', validate('json', credentials), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = { email: email.toLowerCase(), passwordHash: await hashPassword(password) };

  try {
    const result = await users.insertOne(user);
    user._id = result.insertedId;
  } catch (err) {
    if (err.code === 11000) {
      return c.json({ error: 'That email is already registered' }, 409);
    }
    throw err;
  }

  const token = await createSession(user._id);
  return c.json({ user: publicUser(user), token: token }, 201);
});

auth.post('/login', validate('json', credentials), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await users.findOne({ email: email.toLowerCase() });

  if (!user || !(await checkPassword(password, user.passwordHash))) {
    return c.json({ error: 'Wrong email or password' }, 401);
  }

  const token = await createSession(user._id);
  return c.json({ user: publicUser(user), token: token }, 200);
});

auth.post('/logout', requireUser, async (c) => {
  await sessions.deleteOne({ token: c.get('token') });
  return c.json({ message: 'Logged out' }, 200);
});

auth.get('/me', requireUser, (c) => {
  return c.json({ user: publicUser(c.get('user')) }, 200);
});

export default auth;
