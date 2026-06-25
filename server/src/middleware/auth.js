import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid user' });
    const role = await Role.findById(user.roleId).lean();
    req.user = { id: String(user._id), email: user.email, name: user.name, roleId: String(user.roleId), role };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

///**
//  * requirePermission('contacts', 'edit')
//  * Reads role.permissions[module][action]:
//  *   true | 'all'   -> allow, no scope filter
//  *   'own'          -> allow, set req.scope = { ownerId: req.user.id }
//  *   false/missing  -> deny
//  */
export function requirePermission(module, action) {
  return (req, res, next) => {
    const perms = req.user?.role?.permissions || {};
    const modPerms = perms[module] || {};
    const val = modPerms[action];
    if (val === true || val === 'all') {
      req.scope = {};
      return next();
    }
    if (val === 'own') {
      req.scope = { ownerId: req.user.id };
      return next();
    }
    return res.status(403).json({ error: `Forbidden: ${module}.${action}` });
  };
}