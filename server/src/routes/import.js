import { Router } from 'express';
import multer from 'multer';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import { workbookToRows, autoMap } from '../services/excel.js';
import { Contact } from '../models/Contact.js';
import { Item } from '../models/Item.js';
import { Expense } from '../models/Expense.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const r = Router();
r.use(authRequired);

const SCHEMAS = {
  contacts: {
    Model: Contact,
    module: 'contacts',
    fields: [
      { key: 'displayName', aliases: ['name', 'contactname', 'fullname'] },
      { key: 'businessName', aliases: ['company', 'business', 'organization'] },
      { key: 'email' },
      { key: 'phone', aliases: ['mobile', 'contact'] },
      { key: 'taxNumber', aliases: ['gstin', 'vat', 'taxid'] },
      { key: 'currency' },
      { key: 'paymentTerms' },
      { key: 'type' },
      { key: 'notes' },
    ],
  },
  items: {
    Model: Item,
    module: 'items',
    fields: [
      { key: 'name', aliases: ['itemname', 'product'] },
      { key: 'sku', aliases: ['code'] },
      { key: 'unit' },
      { key: 'hsnSac', aliases: ['hsn', 'sac'] },
      { key: 'sellingPrice', aliases: ['price', 'rate', 'sellingrate'] },
      { key: 'costPrice', aliases: ['cost', 'purchaseprice'] },
      { key: 'taxRate', aliases: ['tax', 'gst', 'vat'] },
      { key: 'description' },
      { key: 'openingStock', aliases: ['stock', 'qty'] },
    ],
  },
  expenses: {
    Model: Expense,
    module: 'expenses',
    fields: [
      { key: 'date' },
      { key: 'category' },
      { key: 'description', aliases: ['narration'] },
      { key: 'amount', aliases: ['value'] },
      { key: 'currency' },
      { key: 'paidVia', aliases: ['method'] },
    ],
  },
};

r.post('/:module', upload.single('file'), ah(async (req, res, next) => {
  const schema = SCHEMAS[req.params.module];
  if (!schema) return res.status(400).json({ error: 'Unknown module' });
  requirePermission(schema.module, 'import')(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: 'file required (multipart field: file)' });
    const rows = workbookToRows(req.file.buffer);
    if (!rows.length) return res.json({ imported: 0, errors: [] });
    const headers = Object.keys(rows[0]);
    const map = autoMap(headers, schema.fields);
    const docs = [];
    const errors = [];
    rows.forEach((row, i) => {
      const doc = { ownerId: req.user.id };
      for (const f of schema.fields) if (map[f.key] != null) doc[f.key] = row[map[f.key]];
      try { docs.push(doc); } catch (e) { errors.push({ row: i + 2, error: e.message }); }
    });
    const result = await schema.Model.insertMany(docs, { ordered: false }).catch((e) => {
      errors.push({ error: e.message });
      return [];
    });
    res.json({ imported: result.length, errors, mapping: map });
  });
}));

r.get('/:module/template', ah(async (req, res) => {
  const schema = SCHEMAS[req.params.module];
  if (!schema) return res.status(400).json({ error: 'Unknown module' });
  const headers = schema.fields.map((f) => f.key);
  const { rowsToWorkbookBuffer } = await import('../services/excel.js');
  const buf = rowsToWorkbookBuffer([Object.fromEntries(headers.map((h) => [h, '']))], req.params.module);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.module}-template.xlsx`);
  res.end(buf);
}));

export default r;
//*** End Patch