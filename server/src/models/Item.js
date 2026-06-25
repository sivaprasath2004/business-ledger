import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserAssignmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    purchasedQty: { type: Number, default: 0 },
    soldQty: { type: Number, default: 0 },
    valueIn: { type: Number, default: 0 },
    valueOut: { type: Number, default: 0 },
  },
  { _id: false },
);

const ItemSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['goods', 'service', 'digital'], default: 'goods' },
    sku: { type: String, index: true },
    name: { type: String, required: true, index: true },
    unit: { type: String, default: 'pcs' },
    hsnSac: String,
    sellingPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxInclusive: { type: Boolean, default: false },
    description: String,
    images: [String],
    // inventory
    trackInventory: { type: Boolean, default: false },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    // per-user assignment
    assignments: [UserAssignmentSchema],
    tags: [String],
    customFields: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ItemSchema.index({ name: 'text', sku: 'text', description: 'text' });

export const Item = mongoose.model('Item', ItemSchema);
//*** End Patch