import mongoose from 'mongoose';
const { Schema } = mongoose;

const BankTransactionSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true, index: true },
    date: { type: Date, required: true, index: true },
    description: String,
    reference: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: Number,
    category: String,
    matchedType: { type: String, enum: [null, 'invoice', 'bill', 'expense', 'journal'], default: null },
    matchedId: { type: Schema.Types.ObjectId, default: null },
    status: { type: String, enum: ['unmatched', 'matched', 'reconciled', 'ignored'], default: 'unmatched', index: true },
    importBatchId: String,
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const BankTransaction = mongoose.model('BankTransaction', BankTransactionSchema);
//*** End Patch