const TZ_OFFSET_MIN = 330; // business-local time (IST); keep in sync with the server

export function todayStr(offsetDays = 0) {
  const d = new Date(Date.now() + TZ_OFFSET_MIN * 60000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}
export const addDays = (dateStr, n) => new Date(Date.parse(`${dateStr}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
export function fmtDate(dateStr, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
}
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const GENDER_LABEL = { MALE_ONLY: 'Male only', FEMALE_ONLY: 'Female only', UNISEX: 'Unisex' };
export const TYPE_LABEL = { SALON: 'Salon', PARLOUR: 'Parlour' };
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function openingText(business, dateStr = todayStr()) {
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const d = business.workingHours?.find((x) => x.day === dow);
  return d?.isOpen ? `${fmtTime(d.open)} - ${fmtTime(d.close)}` : 'Closed today';
}

export const dayParts = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return {
    dow: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
    day: d.getUTCDate(),
    month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
  };
};
export const mapsLink = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name}, ${b.address}, ${b.city}`)}`;
