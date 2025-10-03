# Dimension Service

Read-only dimension lookups (companies, depts, materials, skus, sales-orgs, months).

## Run
- Dev: `yarn dev` (port 6604)
- Build/Start: `yarn build && yarn start`

## Env
- `PORT` (default 6604)
- `DATABASE_URL`
- `AUTH_VALIDATE_URL` (e.g. `http://localhost:6601/internal/validate`)
- `INTERNAL_SHARED_SECRET`
- `DEFAULT_PAGE_LIMIT`, `MAX_PAGE_LIMIT`

## Endpoints
- Health: `GET /health`
- `GET /v1/dim/companies|depts|distribution-channels|materials|skus|sales-orgs|months`

## Quick test
```bash
curl -s http://localhost:6604/health
curl -s -H "X-API-Key: any-key" "http://localhost:6604/v1/dim/companies?limit=5"
```
_________________________

## สิ่งที่แก้ไข
1. แก้ไข dockerfile

## ขั้นตอน start docker
1. `npx -y prisma@6.16.3 generate`
2. `yarn install`
3. `docker compose build auth-service`