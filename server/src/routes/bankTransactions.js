import { Router } from 'express';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { BankTransaction } from '../models/BankTransaction.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();
r.use(authRequired);

r.get('/', requirePermission('bank', 'view'), ah(async (req, res) => {
  const q = { ownerId: req.user.id };
  if (req.query.bankAccountId) q.bankAccountId = req.query.bankAccountId;
  if (req.query.status) q.status = req.query.status;
  const items = await BankTransaction.find(q).sort({ date: -1 }).limit(500).lean();
  res.json({ items });
}));

r.put('/:id/match', requirePermission('bank', 'edit'), ah(async (req, res) => {
  const { matchedType, matchedId } = req.body;
  const tx = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { matchedType, matchedId, status: 'matched' },
    { new: true },
  );
  res.json(tx);
}));

r.put('/:id/reconcile', requirePermission('bank', 'edit'), ah(async (req, res) => {
  const tx = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { status: 'reconciled' },
    { new: true },
  );
  res.json(tx);
}));

export default r;
//*** End Patch