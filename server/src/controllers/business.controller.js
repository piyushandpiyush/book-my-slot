import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { computeSlots, activeBookingsForDay, getAvailability } from '../services/availability.service.js';
import { expireStaleHolds } from '../services/booking.service.js';
import { nowLocal, toMinutes } from '../utils/time.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function refreshMinPrice(businessId) {
  const cheapest = await Service.findOne({ businessId, isActive: true }).sort({ price: 1 }).select('price');
  await Business.updateOne({ _id: businessId }, { minPrice: cheapest?.price ?? 0 });
}

export const createBusiness = asyncHandler(async (req, res) => {
  if (await Business.exists({ ownerId: req.user._id })) throw new AppError('You already have a registered business', 409);
  const business = await Business.create({
    ...req.body, ownerId: req.user._id, ownerName: req.body.ownerName || req.user.name,
    phone: req.body.phone || req.user.phone, email: req.body.email || req.user.email, status: 'PENDING',
  });
  ok(res, { business }, 'Business submitted for admin approval', 201);
});

export const myBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ ownerId: req.user._id });
  if (!business) throw new AppError('You have not registered a business yet', 404);
  ok(res, { business });
});

export const updateMyBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ ownerId: req.user._id });
  if (!business) throw new AppError('You have not registered a business yet', 404);
  Object.assign(business, req.body);
  await business.save();
  ok(res, { business }, 'Business updated');
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw new AppError('Business not found', 404);
  if (req.user.role !== 'ADMIN' && String(business.ownerId) !== String(req.user._id)) {
    throw new AppError('You can only modify your own business', 403);
  }
  Object.assign(business, req.body);
  await business.save();
  ok(res, { business }, 'Business updated');
});

export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw new AppError('Business not found', 404);
  if (req.user.role !== 'ADMIN' && String(business.ownerId) !== String(req.user._id)) {
    throw new AppError('You can only delete your own business', 403);
  }
  const today = nowLocal().date;
  if (await Booking.exists({ businessId: business._id, bookingDate: { $gte: today }, bookingStatus: { $in: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE'] } })) {
    throw new AppError('Cannot delete a business with upcoming bookings. Cancel them first.', 400);
  }
  await Service.deleteMany({ businessId: business._id });
  await business.deleteOne();
  ok(res, {}, 'Business deleted');
});

export const getBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  const isPrivileged = req.user && (req.user.role === 'ADMIN' || String(business?.ownerId) === String(req.user._id));
  if (!business || (business.status !== 'ACTIVE' && !isPrivileged)) throw new AppError('Business not found', 404);
  const services = await Service.find({ businessId: business._id, isActive: true }).sort({ price: 1 });
  ok(res, { business, services });
});

// Earliest/remaining free slots for the business's shortest service on a date (drives "Available today" badges).
async function dayInfo(b, date) {
  await expireStaleHolds(b._id);
  const shortest = await Service.findOne({ businessId: b._id, isActive: true }).sort({ duration: 1 });
  if (!shortest) return { nextSlot: null, slotsLeft: 0, free: [] };
  const free = computeSlots(b, shortest, date, await activeBookingsForDay(b._id, date)).filter((s) => s.available);
  return { nextSlot: free[0]?.startTime ?? null, slotsLeft: free.length, free };
}

const withInfo = (b, info) => ({ ...b.toObject(), nextSlot: info.nextSlot, slotsLeft: info.slotsLeft });

export const listBusinesses = asyncHandler(async (req, res) => {
  const { q, city, type, gender, minRating, minPrice, maxPrice, availableToday, availableNow, sort, page, limit } = req.validQuery;
  const local = nowLocal();
  const date = req.validQuery.date || local.date;
  const filter = { status: 'ACTIVE' };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { address: rx }, { city: rx }];
  }
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (type) filter.type = type;
  if (gender) filter.genderCategory = gender;
  if (minRating) filter.rating = { $gte: minRating };
  if (minPrice !== undefined || maxPrice !== undefined) {
    const price = {};
    if (minPrice !== undefined) price.$gte = minPrice;
    if (maxPrice !== undefined) price.$lte = maxPrice;
    filter._id = { $in: await Service.distinct('businessId', { isActive: true, price }) };
  }
  const dbSort = sort === 'rating' ? { rating: -1, totalReviews: -1 }
    : sort === 'price' ? { minPrice: 1, rating: -1 } : { rating: -1, totalReviews: -1 };

  let businesses; let total;
  if (availableToday || availableNow || sort === 'earliest') {
    const candidates = await Business.find(filter).sort(dbSort).limit(100);
    const rows = [];
    for (const b of candidates) {
      const info = await dayInfo(b, date);
      if ((availableToday || availableNow) && !info.free.length) continue;
      if (availableNow && !(date === local.date && info.free.some((s) => toMinutes(s.startTime) <= local.minutes + 60))) continue;
      rows.push({ b, info });
    }
    if (sort === 'earliest') rows.sort((x, y) => (x.info.nextSlot ?? '99:99').localeCompare(y.info.nextSlot ?? '99:99'));
    total = rows.length;
    businesses = rows.slice((page - 1) * limit, page * limit).map((r) => withInfo(r.b, r.info));
  } else {
    total = await Business.countDocuments(filter);
    const found = await Business.find(filter).sort(dbSort).skip((page - 1) * limit).limit(limit);
    businesses = await Promise.all(found.map(async (b) => withInfo(b, await dayInfo(b, date))));
  }
  ok(res, { businesses, total, page, pages: Math.ceil(total / limit), date });
});

export const listServices = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) throw new AppError('Business not found', 404);
  const isOwner = req.user && String(business.ownerId) === String(req.user._id);
  if (business.status !== 'ACTIVE' && !isOwner && req.user?.role !== 'ADMIN') throw new AppError('Business not found', 404);
  const filter = { businessId: business._id, ...(!(isOwner && req.query.includeInactive === 'true') && { isActive: true }) };
  ok(res, { services: await Service.find(filter).sort({ createdAt: 1 }) });
});

export const availability = asyncHandler(async (req, res) => {
  const { date, serviceId } = req.validQuery;
  const business = await Business.findById(req.params.businessId);
  if (!business || business.status !== 'ACTIVE') throw new AppError('Business not found', 404);
  const service = await Service.findOne({ _id: serviceId, businessId: business._id, isActive: true });
  if (!service) throw new AppError('Service not found', 404);
  await expireStaleHolds(business._id);
  const slots = await getAvailability(business, service, date);
  ok(res, { date, serviceId, duration: service.duration, slots });
});

export const businessReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ businessId: req.params.businessId }).sort({ createdAt: -1 }).limit(100).populate('customerId', 'name');
  ok(res, { reviews });
});
