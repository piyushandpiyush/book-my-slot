import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  duration: {
    type: Number, required: true, min: 5, max: 480,
    validate: { validator: (v) => v % 5 === 0, message: 'Duration must be a multiple of 5 minutes' },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Service = mongoose.model('Service', serviceSchema);
