import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { BUILTIN_ROLES } from '../utils/permissions.js';
import { authRequired } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();

async function ensureRolesSeeded() {
  const count = await Role.countDocuments();
  if (count === 0) {
    for (const role of BUILTIN_ROLES) await Role.create(role);
  }
}

r.post('/register', ah(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already used' });
  await ensureRolesSeeded();
  const userCount = await User.countDocuments();
  const role = await Role.findOne({ name: userCount === 0 ? 'Admin' : 'Viewer' });
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    name,
    roleId: role._id,
  });
  const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: role.name } });
}));

r.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  user.lastLoginAt = new Date();
  await user.save();
  const role = await Role.findById(user.roleId).lean();
  const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: role?.name } });
}));

r.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

r.post('/change-password', authRequired, ah(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!(await bcrypt.compare(oldPassword, user.passwordHash))) return res.status(401).json({ error: 'Wrong password' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
}));

export default r;
//*** End Patch