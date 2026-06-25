import mongoose from 'mongoose';
const { Schema } = mongoose;

///**
//  * permissions shape:
//  * {
//  *   contacts: { view: 'all'|'own'|false, create, edit, delete, export, import },
//  *   items: {...}, invoices: {...}, bills: {...}, expenses: {...},
//  *   bank: {...}, accounts: {...}, reports: {...}, settings: {...}, excel: {...}, users: {...}
//  * }
//  */
const RoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    builtin: { type: Boolean, default: false },
    permissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const Role = mongoose.model('Role', RoleSchema);
//*** End Patch