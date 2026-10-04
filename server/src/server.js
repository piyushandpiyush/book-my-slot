import http from 'node:http';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './realtime.js';
import { expireStaleHolds } from './services/booking.service.js';
import { seedAdmin, seedDemo } from './seed.js';

await connectDB();
await seedAdmin();
// In-memory dev database starts empty, so load demo data for a usable first run
if (!env.mongoUri && !env.isProd) await seedDemo();

const server = http.createServer(createApp());
initSocket(server);

// Background sweeper: reopen slots whose unpaid hold has expired
setInterval(() => expireStaleHolds().catch((e) => console.error('[sweeper]', e.message)), 60_000).unref();

server.listen(env.port, () => console.log(`[server] BookMySlot API on http://localhost:${env.port}`));
