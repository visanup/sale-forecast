# Data Service

Aggregated data APIs (forecast, prices) protected by internal API key validation.

## Run
- Dev: `yarn dev` (port 6603)
- Build/Start: `yarn build && yarn start`

## Env
- `PORT` (default 6603)
- `DATABASE_URL`
- `CORS_ORIGINS`
- `AUTH_VALIDATE_URL` (e.g. `http://localhost:6601/internal/validate`)
- `INTERNAL_SHARED_SECRET` (must match auth-service)

## Endpoints
- Health: `GET /health`
- Prices: `GET /v1/prices` (header `X-API-Key` required)
- Forecast: `GET /v1/forecast`, `GET /v1/forecast/aggregate` (header `X-API-Key` required)

## Quick test
```bash
curl -s http://localhost:6603/health
curl -s -H "X-API-Key: any-key" "http://localhost:6603/v1/prices?company=ACME&from=2024-01&to=2024-12"
```

