import mongoose from 'mongoose';
const { Schema } = mongoose;

const LineSchema = new Schema(
  { itemId: { type: Schema.Types.ObjectId, ref: 'Item' }, accountId: { type: Schema.Types.ObjectId, ref: 'Account' }, description: String, qty: { type: Number, default: 1 }, rate: { type: Number, default: 0 }, taxRate: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
  { _id: false },
);

const BillSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    number: { type: String, required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: Date,
    currency: { type: String, default: 'USD' },
    lines: [LineSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'open', 'partial', 'paid', 'overdue'], default: 'open' },
    notes: String,
    attachments: [{ name: String, url: String }],
  },
  { timestamps: true },
);

export const Bill = mongoose.model('Bill', BillSchema);
//*** End Patch