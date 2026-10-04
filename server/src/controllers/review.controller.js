import { Review } from '../models/Review.js';
import { Booking } from '../models/Booking.js';
import { Business } from '../models/Business.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';

async function recalcRating(businessId) {
  const [agg] = await Review.aggregate([
    { $match: { businessId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Business.updateOne({ _id: businessId }, {
    rating: agg ? Math.round(agg.avg * 10) / 10 : 0, totalReviews: agg?.n || 0,
  });
}

export const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(req.user._id)) throw new AppError('Booking not found', 404);
  if (booking.bookingStatus !== 'COMPLETED') throw new AppError('You can review only completed services.', 400);
  if (await Review.exists({ bookingId })) throw new AppError('You have already reviewed this booking.', 409);
  const review = await Review.create({ customerId: req.user._id, businessId: booking.businessId, bookingId, rating, comment });
  await recalcRating(booking.businessId);
  ok(res, { review }, 'Thanks for your review', 201);
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || String(review.customerId) !== String(req.user._id)) throw new AppError('Review not found', 404);
  Object.assign(review, req.body);
  await review.save();
  await recalcRating(review.businessId);
  ok(res, { review }, 'Review updated');
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (req.user.role !== 'ADMIN' && String(review.customerId) !== String(req.user._id)) throw new AppError('Review not found', 404);
  await review.deleteOne();
  await recalcRating(review.businessId);
  ok(res, {}, 'Review deleted');
});

export const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  const business = await Business.findOne({ _id: review.businessId, ownerId: req.user._id });
  if (!business) throw new AppError('You can only report reviews of your own business', 403);
  review.reported = true;
  await review.save();
  ok(res, {}, 'Review reported to admin');
});

export const ownerReviews = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ ownerId: req.user._id });
  if (!business) throw new AppError('Register your business first', 400);
  const reviews = await Review.find({ businessId: business._id }).sort({ createdAt: -1 }).populate('customerId', 'name');
  ok(res, { reviews });
});
