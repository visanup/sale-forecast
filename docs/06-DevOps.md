## DevOps: Docker Compose, Envs, Make Targets

Document ID: DEVOPS-06

Scope: Runtime topology, compose files, envs, secrets, networks

Audience: DevOps, Backend engineers

### Docker Compose (infra)
`docker-compose.infra.yml`
```yaml
version: "3.9"
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: sales_forecast
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Docker Compose (apps)
`docker-compose.apps.yml`
```yaml
version: "3.9"
services:
  api-gateway:
    image: node:20
    working_dir: /app
    command: sh -c "yarn && yarn start"
    ports: ["6600:6600"]
    environment:
      - PORT=6600
      - AUTH_SERVICE_URL=http://auth-service:6601
      - INGEST_SERVICE_URL=http://ingest-service:6602
      - DATA_SERVICE_URL=http://data-service:6603
      - DIM_SERVICE_URL=http://dim-service:6604
      - INTERNAL_SHARED_SECRET=dev-internal-secret
    depends_on: [auth-service, ingest-service, data-service, dim-service]

  auth-service:
    image: node:20
    working_dir: /app
    command: sh -c "yarn && yarn start"
    environment:
      - PORT=6601
      - DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
      - INTERNAL_SHARED_SECRET=dev-internal-secret
    depends_on: [postgres]

  ingest-service:
    image: node:20
    working_dir: /app
    command: sh -c "yarn && yarn start"
    environment:
      - PORT=6602
      - DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
      - INTERNAL_SHARED_SECRET=dev-internal-secret
    depends_on: [postgres]

  data-service:
    image: node:20
    working_dir: /app
    command: sh -c "yarn && yarn start"
    environment:
      - PORT=6603
      - DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
      - INTERNAL_SHARED_SECRET=dev-internal-secret
      - AUTH_VALIDATE_URL=http://auth-service:6601/internal/validate
    depends_on: [postgres]

  dim-service:
    image: node:20
    working_dir: /app
    command: sh -c "yarn && yarn start"
    environment:
      - PORT=6604
      - DATABASE_URL=postgres://app:app@postgres:5432/sales_forecast
      - INTERNAL_SHARED_SECRET=dev-internal-secret
      - AUTH_VALIDATE_URL=http://auth-service:6601/internal/validate
    depends_on: [postgres]
```

> Note: Bind mounts and project code wiring depend on repo layout; above is template.

### Run
```
docker compose -f docker-compose.infra.yml up -d
docker compose -f docker-compose.apps.yml up -d
```

### Networks & Secrets (suggested)
- Single default network is fine for dev; create `internal` network for prod to hide services
- Use Docker secrets or `.env` mounted as read-only in prod

### Healthchecks (suggested)
- Add `healthcheck` to services with `/health` endpoint

### Envs
- Per-service `.env.example` in each service folder
- Service-to-service validation:
  - Set `AUTH_VALIDATE_URL=http://auth-service:6601/internal/validate` on consumers (data-service, dim-service)
  - Set `INTERNAL_SHARED_SECRET` on both producer (auth-service) and consumers identically

### Local dev (ESM scripts)
- Services run with Node ESM loader for ts-node during dev, e.g. `node --loader ts-node/esm --experimental-specifier-resolution=node src/server.ts`
- Use `yarn dev` scripts already configured in each service


