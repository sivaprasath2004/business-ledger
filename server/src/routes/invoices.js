import { crudRouter } from '../utils/crud.js';
import { Invoice } from '../models/Invoice.js';

function recompute(data) {
  let sub = 0, tax = 0, disc = 0;
  for (const l of data.lines || []) {
    const lineGross = (l.qty || 0) * (l.rate || 0);
    const lineDisc = l.discount || 0;
    const lineNet = lineGross - lineDisc;
    const lineTax = (lineNet * (l.taxRate || 0)) / 100;
    l.amount = lineNet + lineTax;
    sub += lineGross; disc += lineDisc; tax += lineTax;
  }
  data.subtotal = sub;
  data.discountTotal = disc;
  data.taxTotal = tax;
  data.total = sub - disc + tax + (data.shipping || 0) + (data.adjustment || 0);
}

export default crudRouter({
  Model: Invoice,
  module: 'invoices',
  populate: ['contactId'],
  searchFields: ['number', 'notes'],
  beforeCreate: recompute,
  beforeUpdate: recompute,
});
//*** End Patch