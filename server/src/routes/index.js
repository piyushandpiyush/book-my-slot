import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { authenticateUser, optionalAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from '../utils/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as biz from '../controllers/business.controller.js';
import * as service from '../controllers/service.controller.js';
import * as booking from '../controllers/booking.controller.js';
import * as review from '../controllers/review.controller.js';
import * as payment from '../controllers/payment.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as notif from '../controllers/notification.controller.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.isTest ? 10000 : 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

const r = Router();
const owner = [authenticateUser, requireRole('OWNER')];
const customer = [authenticateUser, requireRole('CUSTOMER')];
const adminOnly = [authenticateUser, requireRole('ADMIN')];

// ---- Auth
r.get('/auth/config', auth.authConfig);
r.post('/auth/google', authLimiter, validate(S.googleLoginSchema), auth.googleLogin);
r.post('/auth/logout', auth.logout);
r.post('/auth/refresh', auth.refresh);
r.get('/auth/me', authenticateUser, auth.me);
r.put('/auth/me', authenticateUser, validate(S.profileSchema), auth.updateMe);

// ---- Businesses
r.get('/businesses', validate(S.businessListQuery, 'query'), biz.listBusinesses);
r.post('/businesses', owner, validate(S.businessCreateSchema), biz.createBusiness);
r.get('/businesses/my', owner, biz.myBusiness);
r.put('/businesses/my', owner, validate(S.businessUpdateSchema), biz.updateMyBusiness);
r.get('/businesses/:id', optionalAuth, biz.getBusiness);
r.put('/businesses/:id', authenticateUser, requireRole('OWNER', 'ADMIN'), validate(S.businessUpdateSchema), biz.updateBusiness);
r.delete('/businesses/:id', authenticateUser, requireRole('OWNER', 'ADMIN'), biz.deleteBusiness);
r.get('/businesses/:businessId/services', optionalAuth, biz.listServices);
r.get('/businesses/:businessId/availability', validate(S.availabilityQuery, 'query'), biz.availability);
r.get('/businesses/:businessId/reviews', biz.businessReviews);

// ---- Services
r.post('/services', owner, validate(S.serviceSchema), service.createService);
r.put('/services/:id', owner, validate(S.serviceUpdateSchema), service.updateService);
r.delete('/services/:id', owner, service.deleteService);

// ---- Bookings (customer)
r.post('/bookings', customer, validate(S.bookingCreateSchema), booking.create);
r.get('/bookings/my', customer, booking.mine);
r.get('/bookings/:id', authenticateUser, booking.getOne);
r.patch('/bookings/:id/cancel', authenticateUser, requireRole('CUSTOMER', 'OWNER'), booking.cancel);
r.patch('/bookings/:id/reschedule', customer, validate(S.rescheduleSchema), booking.reschedule);

// ---- Owner
r.get('/owner/bookings', owner, booking.ownerList);
r.get('/owner/stats', owner, booking.ownerStats);
r.get('/owner/slots', owner, validate(S.availabilityQuery, 'query'), booking.ownerSlots);
r.post('/owner/bookings/walk-in', owner, validate(S.walkInSchema), booking.walkIn);
r.patch('/owner/bookings/:id/status', owner, validate(S.statusSchema), booking.ownerStatus);
r.get('/owner/reviews', owner, review.ownerReviews);

// ---- Reviews
r.post('/reviews', customer, validate(S.reviewCreateSchema), review.createReview);
r.put('/reviews/:id', customer, validate(S.reviewUpdateSchema), review.updateReview);
r.delete('/reviews/:id', authenticateUser, requireRole('CUSTOMER', 'ADMIN'), review.deleteReview);
r.post('/reviews/:id/report', owner, review.reportReview);

// ---- Payments (the webhook route is mounted separately in app.js with a raw body parser)
r.get('/payments/config', payment.config);
r.post('/payments/create-order', customer, validate(S.createOrderSchema), payment.createOrder);
r.post('/payments/verify', customer, validate(S.verifySchema), payment.verify);

// ---- Notifications
r.get('/notifications', authenticateUser, notif.list);
r.patch('/notifications/read-all', authenticateUser, notif.markAllRead);
r.patch('/notifications/:id/read', authenticateUser, notif.markRead);

// ---- Admin
r.get('/admin/stats', adminOnly, admin.stats);
r.get('/admin/users', adminOnly, admin.users);
r.patch('/admin/users/:id/block', adminOnly, admin.setUserActive(false));
r.patch('/admin/users/:id/unblock', adminOnly, admin.setUserActive(true));
r.get('/admin/businesses', adminOnly, admin.businesses);
r.patch('/admin/businesses/:id/approve', adminOnly, admin.setBusinessStatus('ACTIVE'));
r.patch('/admin/businesses/:id/reject', adminOnly, admin.setBusinessStatus('REJECTED'));
r.patch('/admin/businesses/:id/suspend', adminOnly, admin.setBusinessStatus('SUSPENDED'));
r.get('/admin/bookings', adminOnly, admin.bookings);
r.get('/admin/reviews', adminOnly, admin.reviews);
r.patch('/admin/reviews/:id/dismiss', adminOnly, admin.dismissReport);
r.get('/admin/refunds', adminOnly, admin.refundsPending);
r.get('/admin/categories', adminOnly, admin.categories);

export default r;
