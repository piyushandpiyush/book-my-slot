import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: String,
  mock: { type: Boolean, default: false },
  status: { type: String, enum: ['CREATED', 'PAID', 'FAILED', 'REFUND_REQUIRED', 'REFUNDED'], default: 'CREATED' },
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
