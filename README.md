# 📒 Business Ledger

A modern, full-stack business ledger application built with **React 19**, **TanStack Start**, and **Supabase**. Track income, expenses, and transactions with a clean, responsive UI powered by Tailwind CSS and Radix UI components.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript |
| **Routing** | TanStack Router v1 |
| **Server / SSR** | TanStack Start (Vite + Nitro) |
| **Database & Auth** | Supabase (PostgreSQL + PL/pgSQL) |
| **State / Data Fetching** | TanStack Query v5 |
| **UI Components** | Radix UI, shadcn/ui |
| **Styling** | Tailwind CSS v4 |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Package Manager** | Bun (with npm fallback) |

---

## ✨ Features

- **Transaction Management** — Add, edit, and delete income/expense entries
- **Dashboard with Charts** — Visualize financial data using Recharts
- **Authentication** — Secure user auth powered by Supabase Auth
- **Form Validation** — Type-safe forms with React Hook Form and Zod schemas
- **Responsive UI** — Built with Radix UI primitives and Tailwind CSS
- **Database Migrations** — Supabase-managed Postgres schema via PL/pgSQL scripts
- **Server-Side Rendering** — Full SSR support via TanStack Start + Nitro

---

## 📁 Project Structure

```
business-ledger/
├── src/               # Frontend source — routes, components, hooks, lib
├── server/            # Server-side logic (API handlers, middleware)
├── supabase/          # Database migrations and Supabase config
├── components.json    # shadcn/ui component configuration
├── vite.config.ts     # Vite + TanStack Start configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)
- A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/sivaprasath2004/business-ledger.git
cd business-ledger
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of the project:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project's **Settings → API** page.

### 4. Set Up the Database

Apply the Supabase migrations from the `supabase/` folder using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

Or run the SQL migration files manually in the Supabase SQL Editor.

### 5. Run the Development Server

```bash
# Using Bun
bun run dev

# Or using npm
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start the development server |
| `build` | Build for production |
| `build:dev` | Build in development mode |
| `preview` | Preview the production build |
| `lint` | Run ESLint |
| `format` | Format code with Prettier |

---

## 🗄️ Database

The project uses **Supabase** (hosted PostgreSQL) with schema managed via PL/pgSQL migrations stored in the `supabase/` directory. Supabase also provides:

- **Row Level Security (RLS)** — Ensures users can only access their own data
- **Auth** — Email/password and OAuth sign-in via `@supabase/supabase-js`
- **Realtime** (optional) — Live updates for ledger entries

---

## 🚢 Deployment

This project uses TanStack Start with Nitro as the server engine, making it deployable to a variety of platforms:

- **Vercel** — Zero-config deployment
- **Netlify** — Supported via Nitro's Netlify adapter
- **Node.js server** — Run the built output with Node

Update `vite.config.ts` to configure the target deployment preset as needed.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

> Built by [Sivaprasath](https://github.com/sivaprasath2004)
