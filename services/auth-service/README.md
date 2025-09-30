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

