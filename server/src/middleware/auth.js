import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: env.isProd ? 'none' : 'lax',
  secure: env.isProd,
};

export const signAccess = (user) =>
  jwt.sign({ id: user._id, role: user.role, t: 'access' }, env.jwtSecret, { expiresIn: '1h' });
export const signRefresh = (user) =>
  jwt.sign({ id: user._id, t: 'refresh' }, env.jwtRefreshSecret, { expiresIn: '7d' });

export function setAuthCookies(res, user) {
  res.cookie('token', signAccess(user), { ...COOKIE_OPTS, maxAge: 60 * 60 * 1000 });
  res.cookie('refresh', signRefresh(user), { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
export function clearAuthCookies(res) {
  res.clearCookie('token', COOKIE_OPTS);
  res.clearCookie('refresh', COOKIE_OPTS);
}

export async function userFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.t !== 'access') return null;
    const user = await User.findById(payload.id);
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
}

export const authenticateUser = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.token || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  const user = await userFromToken(token);
  if (!user) throw new AppError('Authentication required', 401);
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

// Attaches req.user when a valid token is present, but never rejects
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  req.user = await userFromToken(req.cookies?.token || (header?.startsWith('Bearer ') ? header.slice(7) : null));
  next();
});
