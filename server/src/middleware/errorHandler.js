import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return res.status(400).json({ success: false, message, errors: err.issues });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate value: record already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  const status = err.status || 500;
  if (status >= 500 && !env.isTest) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProd ? 'Internal server error' : err.message,
    ...(err.extra || {}),
  });
}
