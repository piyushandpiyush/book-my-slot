import mongoose from 'mongoose';

// Statuses whose time range blocks other bookings
export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED'];

const bookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // absent for walk-ins without an account
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: String,
  customerName: { type: String, required: true },
  customerPhone: String,
  customerGender: { type: String, enum: ['MALE', 'FEMALE', 'NOT_SPECIFIED'], default: 'NOT_SPECIFIED' },
  bookingDate: { type: String, required: true }, // YYYY-MM-DD (business local)
  startTime: { type: String, required: true },   // HH:mm
  endTime: { type: String, required: true },
  startMin: { type: Number, required: true },
  endMin: { type: Number, required: true },
  amount: { type: Number, required: true },
  bookingSource: { type: String, enum: ['ONLINE', 'WALK_IN'], required: true },
  bookingStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'PENDING',
  },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_REQUIRED'], default: 'PENDING' },
  holdExpiresAt: Date, // unpaid PENDING online bookings are released after this
  notes: String,
  cancelledBy: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bookingSchema.index({ businessId: 1, bookingDate: 1, bookingStatus: 1 });
bookingSchema.index({ customerId: 1, bookingDate: -1 });
bookingSchema.index({ bookingStatus: 1, holdExpiresAt: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
