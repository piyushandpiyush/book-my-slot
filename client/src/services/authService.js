import api, { unwrap } from './api.js';

export const authService = {
  google: (body) => unwrap(api.post('/auth/google', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  // Access cookie lasts 1h; the refresh cookie lasts 30 days. If /me says 401, silently refresh once and use that user.
  me: async () => {
    try { return await unwrap(api.get('/auth/me')); } catch (e) {
      if (e?.response?.status !== 401) throw e;
      return unwrap(api.post('/auth/refresh'));
    }
  },
  updateProfile: (body) => unwrap(api.put('/auth/me', body)),
  notifications: () => unwrap(api.get('/notifications')),
  readAll: () => unwrap(api.patch('/notifications/read-all')),
};
