## Architecture & Microservices

Document ID: ARCH-01

Scope: System overview, services, comms, security, observability

Audience: All engineers, architects

### Microservices
- auth-service (6601): User auth, API Key lifecycle, validation
- ingest-service (6602): Excel/CSV upload, validation, upsert dims, create runs, insert facts
- data-service (6603): Query forecast/prices/aggregates (read-only)
- dim-service (6604): Read-only dimension lookups for FE selects

Shared Postgres database for MVP (single DB). Future: split per service or use schemas.

### Communication
- REST over HTTP inside docker compose network
- Services call `auth-service` `/internal/validate` to validate `X-API-Key`

### Ports
Start from 6601 (no gateway): 6601–6604.

### Security
- Store only API key hashes
- Rate limit per API Key and IP
- CORS restricted to FE domain

### Observability
- pino logging (JSON)
- Optional /metrics endpoint for Prometheus


