import { Server } from 'socket.io';
import { env } from './config/env.js';
import { userFromToken } from './middleware/auth.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });

  io.on('connection', (socket) => {
    // Register listeners synchronously: the client emits right after connecting, so
    // attaching them after an `await` would drop early events.
    // Anyone can watch a business's availability (public data)
    socket.on('watch:business', (businessId) => {
      if (typeof businessId === 'string' && businessId.length <= 40) socket.join(`business:${businessId}`);
    });
    socket.on('unwatch:business', (businessId) => socket.leave(`business:${businessId}`));

    // Optional auth through the httpOnly cookie -> personal notification room
    const raw = socket.handshake.headers.cookie || '';
    const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith('token='));
    if (match) {
      userFromToken(decodeURIComponent(match.slice(6)))
        .then((user) => { if (user) socket.join(`user:${user._id}`); })
        .catch(() => {});
    }
  });
  return io;
}

export const closeSocket = () => { io?.close(); io = null; };

export function emitAvailabilityChanged(businessId, date) {
  io?.to(`business:${businessId}`).emit('availability:changed', { businessId: String(businessId), date });
}
export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}