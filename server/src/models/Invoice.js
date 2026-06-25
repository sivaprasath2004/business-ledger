import mongoose from 'mongoose';
const { Schema } = mongoose;

const LineSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
    description: String,
    qty: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    number: { type: String, required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: Date,
    currency: { type: String, default: 'USD' },
    lines: [LineSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'], default: 'draft' },
    notes: String,
    terms: String,
    recurring: { type: Schema.Types.Mixed, default: null },
    payments: [{ date: Date, amount: Number, method: String, reference: String }],
    attachments: [{ name: String, url: String }],
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
//*** End Patch