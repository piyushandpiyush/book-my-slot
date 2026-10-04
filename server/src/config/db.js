import mongoose from 'mongoose';
import { env } from './env.js';

let memServer = null;

export async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    uri = memServer.getUri('bookmyslot');
    console.log('[db] Using in-memory MongoDB (set MONGODB_URI for a real database)');
  }
  mongoose.connection.on('error', (e) => console.error('[db] connection error:', e.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected - driver will retry'));
  // Fail fast with a clear message if Atlas is paused / IP not whitelisted, instead of hanging for 30s
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  await mongoose.syncIndexes();
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memServer) await memServer.stop();
  memServer = null;
}
