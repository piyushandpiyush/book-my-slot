import mongoose from 'mongoose';

const daySchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
  isOpen: { type: Boolean, default: true },
  open: { type: String, default: '10:00' },
  close: { type: String, default: '20:00' },
}, { _id: false });

const breakSchema = new mongoose.Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
}, { _id: false });

export const defaultWorkingHours = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, isOpen: true, open: '10:00', close: '20:00' }));

const businessSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['SALON', 'PARLOUR'], required: true },
  genderCategory: { type: String, enum: ['MALE_ONLY', 'FEMALE_ONLY', 'UNISEX'], required: true },
  ownerName: String,
  description: { type: String, maxlength: 2000 },
  phone: String,
  email: String,
  address: { type: String, required: true },
  city: { type: String, required: true, trim: true },
  latitude: Number,
  longitude: Number,
  images: [String],
  workingHours: { type: [daySchema], default: defaultWorkingHours },
  breakHours: { type: [breakSchema], default: [] },
  slotInterval: { type: Number, enum: [15, 30, 60], default: 30 },
  requireOnlinePayment: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  minPrice: { type: Number, default: 0 },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'], default: 'PENDING' },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

businessSchema.index({ name: 'text', address: 'text', city: 'text' });
businessSchema.index({ status: 1, type: 1, genderCategory: 1, city: 1 });

export const Business = mongoose.model('Business', businessSchema);
