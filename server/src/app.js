import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { webhook } from './controllers/payment.controller.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy); // 1 behind Render; 2 when Vercel proxies /api in front of Render
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com', 'https://accounts.google.com'],
        frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com', 'https://accounts.google.com'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://lumberjack.razorpay.com', 'https://accounts.google.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: env.isTest ? 100000 : 300, standardHeaders: true, legacyHeaders: false }));

  // Razorpay webhook needs the raw body for signature verification -> before express.json()
  app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), webhook);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.get('/api/health', (_req, res) => res.json({ success: true, message: 'ok' }));
  app.use('/api', routes);
  // Serve the built React app (npm run build in /client) from the same origin in production
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (!env.isTest && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
