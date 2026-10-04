import api, { unwrap } from './api.js';

export const authService = {
  google: (body) => unwrap(api.post('/auth/google', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  updateProfile: (body) => unwrap(api.put('/auth/me', body)),
  notifications: () => unwrap(api.get('/notifications')),
  readAll: () => unwrap(api.patch('/notifications/read-all')),
};
