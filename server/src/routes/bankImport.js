import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import { workbookToRows, autoMap } from '../services/excel.js';
import { BankTransaction } from '../models/BankTransaction.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const r = Router();
r.use(authRequired);

const FIELDS = [
  { key: 'date', aliases: ['txndate', 'transactiondate', 'valuedate'] },
  { key: 'description', aliases: ['narration', 'particulars', 'details', 'memo'] },
  { key: 'reference', aliases: ['chequeno', 'ref', 'refno'] },
  { key: 'debit', aliases: ['withdrawal', 'dr', 'paidout'] },
  { key: 'credit', aliases: ['deposit', 'cr', 'paidin'] },
  { key: 'balance', aliases: ['runningbalance', 'bal'] },
];

r.post('/', upload.single('file'), requirePermission('bank', 'import'), ah(async (req, res) => {
  const { bankAccountId } = req.body;
  if (!bankAccountId) return res.status(400).json({ error: 'bankAccountId required' });
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const rows = workbookToRows(req.file.buffer);
  if (!rows.length) return res.json({ imported: 0 });
  const map = autoMap(Object.keys(rows[0]), FIELDS);
  const batch = nanoid(10);
  const docs = rows
    .map((row) => {
      const get = (k) => (map[k] != null ? row[map[k]] : undefined);
      const debit = parseFloat(get('debit')) || 0;
      const credit = parseFloat(get('credit')) || 0;
      const dateRaw = get('date');
      const date = dateRaw instanceof Date ? dateRaw : new Date(dateRaw);
      if (!date || isNaN(date)) return null;
      return {
        ownerId: req.user.id,
        bankAccountId,
        date,
        description: String(get('description') || ''),
        reference: String(get('reference') || ''),
        debit, credit,
        balance: parseFloat(get('balance')) || undefined,
        importBatchId: batch,
        raw: row,
      };
    })
    .filter(Boolean);
  const result = await BankTransaction.insertMany(docs, { ordered: false }).catch(() => []);
  res.json({ imported: result.length, batch, mapping: map });
}));

export default r;
//*** End Patch