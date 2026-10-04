# Book My Slot

**Live:** https://book-my-slot-t0q7.onrender.com

Online appointment booking for **Salons** and **Parlours** (Unisex / Male-only / Female-only), with online + walk-in bookings sharing one availability system. MERN stack + Socket.IO. **Sign-in is Google-only** (no passwords are stored).

## Quick start

```bash
npm run install:all
npm run dev:server      # API on http://localhost:5000
npm run dev:client      # App on http://localhost:5173  (proxies /api and /socket.io)
```

Configuration lives in `server/.env` (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas / local URI. **Empty = in-memory DB with demo data** (lost on restart) |
| `GOOGLE_CLIENT_ID` | OAuth *Web* client ID (Google Cloud Console). Authorized JS origins must include `http://localhost:5173` (and `:5000` for the built app) |
| `ADMIN_EMAIL` | The Google account that becomes the platform admin (created on first start) |
| `RAZORPAY_KEY_ID/SECRET` | Test/live keys. **Empty = mock payments** (dev only) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Session signing secrets |

### How accounts work
- Everyone signs in with Google. First sign-in creates the account: customers by default, or "Business owner" via the dropdown on the sign-in page.
- The admin is whoever signs in with `ADMIN_EMAIL`. Roles can never be changed through the API, and `ADMIN` cannot be requested.
- The backend verifies the Google ID token (audience + verified email) before issuing an HTTP-only session cookie.
- Demo salons/parlours seeded into an empty in-memory DB are browse-only (their owner accounts have no Google login).

Production: `npm run build`, then `npm start` — the API serves the built client from the same origin. Set strong secrets, `MONGODB_URI`, `CLIENT_URL`, and add your production origin to the Google client.

## UI

Dark premium design system in plain CSS (`client/src/index.css`: tokens, buttons, cards, slots, drawers, skeletons) with an outline icon set (`components/Icon.jsx`). Customer site has a top nav + mobile bottom nav; owners and admins get a separate sidebar shell (scrollable tabs on mobile). Photos are hot-linked Unsplash stock with gradient fallbacks (`utils/images.js`).

## Key design decisions

- **No separate slots collection.** Slots are computed from working hours + break + service duration + existing bookings.
- **Atomic double-booking protection without transactions.** Each booking reserves 5-minute buckets in `SlotLock` with a unique key
  (`business:date:minute`). Two concurrent requests can never own the same bucket, so it works on standalone MongoDB too.
  Stale locks self-heal. Reschedule re-acquires idempotently and never loses the old slot if the new one is taken.
- **One `Booking` model** for `ONLINE` and `WALK_IN`; walk-ins start as `ARRIVED`.
- **Payments:** unpaid online bookings hold the slot for 10 min (`HOLD_MINUTES`). Confirmation happens only after backend
  HMAC verification (`/payments/verify`) or the signed webhook. If payment arrives after the hold expired, the slot is re-taken if
  free, otherwise the payment is refunded (mock) / flagged `REFUND_REQUIRED` for admin (real Razorpay).
- Backend enforces gender eligibility, role/ownership checks, past-time and working-hours rules. Times are business-local (`TZ_OFFSET_MINUTES`, default IST +330).
- HTTP-only cookie JWT (1h access + 7d refresh), Helmet, CORS, rate limiting, zod validation.

## V1 notes / not included
- Images are accepted as URLs (Cloudinary upload not wired). Email/SMS notifications not included (in-app only, with live push).
- Real Razorpay refunds are not automated; they appear in Admin → Dashboard as pending refunds.
- Admin "categories" are the fixed enums (read-only). `GOOGLE_CLIENT_SECRET` is not needed by the ID-token flow.
