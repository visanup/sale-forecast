# Auth Service

Authentication and authorization service for the Betagro sale-forecast platform.

## Role Model

- `ADMIN`: Full access to administrative functionality and management endpoints.
- `USER`: Default role for all registered accounts with limited access to personal resources.

The Prisma seed process provisions the following fixed admin accounts (passwords are set via environment or the seed list and must be rotated for production):

- `qiadmin@betagro.com`
- `aiadmin@betagro.com`
- `biadmin@betagro.com`
- `diadmin@betagro.com`

> Security note: Change the seeded admin passwords and rotate JWT secrets before deploying to production.

## Getting Started

```bash
cd services/auth-service
npm install
npx prisma migrate dev           # or: npm run db:migrate (CI: prisma migrate deploy)
npm run db:seed
npm run dev
```

Additional scripts:

- `npm run build` – compile TypeScript
- `npm run start` – run compiled server
- `npm run db:migrate` – apply database migrations
- `npm run db:seed` – execute Prisma seed (`tsx prisma/seed.ts`)

## Key Endpoints

- Health checks: `GET /healthz`, `GET /readyz`, `GET /metrics`
- Swagger docs: `GET /docs`
- Auth flows: register, login, refresh, logout, password reset under `/api/v1/auth`
- Profile management: `/api/v1/profile`
- Admin guard route (requires ADMIN role): `GET /admin/ping` → `{ "ok": true }`

All issued JWT access tokens carry the `sub`, `email`, and `role` claims so downstream services can enforce role-based access control.

