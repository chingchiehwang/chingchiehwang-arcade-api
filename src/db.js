import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const db = client.db(process.env.DB_NAME || 'arcade');

export const users = db.collection('users');
export const sessions = db.collection('sessions');
export const games = db.collection('games');

await users.createIndex({ email: 1 }, { unique: true });
