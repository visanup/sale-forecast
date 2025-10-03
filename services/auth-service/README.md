# Auth Service

Lightweight authentication and token service.

## Run
- Dev: `yarn dev` (port 6601)
- Build/Start: `yarn build && yarn start`

## Env
- `PORT` (default 6601)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `INTERNAL_SHARED_SECRET` (for internal validation)

## Endpoints
- Health: `GET /healthz`, `GET /readyz`, `GET /metrics`
- Docs (Swagger): `GET /docs`
- Auth:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
- API Key Management (requires authentication):
  - `POST /api/v1/api-keys/clients` - Create API client
  - `GET /api/v1/api-keys/clients` - List API clients
  - `GET /api/v1/api-keys/clients/:id` - Get API client
  - `POST /api/v1/api-keys/clients/:id/keys` - Create API key
  - `DELETE /api/v1/api-keys/keys/:id` - Revoke API key
  - `DELETE /api/v1/api-keys/clients/:id` - Deactivate API client
- Internal:
  - `POST /internal/validate` headers: `X-Internal-Secret: <INTERNAL_SHARED_SECRET>` body: `{ "apiKey": "..." }` → `{ valid, clientId, scope }`

## Quick test
```bash
curl -s http://localhost:6601/healthz
curl -s -H "Content-Type: application/json" -H "X-Internal-Secret: dev-internal-secret" \
  -d '{"apiKey":"any"}' http://localhost:6601/internal/validate
```

## Create Sample API Key
```bash
yarn create-api-key
```

This will create a demo API client and generate an API key that you can use to test the other services.

_________________________

## สิ่งที่แก้ไข
1. ตัดระบบยืนยันอีเมลออกจาก service (ลบเมธอด `verifyEmail` และ route `/api/v1/auth/verify-email`)
2. ปรับให้ผู้ใช้ใหม่ถูกสร้างด้วยสถานะ `emailVerified = true` ตั้งแต่ต้น และลดการอัปเดตซ้ำในฐานข้อมูล
3. ล้างค่าคอนฟิกและ error handler ที่เกี่ยวกับการยืนยันอีเมลเพื่อไม่ให้เหลือ flag หรือข้อความผิดพลาดที่ไม่ถูกใช้งานแล้ว
4. ปรับ health endpoint ให้รองรับทั้ง `/healthz` และ `/health` เพื่อให้ Docker healthcheck ทำงานสำเร็จ

## ขั้นตอน start docker
1. `npx -y prisma@6.16.3 generate`
2. `yarn install`
3. `docker compose build auth-service`
