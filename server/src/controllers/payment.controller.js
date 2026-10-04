import { asyncHandler, ok, AppError } from '../utils/errors.js';
import * as pay from '../services/payment.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  ok(res, await pay.createOrder(req.user, req.body.bookingId), 'Order created', 201);
});

export const verify = asyncHandler(async (req, res) => {
  const { booking, confirmed } = await pay.verifyPayment(req.user, req.body);
  if (!confirmed) {
    // Customer paid but the slot could not be kept -> never silently lose their money
    throw new AppError('Payment received but the slot was released and taken by someone else. A refund has been initiated.', 409, { refund: true, booking });
  }
  ok(res, { booking }, 'Payment verified. Booking confirmed');
});

// Mounted with express.raw so the HMAC is computed over the exact bytes Razorpay signed
export const webhook = asyncHandler(async (req, res) => {
  await pay.handleWebhook(req.body.toString('utf8'), req.headers['x-razorpay-signature']);
  res.json({ success: true });
});

export const config = (_req, res) => ok(res, { mock: pay.isMockMode(), mockSignature: pay.isMockMode() ? pay.MOCK_SIGNATURE : undefined });
