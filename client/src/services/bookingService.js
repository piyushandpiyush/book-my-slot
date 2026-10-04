import api, { unwrap } from './api.js';

export const bookingService = {
  create: (body) => unwrap(api.post('/bookings', body)),
  mine: () => unwrap(api.get('/bookings/my')),
  cancel: (id) => unwrap(api.patch(`/bookings/${id}/cancel`)),
  reschedule: (id, body) => unwrap(api.patch(`/bookings/${id}/reschedule`, body)),
  review: (body) => unwrap(api.post('/reviews', body)),
  // owner
  ownerList: (params) => unwrap(api.get('/owner/bookings', { params })),
  ownerSlots: (params) => unwrap(api.get('/owner/slots', { params })),
  walkIn: (body) => unwrap(api.post('/owner/bookings/walk-in', body)),
  setStatus: (id, status) => unwrap(api.patch(`/owner/bookings/${id}/status`, { status })),
};

export const paymentService = {
  config: () => unwrap(api.get('/payments/config')),
  createOrder: (bookingId) => unwrap(api.post('/payments/create-order', { bookingId })),
  verify: (body) => unwrap(api.post('/payments/verify', body)),
};

export const adminService = {
  stats: () => unwrap(api.get('/admin/stats')),
  users: () => unwrap(api.get('/admin/users')),
  setUserBlocked: (id, blocked) => unwrap(api.patch(`/admin/users/${id}/${blocked ? 'block' : 'unblock'}`)),
  businesses: (status) => unwrap(api.get('/admin/businesses', { params: status ? { status } : {} })),
  setBusiness: (id, action) => unwrap(api.patch(`/admin/businesses/${id}/${action}`)),
  bookings: () => unwrap(api.get('/admin/bookings')),
  reviews: (reported) => unwrap(api.get('/admin/reviews', { params: reported ? { reported: true } : {} })),
  deleteReview: (id) => unwrap(api.delete(`/reviews/${id}`)),
  dismissReport: (id) => unwrap(api.patch(`/admin/reviews/${id}/dismiss`)),
  refunds: () => unwrap(api.get('/admin/refunds')),
};
