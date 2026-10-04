import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { Payment } from '../models/Payment.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { nowLocal } from '../utils/time.js';
import { notify } from '../services/notification.service.js';

export const stats = asyncHandler(async (_req, res) => {
  const today = nowLocal().date;
  const [customers, businesses, active, pending, bookings, todays, revenue] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER' }),
    Business.countDocuments(),
    Business.countDocuments({ status: 'ACTIVE' }),
    Business.countDocuments({ status: 'PENDING' }),
    Booking.countDocuments(),
    Booking.countDocuments({ bookingDate: today }),
    Booking.aggregate([{ $match: { bookingStatus: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  ok(res, {
    totalCustomers: customers, totalBusinesses: businesses, activeBusinesses: active, pendingBusinesses: pending,
    totalBookings: bookings, todaysBookings: todays, totalRevenue: revenue[0]?.total || 0,
  });
});

export const users = asyncHandler(async (req, res) => {
  const filter = req.query.role ? { role: req.query.role } : {};
  ok(res, { users: await User.find(filter).sort({ createdAt: -1 }).limit(300) });
});

export const setUserActive = (isActive) => asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot be blocked', 400);
  user.isActive = isActive;
  await user.save();
  ok(res, { user: user.toSafe() }, isActive ? 'User unblocked' : 'User blocked');
});

export const businesses = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  ok(res, { businesses: await Business.find(filter).sort({ createdAt: -1 }).limit(300).populate('ownerId', 'name email') });
});

export const setBusinessStatus = (status) => asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw new AppError('Business not found', 404);
  business.status = status;
  business.isVerified = status === 'ACTIVE';
  await business.save();
  await notify(business.ownerId, `Business ${status.toLowerCase()}`, `${business.name} is now ${status}.`);
  ok(res, { business }, `Business ${status.toLowerCase()}`);
});

export const bookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.bookingStatus = req.query.status;
  if (req.query.date) filter.bookingDate = req.query.date;
  ok(res, { bookings: await Booking.find(filter).sort({ createdAt: -1 }).limit(300).populate('businessId', 'name') });
});

export const reviews = asyncHandler(async (req, res) => {
  const filter = req.query.reported === 'true' ? { reported: true } : {};
  ok(res, { reviews: await Review.find(filter).sort({ createdAt: -1 }).limit(300).populate('customerId', 'name').populate('businessId', 'name') });
});

export const dismissReport = asyncHandler(async (req, res) => {
  await Review.updateOne({ _id: req.params.id }, { reported: false });
  ok(res, {}, 'Report dismissed');
});

export const refundsPending = asyncHandler(async (_req, res) => {
  ok(res, { payments: await Payment.find({ status: 'REFUND_REQUIRED' }).sort({ createdAt: -1 }) });
});

// Categories are fixed enums in V1; exposed read-only for the admin UI.
export const categories = (_req, res) => ok(res, {
  types: ['SALON', 'PARLOUR'], genderCategories: ['MALE_ONLY', 'FEMALE_ONLY', 'UNISEX'],
});
