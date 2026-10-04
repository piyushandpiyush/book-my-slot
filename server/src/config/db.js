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
  await mongoose.connect(uri);
  await mongoose.syncIndexes();
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memServer) await memServer.stop();
  memServer = null;
}
