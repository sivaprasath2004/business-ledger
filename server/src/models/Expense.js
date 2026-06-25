import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExpenseSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    date: { type: Date, default: Date.now },
    category: String,
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    description: String,
    amount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    paidVia: String,
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    billable: { type: Boolean, default: false },
    customerId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    projectId: String,
    receiptUrl: String,
    notes: String,
  },
  { timestamps: true },
);

export const Expense = mongoose.model('Expense', ExpenseSchema);
//*** End Patch