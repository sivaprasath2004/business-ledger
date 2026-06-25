import mongoose from 'mongoose';
const { Schema } = mongoose;

const AccountSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    code: String,
    name: { type: String, required: true },
    type: { type: String, enum: ['asset', 'liability', 'equity', 'income', 'expense'], required: true },
    subType: String,
    parentId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Account = mongoose.model('Account', AccountSchema);
//*** End Patch