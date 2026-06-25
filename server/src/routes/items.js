import { Router } from 'express';
import { crudRouter } from '../utils/crud.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { Item } from '../models/Item.js';
import { ah } from '../utils/asyncHandler.js';

const base = crudRouter({ Model: Item, module: 'items', searchFields: ['name', 'sku', 'description'] });
const r = Router();
r.use(base);

// Per-user assignment summary
r.get('/:id/assignments', authRequired, requirePermission('items', 'view'), ah(async (req, res) => {
  const item = await Item.findById(req.params.id).populate('assignments.userId', 'name email').lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ assignments: item.assignments || [] });
}));

// Add/update a per-user assignment quantity
r.post('/:id/assignments', authRequired, requirePermission('items', 'edit'), ah(async (req, res) => {
  const { userId, purchasedQty = 0, soldQty = 0, valueIn = 0, valueOut = 0 } = req.body;
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const a = item.assignments.find((x) => String(x.userId) === String(userId));
  if (a) {
    a.purchasedQty += purchasedQty;
    a.soldQty += soldQty;
    a.valueIn += valueIn;
    a.valueOut += valueOut;
  } else {
    item.assignments.push({ userId, purchasedQty, soldQty, valueIn, valueOut });
  }
  await item.save();
  res.json(item);
}));

export default r;
//*** End Patch