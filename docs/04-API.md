## Public API (direct to services)

Document ID: API-04

Scope: External contract, versioning, pagination, errors, rate limits

Audience: Backend & Frontend engineers, external consumers

Base URLs (dev):
- auth-service: `http://localhost:6601`
- ingest-service: `http://localhost:6602`
- data-service: `http://localhost:6603`
- dim-service: `http://localhost:6604`

All data/dim endpoints require header `X-API-Key: <key>`

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

Internal validation (service-to-service):
```
POST /internal/validate
  headers: X-Internal-Secret: <shared-secret>
  body:    { "apiKey": "..." }
  resp:    { "valid": boolean, "clientId": string, "scope": string[]|string }
```

### Dimensions (dim-service)
```
GET /v1/dim/companies
GET /v1/dim/depts
GET /v1/dim/distribution-channels
GET /v1/dim/materials
GET /v1/dim/skus
GET /v1/dim/sales-orgs
GET /v1/dim/months
```

Query params: `q` (search), `limit`, `cursor` for pagination.

### Versioning
- URI versioning: `/v1/...` (increment on breaking changes)

### Pagination
- Cursor-based: response shape `{ data, paging: { next } }`
- Request with `?cursor=<token>&limit=50`

### Ingestion (ingest-service)
```
POST /v1/upload
  multipart/form-data: { file: xlsx|csv, anchorMonth: yyyy-MM }

POST /v1/manual
  JSON: {
    anchorMonth: "2025-09",
    lines: [
      {
        company_code, dept_code, dc_code,
        division, sales_organization, sales_office, sales_group, sales_representative,
        material_code, pack_size, uom_code,
        months: [{ month: "2025-09", qty: number, price?: number }]
      }
    ]
  }
```

### Data Service (data-service)
```
GET /v1/forecast
  params: company, dept, dc, material, skuId, salesOrgId,
          from (yyyy-MM), to (yyyy-MM), run (latest|id)

GET /v1/forecast/aggregate
  params: group (comma list: company,dept,dc,material,sku,month,run),
          metric (forecast_qty|revenue_snapshot), from, to, run

GET /v1/prices
  params: company, skuId, from, to
```

### Error Model
```
{ "error": { "code": "BAD_REQUEST", "message": "..." } }
```

### Rate Limits
- Default 600 req/min per API Key

### Headers
- `X-API-Key`: required for all data/dim endpoints
- `Content-Type: application/json` for JSON endpoints


