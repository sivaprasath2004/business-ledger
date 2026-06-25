import mongoose from 'mongoose';
const { Schema } = mongoose;

const AddressSchema = new Schema(
  { label: String, line1: String, line2: String, city: String, state: String, zip: String, country: String },
  { _id: false },
);

const ContactPersonSchema = new Schema(
  { name: String, role: String, email: String, phone: String },
  { _id: false },
);

const ContactSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['customer', 'vendor', 'both'], default: 'customer', index: true },
    // Business container (optional but rich)
    businessName: String,
    displayName: { type: String, required: true, index: true },
    salutation: String,
    firstName: String,
    lastName: String,
    taxNumber: String,
    taxTreatment: { type: String, default: 'unregistered' },
    email: { type: String, index: true },
    ccEmails: [String],
    phone: String,
    mobile: String,
    workPhone: String,
    website: String,
    currency: { type: String, default: 'USD' },
    paymentTerms: { type: String, default: 'Net 30' },
    creditLimit: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    portalAccess: { type: Boolean, default: false },
    addresses: [AddressSchema],
    contactPersons: [ContactPersonSchema],
    tags: [String],
    notes: String,
    customFields: { type: Schema.Types.Mixed, default: {} },
    attachments: [{ name: String, url: String, size: Number, mime: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ContactSchema.index({ displayName: 'text', businessName: 'text', email: 'text' });

export const Contact = mongoose.model('Contact', ContactSchema);
//*** End Patch