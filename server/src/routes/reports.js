import { Router } from 'express';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import { Invoice } from '../models/Invoice.js';
import { Bill } from '../models/Bill.js';
import { Expense } from '../models/Expense.js';

const r = Router();
r.use(authRequired);
r.use(requirePermission('reports', 'view'));

r.get('/pnl', ah(async (req, res) => {
  const ownerId = req.user.id;
  const [invAgg, expAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: { ownerId: req.user.id ? new (await import('mongoose')).default.Types.ObjectId(ownerId) : null } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    Expense.aggregate([
      { $match: { ownerId: new (await import('mongoose')).default.Types.ObjectId(ownerId) } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);
  const revenue = invAgg[0]?.revenue || 0;
  const expensesByCategory = expAgg.map((e) => ({ category: e._id || 'Uncategorized', total: e.total }));
  const expensesTotal = expensesByCategory.reduce((a, b) => a + b.total, 0);
  res.json({ revenue, expensesByCategory, expensesTotal, netProfit: revenue - expensesTotal });
}));

r.get('/ar-aging', ah(async (req, res) => {
  const now = Date.now();
  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const invoices = await Invoice.find({ ownerId: req.user.id, status: { $in: ['sent', 'partial', 'overdue'] } }).lean();
  for (const inv of invoices) {
    const due = inv.dueDate ? new Date(inv.dueDate).getTime() : now;
    const outstanding = (inv.total || 0) - (inv.amountPaid || 0);
    const days = Math.floor((now - due) / 86400000);
    if (days <= 0) buckets.current += outstanding;
    else if (days <= 30) buckets['1-30'] += outstanding;
    else if (days <= 60) buckets['31-60'] += outstanding;
    else if (days <= 90) buckets['61-90'] += outstanding;
    else buckets['90+'] += outstanding;
  }
  res.json(buckets);
}));

r.get('/ap-aging', ah(async (req, res) => {
  const now = Date.now();
  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const bills = await Bill.find({ ownerId: req.user.id, status: { $in: ['open', 'partial', 'overdue'] } }).lean();
  for (const b of bills) {
    const due = b.dueDate ? new Date(b.dueDate).getTime() : now;
    const outstanding = (b.total || 0) - (b.amountPaid || 0);
    const days = Math.floor((now - due) / 86400000);
    if (days <= 0) buckets.current += outstanding;
    else if (days <= 30) buckets['1-30'] += outstanding;
    else if (days <= 60) buckets['31-60'] += outstanding;
    else if (days <= 90) buckets['61-90'] += outstanding;
    else buckets['90+'] += outstanding;
  }
  res.json(buckets);
}));

export default r;
//*** End Patch