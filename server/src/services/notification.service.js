import { Notification } from '../models/Notification.js';
import { emitToUser } from '../realtime.js';

export async function notify(userId, title, message, bookingId) {
  if (!userId) return;
  try {
    const n = await Notification.create({ userId, title, message, bookingId });
    emitToUser(userId, 'notification', n);
  } catch (e) {
    console.error('[notify] failed', e.message);
  }
}
