import mongoose from 'mongoose';
const { Schema } = mongoose;

const BankAccountSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['bank', 'credit_card', 'cash', 'wallet'], default: 'bank' },
    bankName: String,
    accountNumber: String,
    ifsc: String,
    currency: { type: String, default: 'USD' },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const BankAccount = mongoose.model('BankAccount', BankAccountSchema);
//*** End Patch