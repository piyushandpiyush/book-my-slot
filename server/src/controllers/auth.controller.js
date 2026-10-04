import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { clearAuthCookies, setAuthCookies } from '../middleware/auth.js';

// Swappable so tests can stub Google without network access.
export const googleVerifier = {
  client: null,
  async verify(credential) {
    if (!env.googleClientId) throw new AppError('Google sign-in is not configured on the server', 503);
    this.client ||= new OAuth2Client(env.googleClientId);
    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
      return ticket.getPayload();
    } catch {
      throw new AppError('Invalid Google sign-in. Please try again.', 401);
    }
  },
};

export const authConfig = (_req, res) => ok(res, { googleClientId: env.googleClientId || null });

export const googleLogin = asyncHandler(async (req, res) => {
  const p = await googleVerifier.verify(req.body.credential);
  if (!p?.email || !p.email_verified) throw new AppError('Your Google email is not verified', 401);
  const email = p.email.toLowerCase();

  let user = await User.findOne({ email });
  let created = false;
  if (user) {
    if (!user.isActive) throw new AppError('This account has been blocked', 403);
    // Existing account (even password-based) is linked: Google has verified ownership of the email
    if (user.googleId && user.googleId !== p.sub) throw new AppError('This email is linked to a different Google account', 409);
    if (!user.googleId) user.googleId = p.sub;
    if (!user.profileImage && p.picture) user.profileImage = p.picture;
    await user.save();
  } else {
    user = await User.create({
      name: (p.name || email.split('@')[0]).slice(0, 80), email, role: req.body.role,
      googleId: p.sub, profileImage: p.picture,
    });
    created = true;
  }
  setAuthCookies(res, user);
  ok(res, { user: user.toSafe(), created }, created ? 'Account created with Google' : 'Logged in with Google', created ? 201 : 200);
});

export const logout = (_req, res) => {
  clearAuthCookies(res);
  ok(res, {}, 'Logged out');
};

export const refresh = asyncHandler(async (req, res) => {
  try {
    const payload = jwt.verify(req.cookies?.refresh || '', env.jwtRefreshSecret);
    if (payload.t !== 'refresh') throw new Error('bad token type');
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) throw new Error('inactive');
    setAuthCookies(res, user);
    ok(res, { user: user.toSafe() }, 'Token refreshed');
  } catch {
    clearAuthCookies(res);
    throw new AppError('Session expired. Please log in again.', 401);
  }
});

export const me = (req, res) => ok(res, { user: req.user.toSafe() });

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  ok(res, { user: req.user.toSafe() }, 'Profile updated');
});
