import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { Booking } from '../models/Booking.js';
import { Business } from '../models/Business.js';
import { AppError } from '../utils/errors.js';
import { acquireLocks, keysFor } from './locks.service.js';
import { emitAvailabilityChanged } from '../realtime.js';
import { notify } from './notification.service.js';
import { toInstant } from '../utils/time.js';

export const isMockMode = () => !(env.razorpayKeyId && env.razorpayKeySecret);
export const MOCK_SIGNATURE = 'mock_signature';

const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export async function createOrder(user, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(user._id)) throw new AppError('Booking not found', 404);
  if (booking.bookingStatus !== 'PENDING' || !['PENDING', 'FAILED'].includes(booking.paymentStatus)) {
    throw new AppError('This booking is not awaiting payment.', 400);
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    throw new AppError('Your slot hold expired. Please book again.', 410);
  }

  let orderId;
  if (isMockMode()) {
    orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
  } else {
    const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(booking.amount * 100), currency: 'INR', receipt: booking.bookingNumber }),
    });
    if (!res.ok) throw new AppError('Could not create payment order', 502);
    orderId = (await res.json()).id;
  }
  const payment = await Payment.create({
    bookingId: booking._id, customerId: user._id, amount: booking.amount,
    razorpayOrderId: orderId, mock: isMockMode(),
  });
  return {
    orderId, amount: booking.amount, currency: 'INR', paymentId: payment._id,
    mock: isMockMode(), keyId: env.razorpayKeyId || null,
  };
}

/**
 * Idempotently settle a verified payment. Handles the "paid but slot lost" case:
 * if the hold expired we try to re-take the slot; if that fails the payment is
 * flagged REFUND_REQUIRED (auto-refunded in mock mode) so the customer is never
 * left charged without a booking.
 */
export async function settlePayment(payment, razorpayPaymentId) {
  if (payment.status === 'PAID' || payment.status === 'REFUNDED' || payment.status === 'REFUND_REQUIRED') {
    const booking = await Booking.findById(payment.bookingId);
    return { payment, booking, confirmed: booking?.bookingStatus === 'CONFIRMED' };
  }
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.status = 'PAID';
  await payment.save();

  let booking = await Booking.findById(payment.bookingId);
  if (!booking) return { payment, booking: null, confirmed: false };

  // Fast path: still held -> confirm atomically (only if still PENDING)
  booking = await Booking.findOneAndUpdate(
    { _id: booking._id, bookingStatus: 'PENDING' },
    { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID', $unset: { holdExpiresAt: 1 } },
    { returnDocument: 'after' },
  ) || booking;

  if (booking.bookingStatus === 'CONFIRMED') {
    await finishConfirm(booking);
    return { payment, booking, confirmed: true };
  }

  // Hold had expired: try to re-take the same slot if it is still free and in the future
  if (booking.bookingStatus === 'CANCELLED' && booking.cancelledBy === 'SYSTEM' && toInstant(booking.bookingDate, booking.startTime) > new Date()) {
    const lock = await acquireLocks(booking._id, keysFor(booking.businessId, booking.bookingDate, booking.startMin, booking.endMin));
    if (lock.ok) {
      booking.bookingStatus = 'CONFIRMED'; booking.paymentStatus = 'PAID';
      booking.holdExpiresAt = undefined; booking.cancelledBy = undefined;
      await booking.save();
      await finishConfirm(booking);
      return { payment, booking, confirmed: true };
    }
  }
  await markRefund(booking._id, { forcePayment: payment });
  return { payment, booking: await Booking.findById(booking._id), confirmed: false };
}

async function finishConfirm(booking) {
  emitAvailabilityChanged(booking.businessId, booking.bookingDate);
  await notify(booking.customerId, 'Booking Confirmed', `${booking.serviceName} on ${booking.bookingDate} at ${booking.startTime}`, booking._id);
  const biz = await Business.findById(booking.businessId).select('ownerId');
  await notify(biz?.ownerId, 'New Online Booking', `${booking.customerName} - ${booking.serviceName} on ${booking.bookingDate} at ${booking.startTime}`, booking._id);
}

// Paid bookings that get cancelled (or lost the slot) are refunded. Real Razorpay refunds
// are processed by the admin/ops via the dashboard, so they stay REFUND_REQUIRED.
export async function markRefund(bookingId, { forcePayment } = {}) {
  const payments = forcePayment ? [forcePayment] : await Payment.find({ bookingId, status: 'PAID' });
  for (const p of payments) {
    p.status = p.mock ? 'REFUNDED' : 'REFUND_REQUIRED';
    await p.save();
  }
  if (payments.length) {
    await Booking.updateOne({ _id: bookingId }, { paymentStatus: payments.every((p) => p.mock) ? 'REFUNDED' : 'PAID' });
  }
}

export async function verifyPayment(user, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment || String(payment.customerId) !== String(user._id)) throw new AppError('Payment not found', 404);

  const valid = payment.mock
    ? isMockMode() && razorpay_signature === MOCK_SIGNATURE
    : !isMockMode() && safeEqual(hmac(env.razorpayKeySecret, `${razorpay_order_id}|${razorpay_payment_id}`), razorpay_signature);
  if (!valid) {
    if (payment.status === 'CREATED') { payment.status = 'FAILED'; await payment.save(); }
    await Booking.updateOne({ _id: payment.bookingId, bookingStatus: 'PENDING' }, { paymentStatus: 'FAILED' });
    throw new AppError('Payment verification failed', 400);
  }
  return settlePayment(payment, razorpay_payment_id);
}

export async function handleWebhook(rawBody, signature) {
  if (!env.razorpayWebhookSecret) throw new AppError('Webhook not configured', 503);
  if (!signature || !safeEqual(hmac(env.razorpayWebhookSecret, rawBody), signature)) throw new AppError('Invalid signature', 400);
  const event = JSON.parse(rawBody);
  const entity = event?.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event.event) && entity?.order_id) {
    const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
    if (payment) await settlePayment(payment, entity.id);
  } else if (event.event === 'payment.failed' && entity?.order_id) {
    await Payment.updateOne({ razorpayOrderId: entity.order_id, status: 'CREATED' }, { status: 'FAILED' });
  }
}
