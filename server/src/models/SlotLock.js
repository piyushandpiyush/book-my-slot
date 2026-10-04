import mongoose from 'mongoose';

// One document per 5-minute bucket of a business day. The unique `key` makes
// reserving a time range atomic without multi-document transactions
// (works on standalone MongoDB as well as replica sets).
const slotLockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // `${businessId}:${date}:${bucketStartMin}`
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

export const SlotLock = mongoose.model('SlotLock', slotLockSchema);
