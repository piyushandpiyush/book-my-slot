import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Booking, ACTIVE_STATUSES } from '../models/Booking.js';
import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { AppError } from '../utils/errors.js';
import { nowLocal, toHHMM, toInstant, toMinutes } from '../utils/time.js';
import { assertWithinOpenHours, getAvailability } from './availability.service.js';
import { acquireLocks, keysFor, releaseLocks } from './locks.service.js';
import { markRefund } from './payment.service.js';
import { notify } from './notification.service.js';
import { emitAvailabilityChanged } from '../realtime.js';

const MAX_ADVANCE_DAYS = 60;
export const SLOT_TAKEN = 'This slot is no longer available.';

export function assertGenderEligible(business, gender) {
  if (business.genderCategory === 'UNISEX') return;
  const need = business.genderCategory === 'MALE_ONLY' ? 'MALE' : 'FEMALE';
  if (gender === need) return;
  const label = need === 'MALE' ? 'male' : 'female';
  if (gender === 'NOT_SPECIFIED' || !gender) {
    throw new AppError(`This business is available for ${label} customers only. Please set your gender in your profile.`, 403);
  }
  throw new AppError(`This business is available for ${label} customers only.`, 403);
}

const bookingNumber = () => `BMS-${nowLocal().date.replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;


/** Release unpaid online holds that ran out of time so their slots reopen. */
export async function expireStaleHolds(businessId) {
  const stale = await Booking.find({
    bookingStatus: 'PENDING', paymentStatus: { $in: ['PENDING', 'FAILED'] },
    holdExpiresAt: { $lt: new Date() }, ...(businessId && { businessId }),
  });
  for (const b of stale) {
    const r = await Booking.updateOne(
      { _id: b._id, bookingStatus: 'PENDING' },
      { bookingStatus: 'CANCELLED', cancelledBy: 'SYSTEM' },
    );
    if (r.modifiedCount) {
      await releaseLocks(b._id);
      emitAvailabilityChanged(b.businessId, b.bookingDate);
    }
  }
}

async function overlapExists(businessId, date, startMin, endMin, excludeId) {
  return Booking.exists({
    businessId, bookingDate: date, bookingStatus: { $in: ACTIVE_STATUSES },
    startMin: { $lt: endMin }, endMin: { $gt: startMin },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });
}

// Shared by ONLINE and WALK_IN: reserve the time range atomically, then persist the booking.
async function reserve({ business, service, date, startMin, source, customer, status, paymentStatus, createdBy, notes, holdExpiresAt }) {
  const endMin = startMin + service.duration;
  if (await overlapExists(business._id, date, startMin, endMin)) throw new AppError(SLOT_TAKEN, 409);

  const _id = new mongoose.Types.ObjectId();
  const lock = await acquireLocks(_id, keysFor(business._id, date, startMin, endMin));
  if (!lock.ok) throw new AppError(SLOT_TAKEN, 409);
  try {
    const booking = await Booking.create({
      _id, bookingNumber: bookingNumber(),
      customerId: customer.id, businessId: business._id, serviceId: service._id, serviceName: service.name,
      customerName: customer.name, customerPhone: customer.phone, customerGender: customer.gender,
      bookingDate: date, startTime: toHHMM(startMin), endTime: toHHMM(endMin), startMin, endMin,
      amount: service.price, bookingSource: source, bookingStatus: status, paymentStatus,
      holdExpiresAt, notes, createdBy,
    });
    emitAvailabilityChanged(business._id, date);
    return booking;
  } catch (e) {
    await releaseLocks(_id);
    throw e;
  }
}

async function loadBusinessAndService(businessId, serviceId, { requireActive = true } = {}) {
  const business = await Business.findById(businessId);
  if (!business || (requireActive && business.status !== 'ACTIVE')) throw new AppError('Business not found or not accepting bookings', 404);
  const service = await Service.findOne({ _id: serviceId, businessId: business._id, isActive: true });
  if (!service) throw new AppError('Service not found', 404);
  return { business, service };
}

export async function createOnlineBooking(user, { businessId, serviceId, bookingDate, startTime, notes }) {
  if (user.role !== 'CUSTOMER') throw new AppError('Only customers can book online', 403);
  const { business, service } = await loadBusinessAndService(businessId, serviceId);
  assertGenderEligible(business, user.gender);

  const local = nowLocal();
  const maxDate = new Date(Date.parse(`${local.date}T00:00:00Z`) + MAX_ADVANCE_DAYS * 86400000).toISOString().slice(0, 10);
  if (bookingDate < local.date || (bookingDate === local.date && toMinutes(startTime) <= local.minutes)) {
    throw new AppError('Cannot book a time in the past.', 400);
  }
  if (bookingDate > maxDate) throw new AppError(`Bookings open only ${MAX_ADVANCE_DAYS} days in advance.`, 400);

  await expireStaleHolds(business._id);
  const slots = await getAvailability(business, service, bookingDate);
  const slot = slots.find((s) => s.startTime === startTime);
  if (!slot) throw new AppError('Invalid slot for this service and date.', 400);
  if (!slot.available) throw new AppError(SLOT_TAKEN, 409);

  const needsPayment = business.requireOnlinePayment && service.price > 0;
  const booking = await reserve({
    business, service, date: bookingDate, startMin: toMinutes(startTime), source: 'ONLINE',
    customer: { id: user._id, name: user.name, phone: user.phone, gender: user.gender },
    status: needsPayment ? 'PENDING' : 'CONFIRMED',
    paymentStatus: needsPayment ? 'PENDING' : 'NOT_REQUIRED',
    holdExpiresAt: needsPayment ? new Date(Date.now() + env.holdMinutes * 60000) : undefined,
    createdBy: user._id, notes,
  });
  if (!needsPayment) {
    await notify(user._id, 'Booking Confirmed', `${service.name} on ${bookingDate} at ${startTime}`, booking._id);
    await notify(business.ownerId, 'New Online Booking', `${user.name} - ${service.name} on ${bookingDate} at ${startTime}`, booking._id);
  }
  return booking;
}

export async function createWalkIn(owner, business, { customerName, customerPhone, customerGender, serviceId, bookingDate, startTime, notes }) {
  const { service } = await loadBusinessAndService(business._id, serviceId, { requireActive: false });
  if (business.status !== 'ACTIVE') throw new AppError('Your business is not active yet.', 403);
  assertGenderEligible(business, customerGender);

  const local = nowLocal();
  if (bookingDate < local.date) throw new AppError('Cannot create a walk-in in the past.', 400);
  const startMin = toMinutes(startTime);
  if (startMin % 5 !== 0) throw new AppError('Start time must be a multiple of 5 minutes.', 400);
  if (bookingDate === local.date && startMin + service.duration <= local.minutes) {
    throw new AppError('This time has already passed.', 400);
  }
  assertWithinOpenHours(business, bookingDate, startMin, startMin + service.duration);

  await expireStaleHolds(business._id);
  // Walk-ins are physically present: start immediately as ARRIVED.
  return reserve({
    business, service, date: bookingDate, startMin, source: 'WALK_IN',
    customer: { name: customerName, phone: customerPhone, gender: customerGender },
    status: 'ARRIVED', paymentStatus: 'NOT_REQUIRED', createdBy: owner._id, notes,
  });
}

function assertBeforeCutoff(booking) {
  const msLeft = toInstant(booking.bookingDate, booking.startTime).getTime() - Date.now();
  if (msLeft < env.cancelCutoffHours * 3600000) {
    throw new AppError(`Changes are allowed only until ${env.cancelCutoffHours} hours before the appointment.`, 400);
  }
}

export async function cancelBooking(booking, actor) {
  const isOwner = actor.role === 'OWNER';
  const allowed = isOwner ? ['PENDING', 'CONFIRMED', 'ARRIVED'] : ['PENDING', 'CONFIRMED'];
  if (!allowed.includes(booking.bookingStatus)) throw new AppError(`A ${booking.bookingStatus} booking cannot be cancelled.`, 400);
  if (!isOwner) assertBeforeCutoff(booking);

  const r = await Booking.updateOne(
    { _id: booking._id, bookingStatus: { $in: allowed } },
    { bookingStatus: 'CANCELLED', cancelledBy: actor.role },
  );
  if (!r.modifiedCount) throw new AppError('Booking was updated by someone else. Please refresh.', 409);
  await releaseLocks(booking._id);
  await markRefund(booking._id);
  emitAvailabilityChanged(booking.businessId, booking.bookingDate);

  const fresh = await Booking.findById(booking._id);
  const biz = await Business.findById(booking.businessId).select('ownerId name');
  const msg = `${booking.serviceName} on ${booking.bookingDate} at ${booking.startTime}`;
  if (isOwner) await notify(booking.customerId, 'Appointment Cancelled', `${biz?.name} cancelled: ${msg}`, booking._id);
  else await notify(biz?.ownerId, 'Booking Cancelled', `${booking.customerName} cancelled: ${msg}`, booking._id);
  return fresh;
}

export async function rescheduleBooking(booking, user, { bookingDate, startTime }) {
  if (!['PENDING', 'CONFIRMED'].includes(booking.bookingStatus)) throw new AppError('Only upcoming bookings can be rescheduled.', 400);
  assertBeforeCutoff(booking);
  if (bookingDate === booking.bookingDate && startTime === booking.startTime) throw new AppError('Choose a different time.', 400);

  const { business, service } = await loadBusinessAndService(booking.businessId, booking.serviceId);
  const local = nowLocal();
  if (bookingDate < local.date || (bookingDate === local.date && toMinutes(startTime) <= local.minutes)) {
    throw new AppError('Cannot book a time in the past.', 400);
  }
  await expireStaleHolds(business._id);
  const slots = await getAvailability(business, service, bookingDate, { excludeBookingId: booking._id });
  const slot = slots.find((s) => s.startTime === startTime);
  if (!slot) throw new AppError('Invalid slot for this service and date.', 400);
  if (!slot.available) throw new AppError(SLOT_TAKEN, 409);

  const startMin = toMinutes(startTime);
  const endMin = startMin + service.duration;
  const keys = keysFor(business._id, bookingDate, startMin, endMin);
  const lock = await acquireLocks(booking._id, keys);
  if (!lock.ok) throw new AppError(SLOT_TAKEN, 409);

  const oldDate = booking.bookingDate;
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, bookingStatus: { $in: ['PENDING', 'CONFIRMED'] } },
    { bookingDate, startTime, endTime: toHHMM(endMin), startMin, endMin },
    { returnDocument: 'after' },
  );
  if (!updated) {
    await releaseLocks(booking._id, { except: keysFor(business._id, oldDate, booking.startMin, booking.endMin) });
    throw new AppError('Booking was updated by someone else. Please refresh.', 409);
  }
  await releaseLocks(booking._id, { except: keys });
  emitAvailabilityChanged(business._id, oldDate);
  emitAvailabilityChanged(business._id, bookingDate);
  await notify(user._id, 'Appointment Rescheduled', `${service.name} moved to ${bookingDate} at ${startTime}`, booking._id);
  await notify(business.ownerId, 'Booking Rescheduled', `${booking.customerName} moved to ${bookingDate} at ${startTime}`, booking._id);
  return updated;
}

const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['IN_SERVICE', 'CANCELLED'],
  IN_SERVICE: ['COMPLETED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
};

export async function changeStatus(booking, owner, next) {
  if (!(TRANSITIONS[booking.bookingStatus] || []).includes(next)) {
    throw new AppError(`Cannot change status from ${booking.bookingStatus} to ${next}.`, 400);
  }
  if (next === 'CANCELLED') return cancelBooking(booking, owner);
  if (next === 'CONFIRMED' && booking.paymentStatus === 'PENDING') throw new AppError('Booking is awaiting online payment.', 400);
  if (next === 'NO_SHOW' && toInstant(booking.bookingDate, booking.startTime) > new Date()) {
    throw new AppError('Cannot mark no-show before the appointment time.', 400);
  }
  const update = { bookingStatus: next };
  if (next === 'CONFIRMED') update.$unset = { holdExpiresAt: 1 };
  const updated = await Booking.findOneAndUpdate({ _id: booking._id, bookingStatus: booking.bookingStatus }, update, { returnDocument: 'after' });
  if (!updated) throw new AppError('Booking was updated by someone else. Please refresh.', 409);

  if (next === 'NO_SHOW') {
    await releaseLocks(booking._id);
    emitAvailabilityChanged(booking.businessId, booking.bookingDate);
  }
  if (next === 'COMPLETED') await notify(booking.customerId, 'Service Completed', 'Thanks for visiting! Please rate your experience.', booking._id);
  emitAvailabilityChanged(booking.businessId, booking.bookingDate);
  return updated;
}

