import { Booking } from '../models/Booking.js';
import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Review } from '../models/Review.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { nowLocal } from '../utils/time.js';
import * as svc from '../services/booking.service.js';
import { activeBookingsForDay, computeSlots } from '../services/availability.service.js';

const ownBusiness = async (user) => {
  const business = await Business.findOne({ ownerId: user._id });
  if (!business) throw new AppError('Register your business first', 400);
  return business;
};

export const create = asyncHandler(async (req, res) => {
  const booking = await svc.createOnlineBooking(req.user, req.body);
  const msg = booking.bookingStatus === 'PENDING' ? 'Slot held. Complete payment to confirm.' : 'Booking confirmed';
  ok(res, { booking }, msg, 201);
});

export const mine = asyncHandler(async (req, res) => {
  await svc.expireStaleHolds();
  const bookings = await Booking.find({ customerId: req.user._id }).sort({ bookingDate: -1, startMin: -1 })
    .populate('businessId', 'name type genderCategory address city');
  const reviewed = new Set((await Review.find({ customerId: req.user._id }).select('bookingId')).map((r) => String(r.bookingId)));
  const local = nowLocal();
  const out = bookings.map((b) => {
    const o = b.toObject();
    o.reviewed = reviewed.has(String(b._id));
    o.group = ['CANCELLED', 'NO_SHOW'].includes(b.bookingStatus) ? 'cancelled'
      : (b.bookingStatus === 'COMPLETED' || b.bookingDate < local.date) ? 'past' : 'upcoming';
    return o;
  });
  ok(res, { bookings: out });
});

async function loadReadable(req) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  const business = await Business.findById(booking.businessId).select('ownerId name');
  const isCustomer = String(booking.customerId) === String(req.user._id);
  const isOwner = String(business?.ownerId) === String(req.user._id);
  if (!isCustomer && !isOwner && req.user.role !== 'ADMIN') throw new AppError('Booking not found', 404);
  return { booking, business, isCustomer, isOwner };
}

export const getOne = asyncHandler(async (req, res) => {
  const { booking } = await loadReadable(req);
  const business = await Business.findById(booking.businessId).select('name type genderCategory address city phone');
  const o = booking.toObject();
  o.business = business;
  o.reviewed = !!(await Review.exists({ bookingId: booking._id }));
  ok(res, { booking: o });
});

export const cancel = asyncHandler(async (req, res) => {
  const { booking, isCustomer, isOwner } = await loadReadable(req);
  if (!isCustomer && !isOwner) throw new AppError('Not allowed', 403);
  const updated = await svc.cancelBooking(booking, { role: isOwner ? 'OWNER' : 'CUSTOMER', id: req.user._id });
  ok(res, { booking: updated }, 'Booking cancelled');
});

export const reschedule = asyncHandler(async (req, res) => {
  const { booking, isCustomer } = await loadReadable(req);
  if (!isCustomer) throw new AppError('Only the customer can reschedule', 403);
  const updated = await svc.rescheduleBooking(booking, req.user, req.body);
  ok(res, { booking: updated }, 'Booking rescheduled');
});

// ---------------- Owner ----------------

export const ownerList = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  await svc.expireStaleHolds(business._id);
  const { date, status, from, to } = req.query;
  const filter = { businessId: business._id };
  if (date) filter.bookingDate = date;
  else if (from || to) filter.bookingDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (status) filter.bookingStatus = status;
  const bookings = await Booking.find(filter).sort({ bookingDate: 1, startMin: 1 }).limit(500);
  ok(res, { bookings });
});

export const ownerSlots = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  const { date, serviceId } = req.validQuery;
  const service = await Service.findOne({ _id: serviceId, businessId: business._id, isActive: true });
  if (!service) throw new AppError('Service not found', 404);
  await svc.expireStaleHolds(business._id);
  const slots = computeSlots(business, service, date, await activeBookingsForDay(business._id, date), { walkIn: true });
  ok(res, { date, slots });
});

export const walkIn = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  const booking = await svc.createWalkIn(req.user, business, req.body);
  ok(res, { booking }, 'Walk-in booking confirmed', 201);
});

export const ownerStatus = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  const booking = await Booking.findOne({ _id: req.params.id, businessId: business._id });
  if (!booking) throw new AppError('Booking not found', 404);
  const updated = await svc.changeStatus(booking, { role: 'OWNER', id: req.user._id }, req.body.status);
  ok(res, { booking: updated }, `Booking marked ${req.body.status}`);
});

export const ownerStats = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  await svc.expireStaleHolds(business._id);
  const today = nowLocal().date;
  const todays = await Booking.find({ businessId: business._id, bookingDate: today });
  const count = (...s) => todays.filter((b) => s.includes(b.bookingStatus)).length;
  const customers = await Booking.aggregate([
    { $match: { businessId: business._id, bookingStatus: { $nin: ['CANCELLED'] } } },
    { $group: { _id: { $ifNull: ['$customerId', '$customerPhone'] } } },
    { $count: 'n' },
  ]);
  ok(res, {
    todaysBookings: todays.filter((b) => b.bookingStatus !== 'CANCELLED').length,
    completed: count('COMPLETED'),
    upcoming: count('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE'),
    cancelled: count('CANCELLED', 'NO_SHOW'),
    walkIns: todays.filter((b) => b.bookingSource === 'WALK_IN' && b.bookingStatus !== 'CANCELLED').length,
    todaysRevenue: todays.filter((b) => b.bookingStatus === 'COMPLETED').reduce((s, b) => s + b.amount, 0),
    totalCustomers: customers[0]?.n || 0,
    averageRating: business.rating,
    totalReviews: business.totalReviews,
    date: today,
  });
});
