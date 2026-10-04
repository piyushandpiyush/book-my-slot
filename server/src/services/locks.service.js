import { SlotLock } from '../models/SlotLock.js';
import { Booking, ACTIVE_STATUSES } from '../models/Booking.js';

export const BUCKET_MIN = 5;
const STALE_MS = 30_000;

export function keysFor(businessId, date, startMin, endMin) {
  const keys = [];
  for (let m = startMin; m < endMin; m += BUCKET_MIN) keys.push(`${businessId}:${date}:${m}`);
  return keys;
}

async function tryLock(key, bookingId) {
  const same = (doc) => doc && String(doc.bookingId) === String(bookingId);
  try {
    const r = await SlotLock.updateOne({ key }, { $setOnInsert: { bookingId } }, { upsert: true });
    if (r.upsertedCount) return 'new';
  } catch (e) {
    if (e.code !== 11000) throw e; // concurrent upsert lost the race -> fall through to ownership check
  }
  const existing = await SlotLock.findOne({ key });
  return same(existing) ? 'own' : 'conflict';
}

// A lock is stale when its booking is cancelled, or never got created (crashed request).
async function clearIfStale(key) {
  const existing = await SlotLock.findOne({ key });
  if (!existing) return true;
  const booking = await Booking.findById(existing.bookingId).select('bookingStatus');
  const stale = booking
    ? !ACTIVE_STATUSES.includes(booking.bookingStatus)
    : Date.now() - existing.createdAt.getTime() > STALE_MS;
  if (stale) await SlotLock.deleteOne({ _id: existing._id });
  return stale;
}

/**
 * Atomically reserve every 5-minute bucket in `keys` for `bookingId`.
 * Because `key` is unique, two concurrent requests can never both own a bucket.
 * Re-acquiring buckets the same booking already owns is allowed (used by reschedule).
 * Returns { ok, acquired } and rolls back anything it took if a bucket is unavailable.
 */
export async function acquireLocks(bookingId, keys) {
  const acquired = [];
  for (const key of keys) {
    let result = await tryLock(key, bookingId);
    if (result === 'conflict' && (await clearIfStale(key))) result = await tryLock(key, bookingId);
    if (result === 'new') acquired.push(key);
    if (result === 'conflict') {
      if (acquired.length) await SlotLock.deleteMany({ key: { $in: acquired }, bookingId });
      return { ok: false, acquired: [] };
    }
  }
  return { ok: true, acquired };
}

export async function releaseLocks(bookingId, { except = [] } = {}) {
  await SlotLock.deleteMany({ bookingId, ...(except.length && { key: { $nin: except } }) });
}
