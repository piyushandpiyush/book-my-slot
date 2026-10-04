import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'NOT_SPECIFIED'], default: 'NOT_SPECIFIED' },
  role: { type: String, enum: ['CUSTOMER', 'OWNER', 'ADMIN'], default: 'CUSTOMER' },
  profileImage: String,
  googleId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.methods.toSafe = function () {
  const o = this.toObject();
  delete o.__v;
  return o;
};

export const User = mongoose.model('User', userSchema);
