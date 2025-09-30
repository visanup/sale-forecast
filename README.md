Sales Forecast Platform — Quickstart

Run Postgres:
```
docker compose -f docker-compose.infra.yml up -d
```

Run services (dev images build):
```
docker compose -f docker-compose.apps.yml up -d --build
```

Or run a single service locally:
```
cd services/api-gateway && yarn && yarn dev
```

Docs: see `docs/00-Overview.md` → numbered docs.

