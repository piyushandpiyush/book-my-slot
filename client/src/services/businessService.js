import api, { unwrap } from './api.js';

export const businessService = {
  list: (params) => unwrap(api.get('/businesses', { params })),
  get: (id) => unwrap(api.get(`/businesses/${id}`)),
  reviews: (id) => unwrap(api.get(`/businesses/${id}/reviews`)),
  availability: (id, params) => unwrap(api.get(`/businesses/${id}/availability`, { params })),
  mine: () => unwrap(api.get('/businesses/my')),
  create: (body) => unwrap(api.post('/businesses', body)),
  updateMine: (body) => unwrap(api.put('/businesses/my', body)),
  ownerStats: () => unwrap(api.get('/owner/stats')),
  ownerReviews: () => unwrap(api.get('/owner/reviews')),
  reportReview: (id) => unwrap(api.post(`/reviews/${id}/report`)),
};

export const serviceService = {
  list: (businessId, includeInactive = false) =>
    unwrap(api.get(`/businesses/${businessId}/services`, { params: includeInactive ? { includeInactive: true } : {} })),
  create: (body) => unwrap(api.post('/services', body)),
  update: (id, body) => unwrap(api.put(`/services/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/services/${id}`)),
};
