import { Router } from 'express';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from './asyncHandler.js';

///**
//  * Generic CRUD router factory.
//  * options: { Model, module, ownerScoped=true, populate=[], searchFields=[], beforeCreate, beforeUpdate }
//  */
export function crudRouter({ Model, module, ownerScoped = true, populate = [], searchFields = [], beforeCreate, beforeUpdate }) {
  const r = Router();
  r.use(authRequired);

  r.get('/', requirePermission(module, 'view'), ah(async (req, res) => {
    const q = { ...(ownerScoped ? { ownerId: req.user.id } : {}), ...(req.scope || {}) };
    if (req.query.q && searchFields.length) {
      q.$or = searchFields.map((f) => ({ [f]: { $regex: req.query.q, $options: 'i' } }));
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;
    let query = Model.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit);
    for (const p of populate) query = query.populate(p);
    const [items, total] = await Promise.all([query.lean(), Model.countDocuments(q)]);
    res.json({ items, total });
  }));

  r.get('/:id', requirePermission(module, 'view'), ah(async (req, res) => {
    const q = { _id: req.params.id, ...(ownerScoped ? { ownerId: req.user.id } : {}) };
    let query = Model.findOne(q);
    for (const p of populate) query = query.populate(p);
    const doc = await query.lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  }));

  r.post('/', requirePermission(module, 'create'), ah(async (req, res) => {
    const data = { ...req.body, ...(ownerScoped ? { ownerId: req.user.id } : {}) };
    if (beforeCreate) await beforeCreate(data, req);
    const doc = await Model.create(data);
    res.status(201).json(doc);
  }));

  r.put('/:id', requirePermission(module, 'edit'), ah(async (req, res) => {
    const q = { _id: req.params.id, ...(ownerScoped ? { ownerId: req.user.id } : {}) };
    const data = { ...req.body };
    delete data.ownerId;
    if (beforeUpdate) await beforeUpdate(data, req);
    const doc = await Model.findOneAndUpdate(q, data, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  }));

  r.delete('/:id', requirePermission(module, 'delete'), ah(async (req, res) => {
    const q = { _id: req.params.id, ...(ownerScoped ? { ownerId: req.user.id } : {}) };
    const doc = await Model.findOneAndDelete(q);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  }));

  return r;
}
//*** End Patch