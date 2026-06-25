import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import contactRoutes from './routes/contacts.js';
import itemRoutes from './routes/items.js';
import invoiceRoutes from './routes/invoices.js';
import billRoutes from './routes/bills.js';
import expenseRoutes from './routes/expenses.js';
import bankAccountRoutes from './routes/bankAccounts.js';
import bankTxRoutes from './routes/bankTransactions.js';
import accountRoutes from './routes/accounts.js';
import journalRoutes from './routes/journals.js';
import noteRoutes from './routes/notes.js';
import eventRoutes from './routes/events.js';
import importRoutes from './routes/import.js';
import exportRoutes from './routes/export.js';
import bankImportRoutes from './routes/bankImport.js';
import reportRoutes from './routes/reports.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/bank-transactions', bankTxRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/bank-import', bankImportRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error', details: err.details });
});

const PORT = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✓ Mongo connected');
    app.listen(PORT, () => console.log(`✓ API listening on :${PORT}`));
  })
  .catch((e) => {
    console.error('Mongo connection failed:', e.message);
    process.exit(1);
  });