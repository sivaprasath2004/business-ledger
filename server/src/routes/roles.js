import { Router } from 'express';
import { Role } from '../models/Role.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ALL_MODULES, ALL_ACTIONS } from '../utils/permissions.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();
r.use(authRequired);

r.get('/_meta', (_req, res) => res.json({ modules: ALL_MODULES, actions: ALL_ACTIONS }));

r.get('/', requirePermission('roles', 'view'), ah(async (_req, res) => {
  res.json({ items: await Role.find().lean() });
}));

r.post('/', requirePermission('roles', 'create'), ah(async (req, res) => {
  const role = await Role.create({ ...req.body, builtin: false });
  res.status(201).json(role);
}));

r.put('/:id', requirePermission('roles', 'edit'), ah(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.builtin) return res.status(400).json({ error: 'Cannot edit built-in role' });
  Object.assign(role, req.body);
  await role.save();
  res.json(role);
}));

r.delete('/:id', requirePermission('roles', 'delete'), ah(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ error: 'Not found' });
  if (role.builtin) return res.status(400).json({ error: 'Cannot delete built-in role' });
  await role.deleteOne();
  res.json({ ok: true });
}));

export default r;
//*** End Patch