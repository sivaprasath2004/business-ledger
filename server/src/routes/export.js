import { Router } from 'express';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import { rowsToWorkbookBuffer } from '../services/excel.js';
import { Contact } from '../models/Contact.js';
import { Item } from '../models/Item.js';
import { Invoice } from '../models/Invoice.js';
import { Bill } from '../models/Bill.js';
import { Expense } from '../models/Expense.js';
import { BankTransaction } from '../models/BankTransaction.js';

const MAP = { contacts: Contact, items: Item, invoices: Invoice, bills: Bill, expenses: Expense, 'bank-transactions': BankTransaction };
const MODULE_OF = { contacts: 'contacts', items: 'items', invoices: 'invoices', bills: 'bills', expenses: 'expenses', 'bank-transactions': 'bank' };

const r = Router();
r.use(authRequired);

r.get('/:module', (req, res, next) => {
  const Model = MAP[req.params.module];
  if (!Model) return res.status(400).json({ error: 'Unknown module' });
  requirePermission(MODULE_OF[req.params.module], 'export')(req, res, ah(async () => {
    const items = await Model.find({ ownerId: req.user.id }).limit(10000).lean();
    const rows = items.map((i) => {
      const { _id, ownerId, __v, ...rest } = i;
      return { id: String(_id), ...flatten(rest) };
    });
    const buf = rowsToWorkbookBuffer(rows, req.params.module);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.module}.xlsx`);
    res.end(buf);
  })(req, res, next));
});

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

export default r;
//*** End Patch