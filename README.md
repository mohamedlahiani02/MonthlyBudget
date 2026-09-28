# 💰 Personal Finance Dashboard

A modern, single-user personal finance dashboard — daily expenses, income, monthly budgeting, fully custom fixed/variable categories with unlimited subcategories, recurring expenses, and rich analytics. Built to deploy for **free on Vercel**.

Dark-mode, glassmorphism UI inspired by Vercel, Linear, Notion and Stripe.

## ✨ Features

- **Single-password auth** — signed HTTP-only cookie session (no JWT, no OAuth, no external auth).
- **Dashboard** — animated KPI counters, budget progress ring, spending heatmap, top categories, recent transactions and charts.
- **Transactions** — full CRUD for expenses & income with search + filtering (text, category, subcategory, payment method, month, year).
- **Monthly budget** — one budget per month with saving goal and live remaining/utilization.
- **Categories** — unlimited Fixed & Variable categories, unlimited subcategories, rename/delete, **drag & drop** reordering.
- **Recurring expenses** — e.g. STEG 180 DT monthly; auto-generated (lazily) each month with no cron required.
- **Reports** — yearly KPIs + Recharts pie/bar/line (Fixed vs Variable, Expenses by Category, Monthly Income/Expenses, Savings evolution, Monthly spending).
- **Settings** — change password, export CSV, export full database (JSON), import CSV, toggle dark mode.
- **Productivity** — Command palette (`⌘/Ctrl+K`), Quick Add expense (`N`), keyboard shortcuts, toasts, confirmation dialogs, loading skeletons, empty states, error boundaries, mobile-first responsive design.

## 🧱 Tech Stack

Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Lucide · Recharts · React Hook Form · Zod · Framer Motion · Prisma ORM · **Neon Postgres** (free tier) · @dnd-kit.

### Why Postgres instead of SQLite?

