import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { BUILTIN_ROLES } from './permissions.js';

await mongoose.connect(process.env.MONGO_URI);

for (const r of BUILTIN_ROLES) {
  await Role.updateOne({ name: r.name }, { $set: r }, { upsert: true });
}
const admin = await Role.findOne({ name: 'Admin' });

const existing = await User.findOne({ email: 'admin@ledgerflow.local' });
if (!existing) {
  await User.create({
    email: 'admin@ledgerflow.local',
    passwordHash: await bcrypt.hash('Admin@12345', 10),
    name: 'Admin',
    roleId: admin._id,
  });
  console.log('✓ Admin user created: admin@ledgerflow.local / Admin@12345');
} else {
  console.log('• Admin user already exists');
}
console.log('✓ Roles seeded');
await mongoose.disconnect();
//*** End Patch