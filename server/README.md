# LedgerFlow Pro — Self-hosted API

Express + MongoDB (Atlas) backend. The Lovable React app is the frontend; point
`VITE_API_URL` at this server.

## Run

```bash
cd server
cp .env.example .env   # fill in MONGO_URI + JWT_SECRET
npm install
npm run seed           # creates default roles + first admin
npm run dev
```

Default admin (change password after first login):
- email: `admin@ledgerflow.local`
- password: `Admin@12345`

## Modules

| Path | Purpose |
|------|---------|
| `POST   /api/auth/register` | Create account (first user auto-admin) |
| `POST   /api/auth/login`    | Returns JWT |
| `GET    /api/auth/me`       | Current user + role |
| `GET    /api/users`         | List org users (admin) |
| `POST   /api/users/invite`  | Invite + assign role |
| `GET    /api/roles`         | List roles |
| `POST   /api/roles`         | Create custom role with granular permissions |
| `*      /api/contacts`      | Customers + Vendors (business container) |
| `*      /api/items`         | Products/Services + per-user assignment |
| `*      /api/invoices`      | Sales invoices |
| `*      /api/bills`         | Vendor bills |
| `*      /api/expenses`      | Expenses |
| `*      /api/bank-accounts` | Bank/credit accounts |
| `*      /api/bank-transactions` | Statement lines + reconciliation |
| `*      /api/accounts`      | Chart of Accounts |
| `*      /api/journals`      | Manual journal entries |
| `*      /api/notes`         | Notes |
| `*      /api/events`        | Calendar |
| `POST   /api/import/:module`| Excel/CSV import (multipart) |
| `GET    /api/export/:module`| Excel export |
| `POST   /api/bank-import`   | Bank statement import (xlsx/csv) |
| `GET    /api/reports/:name` | P&L, BS, AR aging, etc. |

## Permission model

Every protected route runs through `requirePermission(module, action)`. A role
has a `permissions` map:

```js
{
  contacts: { view: 'all', create: true, edit: 'own', delete: false, export: true, import: true },
  items:    { view: 'all', create: true, edit: true,  delete: false },
  ...
}
```

Scope `'own'` restricts queries by `ownerId = req.user.id`; `'all'` is unrestricted; `false` blocks.

## Frontend wiring

In the Lovable app, replace `@/integrations/supabase/client` calls with a thin
`apiClient` that sends `Authorization: Bearer <jwt>` to this server. JWT lives
in `localStorage.ledgerflow_token`. Sample client in `examples/api-client.ts`.

## Notes

- No RLS. Authorization is enforced in middleware — keep it in front of every route.
- Mongoose schemas use flexible `Mixed`/sub-documents for the "business container", custom fields, role permissions, and Excel cell overrides — Mongo-native.
- File uploads use in-memory multer; swap for S3/R2 in `services/storage.js`.