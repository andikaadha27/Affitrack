# AffiTrack

AffiTrack adalah sistem manajemen bisnis affiliate modern — tracking revenue, biaya iklan, profit, karyawan, jadwal, absensi, dan penggajian dalam satu dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/affitrack run dev` — run the frontend (port 19041)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (jsonwebtoken + bcryptjs)
- Frontend: React + Vite + TailwindCSS + Recharts + React Hook Form + Zod
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Auth middleware: `artifacts/api-server/src/middlewares/auth.ts`
- Frontend: `artifacts/affitrack/src/`

## Architecture decisions

- JWT tokens stored in localStorage under key `affitrack_token`; auto-attached via custom-fetch
- Ads fee (11%) is calculated server-side on insert/update — never trusting client-side calculation
- Salary calculation is on-demand (POST /salaries/calculate) — not automatic on attendance mark
- All revenue, ads, expenses use `numeric(15,2)` in DB; parsed to float in API responses
- Activity log is append-only — written on every create/delete of revenue, ad, expense, employee, attendance, salary

## Product

- Landing page with conversion CTAs
- Dashboard with today + monthly analytics (revenue, actual revenue, ads+11%, profit, margin, growth)
- Trend charts (7d / 30d / month) with Recharts
- Full CRUD: revenues (with actual revenue), ads (auto 11% fee), expenses
- Employee management (daily/monthly salary types)
- Calendar-based schedule management (morning/afternoon/evening/full shifts)
- Attendance tracking with bulk mark
- Automatic salary calculation (prorated for monthly, count-based for daily)
- Recent activity feed
- Dark/light mode toggle

## Default demo account

- Email: admin@affitrack.id
- Password: admin123
- Role: admin

## User preferences

- Language: Indonesian (Bahasa) for UI text
- Stack is portable — no Replit-proprietary services used

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- JWT secret falls back to hardcoded string if SESSION_SECRET not set — always set it in production
- Attendance bulk mark deletes existing records for the same date+employee before re-inserting

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
