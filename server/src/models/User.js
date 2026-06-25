import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    name: String,
    avatarUrl: String,
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    active: { type: Boolean, default: true },
    locale: { type: String, default: 'en-US' },
    currency: { type: String, default: 'USD' },
    preferences: { type: Schema.Types.Mixed, default: {} },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export const User = mongoose.model('User', UserSchema);
//*** End Patch