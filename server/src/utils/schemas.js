import { z } from 'zod';
import { isValidDate, TIME_RE, toMinutes } from './time.js';

const phone = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.string().refine(isValidDate, 'Date must be YYYY-MM-DD');
const time = z.string().regex(TIME_RE, 'Time must be HH:mm');
const gender = z.enum(['MALE', 'FEMALE', 'NOT_SPECIFIED']);

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.optional(),
  gender: gender.optional(),
  profileImage: z.string().url().optional(),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(20).max(4096),
  role: z.enum(['CUSTOMER', 'OWNER']).default('CUSTOMER'), // only used when a new account is created
});

const hoursDay = z.object({
  day: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  open: time,
  close: time,
}).refine((d) => !d.isOpen || toMinutes(d.open) < toMinutes(d.close), 'Opening time must be before closing time');

const workingHours = z.array(hoursDay).length(7)
  .refine((a) => new Set(a.map((d) => d.day)).size === 7, 'Provide each weekday exactly once');
const breakHours = z.array(z.object({ start: time, end: time })
  .refine((b) => toMinutes(b.start) < toMinutes(b.end), 'Break start must be before end')).max(5);

const businessFields = {
  name: z.string().trim().min(2).max(120),
  type: z.enum(['SALON', 'PARLOUR']),
  genderCategory: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'UNISEX']),
  ownerName: z.string().trim().max(80).optional(),
  description: z.string().max(2000).optional(),
  phone: phone.optional(),
  email: z.string().email().optional(),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  workingHours: workingHours.optional(),
  breakHours: breakHours.optional(),
  slotInterval: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  requireOnlinePayment: z.boolean().optional(),
};
export const businessCreateSchema = z.object(businessFields);
export const businessUpdateSchema = z.object(businessFields).partial();

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(100000),
  duration: z.number().int().min(5).max(480).refine((v) => v % 5 === 0, 'Duration must be a multiple of 5'),
  isActive: z.boolean().optional(),
});
export const serviceUpdateSchema = serviceSchema.partial();

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
export const businessListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  type: z.enum(['SALON', 'PARLOUR']).optional(),
  gender: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'UNISEX']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availableToday: bool.optional(),
  availableNow: bool.optional(),
  sort: z.enum(['recommended', 'rating', 'price', 'earliest']).default('recommended'),
  date: date.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const availabilityQuery = z.object({ date, serviceId: objectId });

export const bookingCreateSchema = z.object({
  businessId: objectId, serviceId: objectId, bookingDate: date, startTime: time,
  notes: z.string().max(300).optional(),
});
export const rescheduleSchema = z.object({ bookingDate: date, startTime: time });

export const walkInSchema = z.object({
  customerName: z.string().trim().min(1).max(80),
  customerPhone: phone.optional(),
  customerGender: z.enum(['MALE', 'FEMALE']),
  serviceId: objectId, bookingDate: date, startTime: time,
  notes: z.string().max(300).optional(),
});

export const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

export const reviewCreateSchema = z.object({
  bookingId: objectId, rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional(),
});
export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(), comment: z.string().trim().max(1000).optional(),
});

export const createOrderSchema = z.object({ bookingId: objectId });
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().min(1),
});

export { objectId };
