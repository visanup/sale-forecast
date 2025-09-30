## Backend Services (Node.js + TypeScript + Express + Prisma)

Document ID: BE-03

Scope: Microservices design, conventions, ports, environments, responsibilities

Audience: Backend engineers, DevOps

### Microservices and Ports (no gateway; start at 6601)
- auth-service: 6601
- ingest-service: 6602
- data-service: 6603
- dim-service: 6604

Each service is an independent Node TS project with its own package.json and library folder.

### Naming & Conventions
- Package name: `@df/<service-name>` e.g., `@df/auth-service`
- Source entry: `src/server.ts` (bootstrap), `src/app.ts` (Express app)
- Route modules under `src/routes/*`
- Middlewares under `src/middlewares/*`
- Shared lib inside service: `src/lib/*`; no cross-service imports (publish to npm if shared)
- HTTP JSON only; snake_case in DB, camelCase in API payloads
- Date: ISO 8601, month fields use `yyyy-MM` or `yyyy-MM-01` (UTC)

### Shared Conventions
- Logger: pino
- Validation: zod
- Auth between services: internal token via `INTERNAL_SHARED_SECRET`
- DB access: Prisma (shared schema, separate client instances)
- Error model: `{ error: { code, message } }`

### Standard Service Folder Layout
Each service follows the same structure:
```
service-name/
  prisma/                 # Prisma schema (if used for this service)
  src/
    config/               # env/config loaders
    middleware/           # auth, error, logging
    routes/               # route modules
    schemas/              # zod schemas for inputs
    services/             # business logic
    types/                # shared TS types for the service
    utils/                # helpers (token, password, errors)
    server.ts             # bootstrap server & mount routes
```

### .env.example per service

#### api-gateway
```
PORT=6600
NODE_ENV=development
CORS_ORIGINS=http://localhost:6610
INTERNAL_SHARED_SECRET=dev-internal-secret
AUTH_SERVICE_URL=http://auth-service:6601
INGEST_SERVICE_URL=http://ingest-service:6602
DATA_SERVICE_URL=http://data-service:6603
DIM_SERVICE_URL=http://dim-service:6604
```

#### auth-service
```
PORT=6601
NODE_ENV=development
DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
API_KEY_HASH_ALGO=argon2
INTERNAL_SHARED_SECRET=dev-internal-secret
```

#### ingest-service
```
PORT=6602
NODE_ENV=development
DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
MAX_UPLOAD_MB=25
INTERNAL_SHARED_SECRET=dev-internal-secret
```

#### data-service
```
PORT=6603
NODE_ENV=development
DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
INTERNAL_SHARED_SECRET=dev-internal-secret
```

#### dim-service
```
PORT=6604
NODE_ENV=development
DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
INTERNAL_SHARED_SECRET=dev-internal-secret
```

### Services Responsibilities

- auth-service
  - Manage api_clients, api_keys
  - Issue/revoke API Keys (hash stored)
  - Validate API Key (internal call from gateway)

- ingest-service
  - Upload Excel/CSV → staging
  - Validate & upsert dims
  - Create forecast_run and insert fact_forecast, fact_price

- data-service
  - Read-only endpoints for forecast, aggregate, prices

- dim-service
  - Read-only endpoints for dimension lookups

- auth flow for services (no gateway)
  - data-service & dim-service require `X-API-Key`
  - middleware calls `auth-service:/internal/validate`

### Directory Layout (example for a service)
```
service-name/
  src/
    server.ts
    app.ts
    routes/
    middlewares/
    lib/
    prisma/
  package.json
  tsconfig.json
  .env.example
```

### Libraries per service
- Common request/response types
- Prisma client wrapper
- Error helpers
- Date utilities for month handling

### Error Codes (canonical)
- BAD_REQUEST
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- RATE_LIMITED
- INTERNAL_ERROR


