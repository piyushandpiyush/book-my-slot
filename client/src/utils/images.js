// Curated cinematic stock photography (Unsplash). Every consumer also has a CSS gradient behind it,
// so the UI still looks intentional when offline.
const u = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMG = {
  hero: u('1600948836101-f9ffda59d250', 1600),
  salon: u('1503951914875-452162b0f3f1', 900),
  parlour: u('1487412947147-5cebf100ffc2', 900),
  auth: u('1521590832167-7bcbfaa6381f', 1200),
};

const SALON = ['1600948836101-f9ffda59d250', '1633681926022-84c23e8cb2d6', '1605497788044-5a32c7078486', '1503951914875-452162b0f3f1'];
const PARLOUR = ['1487412947147-5cebf100ffc2', '1521590832167-7bcbfaa6381f', '1562322140-8baeececf3df', '1519415943484-9fa1873496d4'];
const hash = (s = '') => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Business's own photos first, then a deterministic stock set by type so cards don't all look the same.
export function businessImages(b, w = 900) {
  const own = (b.images || []).filter(Boolean);
  const pool = b.type === 'PARLOUR' ? PARLOUR : SALON;
  const start = hash(b._id || b.name);
  const fill = Array.from({ length: 4 }, (_, i) => u(pool[(start + i) % pool.length], w));
  return [...own, ...fill].slice(0, Math.max(own.length, 4));
}
export const coverImage = (b) => businessImages(b, 700)[0];
