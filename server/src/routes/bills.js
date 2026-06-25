import { crudRouter } from '../utils/crud.js';
import { Bill } from '../models/Bill.js';

function recompute(data) {
  let sub = 0, tax = 0;
  for (const l of data.lines || []) {
    const net = (l.qty || 0) * (l.rate || 0);
    const t = (net * (l.taxRate || 0)) / 100;
    l.amount = net + t;
    sub += net; tax += t;
  }
  data.subtotal = sub;
  data.taxTotal = tax;
  data.total = sub + tax;
}

export default crudRouter({
  Model: Bill,
  module: 'bills',
  populate: ['vendorId'],
  searchFields: ['number', 'notes'],
  beforeCreate: recompute,
  beforeUpdate: recompute,
});
//*** End Patch