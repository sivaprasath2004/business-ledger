import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();
r.use(authRequired);

r.get('/', requirePermission('users', 'view'), ah(async (_req, res) => {
  const users = await User.find().populate('roleId', 'name').lean();
  res.json({ items: users.map((u) => ({ ...u, passwordHash: undefined })) });
}));

r.post('/invite', requirePermission('users', 'create'), ah(async (req, res) => {
  const { email, name, roleId, password } = req.body;
  if (!email || !roleId) return res.status(400).json({ error: 'email & roleId required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Exists' });
  const tempPwd = password || Math.random().toString(36).slice(2, 12) + '!A1';
  const user = await User.create({
    email: email.toLowerCase(),
    name,
    roleId,
    passwordHash: await bcrypt.hash(tempPwd, 10),
  });
  res.status(201).json({ user: { id: user._id, email: user.email, name }, tempPassword: tempPwd });
}));

r.put('/:id/role', requirePermission('users', 'edit'), ah(async (req, res) => {
  const { roleId } = req.body;
  const role = await Role.findById(roleId);
  if (!role) return res.status(400).json({ error: 'Invalid role' });
  await User.findByIdAndUpdate(req.params.id, { roleId });
  res.json({ ok: true });
}));

r.put('/:id/active', requirePermission('users', 'edit'), ah(async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { active: !!req.body.active });
  res.json({ ok: true });
}));

export default r;
//*** End Patch