import { env } from '../config/env.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// "Now" expressed in business-local wall-clock time.
export function nowLocal(now = new Date()) {
  const shifted = new Date(now.getTime() + env.tzOffsetMinutes * 60000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

export const dayOfWeek = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0 = Sunday

// Absolute instant for a local date + HH:mm
export function toInstant(dateStr, hhmm) {
  return new Date(new Date(`${dateStr}T${hhmm}:00Z`).getTime() - env.tzOffsetMinutes * 60000);
}

export const isValidDate = (s) => DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
