import { io } from 'socket.io-client';

// Socket.IO needs a long-lived server (Vercel cannot proxy websockets), so in a split deployment point
// VITE_SOCKET_URL at the API server. Empty = same origin (local dev proxy, or API serving the client).
const URL = import.meta.env.VITE_SOCKET_URL || undefined;
export const connectSocket = () => io(URL, { withCredentials: true });
