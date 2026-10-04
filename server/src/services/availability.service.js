import { Booking, ACTIVE_STATUSES } from '../models/Booking.js';
import { AppError } from '../utils/errors.js';
import { dayOfWeek, nowLocal, toHHMM, toMinutes } from '../utils/time.js';

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

export function dayConfig(business, date) {
  const cfg = business.workingHours.find((d) => d.day === dayOfWeek(date));
  if (!cfg || !cfg.isOpen) return null;
  return { open: toMinutes(cfg.open), close: toMinutes(cfg.close) };
}

export const hitsBreak = (business, startMin, endMin) =>
  (business.breakHours || []).some((b) => overlaps(startMin, endMin, toMinutes(b.start), toMinutes(b.end)));

export async function activeBookingsForDay(businessId, date) {
  return Booking.find({ businessId, bookingDate: date, bookingStatus: { $in: ACTIVE_STATUSES } })
    .select('startMin endMin');
}

/**
 * Slots for one service on one date. A slot is `available` only if the whole
 * service duration fits in working hours, avoids breaks, is in the future and
 * does not overlap any active booking (newStart < existingEnd && newEnd > existingStart).
 */
export function computeSlots(business, service, date, bookings, { now = new Date(), excludeBookingId, walkIn = false } = {}) {
  const cfg = dayConfig(business, date);
  if (!cfg) return [];
  const local = nowLocal(now);
  if (date < local.date) return [];
  const live = bookings.filter((b) => !excludeBookingId || String(b._id) !== String(excludeBookingId));
  const slots = [];
  // Walk-in view: finer 15-min grid, and a slot that already started is still usable (customer is here now)
  const step = walkIn ? Math.min(15, business.slotInterval) : business.slotInterval;
  for (let start = cfg.open; start + service.duration <= cfg.close; start += step) {
    const end = start + service.duration;
    let reason = null;
    if (date === local.date && (walkIn ? end <= local.minutes : start <= local.minutes)) reason = 'PAST';
    else if (hitsBreak(business, start, end)) reason = 'BREAK';
    else if (live.some((b) => overlaps(start, end, b.startMin, b.endMin))) reason = 'BOOKED';
    slots.push({ startTime: toHHMM(start), endTime: toHHMM(end), available: !reason, ...(reason && { reason }) });
  }
  return slots;
}

export async function getAvailability(business, service, date, opts = {}) {
  const bookings = await activeBookingsForDay(business._id, date);
  return computeSlots(business, service, date, bookings, opts);
}

// Used for walk-ins: arbitrary start time, but it must sit inside working hours and avoid breaks.
export function assertWithinOpenHours(business, date, startMin, endMin) {
  const cfg = dayConfig(business, date);
  if (!cfg) throw new AppError('The business is closed on this day.', 400);
  if (startMin < cfg.open || endMin > cfg.close) {
    throw new AppError(`Appointment must fall within working hours (${toHHMM(cfg.open)} - ${toHHMM(cfg.close)}).`, 400);
  }
  if (hitsBreak(business, startMin, endMin)) throw new AppError('This time overlaps with a break.', 400);
}