The original spec called for SQLite, but Vercel's serverless filesystem is **ephemeral/read-only at runtime** — SQLite writes would be lost on every redeploy/cold start. To keep the app **completely free and persistent**, it uses [Neon](https://neon.tech) serverless Postgres (generous free tier). The code is unchanged Prisma; only the datasource `provider` and connection string differ.

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+ (tested on 22)
- A free Postgres database. Easiest: create one at [neon.tech](https://neon.tech) and copy the connection string. (Any local Postgres works too.)

> **Local Postgres in one command (optional):** if you have Docker, you can run a throwaway DB for local dev:
>
> ```bash
> docker run -d --name mb-postgres -e POSTGRES_USER=budget -e POSTGRES_PASSWORD=budget -e POSTGRES_DB=monthlybudget -p 5544:5432 postgres:16-alpine
> ```
>
> Then set `DATABASE_URL="postgresql://budget:budget@localhost:5544/monthlybudget?sslmode=disable"`.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
APP_PASSWORD="myPassword123"
DATABASE_URL="postgresql://USER:PASSWORD@HOST/dbname?sslmode=require"
SESSION_SECRET="a-long-random-string"
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Install & run

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Open http://localhost:3000, then unlock with your `APP_PASSWORD`.

## 📜 Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | `prisma generate` + production build |
| `npm start`       | Start the production server          |
| `npm run seed`    | Seed realistic sample data           |
| `npm run db:push` | Push the Prisma schema to the DB     |
| `npm run db:studio` | Open Prisma Studio                 |

## ☁️ Deploy to Vercel (free)

1. Push this repo to GitHub.
2. Create a free Neon Postgres database and copy its connection string.
3. Import the repo into [Vercel](https://vercel.com/new).
4. Add environment variables in **Project → Settings → Environment Variables**:
   - `APP_PASSWORD`
   - `DATABASE_URL` (your Neon string)
   - `SESSION_SECRET`
5. The build runs `prisma generate` automatically (`build` script + `postinstall`).
6. After the first deploy, push the schema and seed once against your production DB from your machine:

   ```bash
   # with production DATABASE_URL in your shell/.env
   npx prisma db push
   npm run seed   # optional sample data
   ```

That's it — the app runs entirely on Vercel's free tier.

## MCP server (Claude.ai custom connector)

The app exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/api/mcp`
(Streamable HTTP, stateless, JSON responses) protected by OAuth 2.1 authorization code + PKCE (S256).
Signing in reuses the existing password session: the consent screen at `/oauth/authorize` is only
reachable with a valid `mb_session` cookie.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/mcp` | MCP JSON-RPC endpoint (Bearer token required) |
| `GET /.well-known/oauth-protected-resource[/api/mcp]` | RFC 9728 protected resource metadata |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 authorization server metadata |
| `POST /oauth/register` | RFC 7591 dynamic client registration (redirect URIs must be allowlisted) |
| `GET /oauth/authorize` | Consent screen (requires app login) |
| `POST /oauth/token` | `authorization_code` and `refresh_token` grants |

Tools: `get_monthly_summary`, `list_transactions`, `add_expense`, `add_income`, `get_categories`,
`list_accounts`, `get_budget_status`. Each declares an input and output schema.

OAuth state is stateless (HMAC-signed with `MCP_TOKEN_SECRET`); no database tables are added.
Access tokens last 1 hour, refresh tokens 30 days. Rotating `MCP_TOKEN_SECRET` revokes all of them.
Limitation: because nothing is stored, authorization codes cannot be enforced as single-use
(mitigated by a 60 second lifetime and PKCE) and refresh-token reuse cannot be detected.

### Configuration

Set `MCP_PUBLIC_BASE_URL`, `MCP_TOKEN_SECRET` and optionally `MCP_ALLOWED_REDIRECT_URIS` and
`LOG_LEVEL` (see `.env.example`). Without the first two, the MCP and OAuth endpoints respond `503`
and log `mcp.config_error`; the rest of the app is unaffected.

### Testing locally

1. Add to `.env`:

   ```env
   MCP_PUBLIC_BASE_URL="http://localhost:3000"
   MCP_TOKEN_SECRET="<output of: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\">"
   MCP_ALLOWED_REDIRECT_URIS="https://claude.ai/api/mcp/auth_callback,http://localhost:6274/oauth/callback"
   ```

2. `npm run dev`, then check discovery and the auth challenge:

   ```bash
   curl -s localhost:3000/.well-known/oauth-authorization-server | jq
   curl -s localhost:3000/.well-known/oauth-protected-resource/api/mcp | jq
   curl -si -X POST localhost:3000/api/mcp -H 'content-type: application/json' -d '{}' | grep -i www-authenticate
   ```

   The last command must return `401` with a `WWW-Authenticate: Bearer resource_metadata="..."` header.

3. Run the MCP Inspector and walk through the full OAuth flow:

   ```bash
   npx @modelcontextprotocol/inspector
   ```

   In the Inspector UI choose transport **Streamable HTTP**, URL `http://localhost:3000/api/mcp`, and
   click **Connect** (or **Open Auth Settings > Quick OAuth Flow**). You are sent to the app's login
   page, then to the consent screen; after **Approve**, the Inspector lists the tools and you can call them.

4. Watch the server output: every auth step and tool call is a JSON log line with an `event` field
   (`mcp.auth`, `mcp.tool_call`, `oauth.register`, `oauth.authorize`, `oauth.token`, `oauth.discovery`).
   Tokens and codes are never logged.

### Connecting from Claude.ai

After deploying with `MCP_PUBLIC_BASE_URL="https://mlmonthlybudget.me"`, open Claude.ai
Settings > Connectors > Add custom connector and enter `https://mlmonthlybudget.me/api/mcp`.
Leave the OAuth client ID/secret fields empty; Claude registers itself dynamically. If the connection
fails, filter the Vercel runtime logs by `event` to see which step was rejected and why.

## 🗂️ Project Structure

```
app/
  (dashboard)/         Protected pages: dashboard, transactions, budget, categories, reports, settings
  api/                 Route handlers (auth, income, expenses, categories, subcategories, budget, recurring, settings)
  login/               Password login page
components/
  ui/                  shadcn/ui primitives
  dashboard/ charts/ transactions/ categories/ reports/ shared/
hooks/                 use-toast, use-categories
lib/                   prisma, auth, password, finance, recurring, csv, validations, utils, api client
prisma/                schema.prisma, seed.ts
types/                 shared types
middleware.ts          route protection
```

## 🔐 Notes on password change

Vercel environment variables are read-only at runtime, so "change password" stores an override in a small `Setting` table (falling back to `APP_PASSWORD` when unset). This keeps the change persistent without a redeploy.
