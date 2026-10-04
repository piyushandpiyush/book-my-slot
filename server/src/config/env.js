import dotenv from 'dotenv';
dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET || !process.env.MONGODB_URI)) {
  throw new Error('JWT_SECRET, JWT_REFRESH_SECRET and MONGODB_URI are required in production');
}

export const env = {
  isTest,
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@bookmyslot.com',
  // Business-local timezone offset in minutes (IST = +330)
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  tzOffsetMinutes: Number(process.env.TZ_OFFSET_MINUTES ?? 330),
  holdMinutes: Number(process.env.HOLD_MINUTES ?? 10),
  cancelCutoffHours: Number(process.env.CANCEL_CUTOFF_HOURS ?? 2),
};
