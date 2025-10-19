## Public API (Direct to Services)

Document ID: API-04

Scope: External contract, versioning, pagination, errors, rate limits, logging endpoints

Audience: Backend & Frontend engineers, external consumers

## 🌐 Base URLs

### Development
- **Auth Service**: `http://localhost:6601`
- **Ingest Service**: `http://localhost:6602`
- **Data Service**: `http://localhost:6603`
- **DIM Service**: `http://localhost:6604`
- **Frontend**: `http://localhost:6600`

### Docker Environment
- **Auth Service**: `http://auth-service:6601`
- **Ingest Service**: `http://ingest-service:6602`
- **Data Service**: `http://data-service:6603`
- **DIM Service**: `http://dim-service:6604`
- **Frontend**: `http://frontend:6600`

## 🔐 Authentication

### User Authentication (Bearer Token)
For user-related operations:
```http
Authorization: Bearer <jwt-token>
```

### Service Authentication (API Key)
For all data/dim endpoints:
```http
X-API-Key: <api-key>
```

### Internal Service Validation
Service-to-service communication:
```http
POST /internal/validate
Headers:
  X-Internal-Secret: <shared-secret>
  Content-Type: application/json

Body:
{
  "apiKey": "sf_4e77abfe2e799431a21a9bf586f2a67fb518910e2f1b50c346b3b80fb9bdf5ca"
}

Response:
{
  "valid": true,
  "clientId": "client-123",
  "scope": ["read", "write"]
}
```

## 🔑 Auth Service API (Port 6601)

### User Authentication
```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### API Key Management
```http
GET    /api/v1/api-keys          # List user's API keys
POST   /api/v1/api-keys          # Create new API key
DELETE /api/v1/api-keys/:id      # Revoke API key
PUT    /api/v1/api-keys/:id      # Update API key
```

### User Profile
```http
GET    /api/v1/profile           # Get user profile
PUT    /api/v1/profile           # Update user profile
```

### Health Check
```http
GET    /health                   # Service health status
```

## 📊 Data Service API (Port 6603)

### Forecasting
```http
GET /v1/forecast
Parameters:
  - company: string
  - dept: string
  - dc: string
  - material: string
  - skuId: string
  - salesOrgId: string
  - from: yyyy-MM
  - to: yyyy-MM
  - run: latest|id

GET /v1/forecast/aggregate
Parameters:
  - group: comma-separated list (company,dept,dc,material,sku,month,run)
  - metric: forecast_qty|revenue_snapshot
  - from: yyyy-MM
  - to: yyyy-MM
  - run: latest|id
```

### Sales Forecast Records
```http
GET /v1/saleforecast
Parameters (query):
  - anchor_month*: yyyy-MM
  - company_code: string
  - company_desc: string
  - material_code: string
  - material_desc: string

Responses include a list of persisted sales-forecast snapshots. Records are created automatically whenever the ingest
service (manual submission or Excel upload) processes a line, and the same store can be backfilled from historical
`fact_forecast` data so the Preview History tab in the UI mirrors the values returned here.

Example (API key):
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:6603/v1/saleforecast?anchor_month=2025-03&company_code=1001&material_code=SKU-123"
```

```json
{
  "data": [
    {
      "id": "42",
      "anchor_month": "2025-01",
      "company_code": "1001",
      "company_desc": "Betagro",
      "material_code": "MAT-001",
      "material_desc": "Frozen Chicken",
      "forecast_qty": 1200.5,
      "metadata": {
        "version": 1,
        "source": "upload",
        "run_id": "45",
        "months": [
          { "month": "2024-11", "qty": 1100, "price": 88.5 },
          { "month": "2024-12", "qty": 1150 }
        ],
        "dept_code": "D01",
        "dc_code": "01",
        "division": "Poultry",
        "sales_organization": "TH01",
        "sales_office": "BKK",
        "sales_group": "NORTH",
        "sales_representative": "emp-123",
        "pack_size": "10 KG",
        "uom_code": "KG",
        "fact_rows_inserted": 6,
        "dim_ids": {
          "company_id": "12",
          "dept_id": "8",
          "sku_id": "874",
          "sales_org_id": "53",
          "dc_id": "17"
        }
      },
      "created_at": "2025-10-18T04:35:12.120Z",
      "updated_at": "2025-10-18T04:35:12.120Z"
    }
  ],
  "paging": { "next": null }
}
```

The `metadata` object is intentionally flexible, but the current producer (ingest service) emits:

- `version`: schema version for forward compatibility.
- `source`: `"upload"`, `"manual"`, or `"backfill"` (when generated from legacy `fact_forecast` rows).
- `run_id`: ingest `forecast_run` identifier.
- `months`: the month/quantity (and optional price) pairs derived from the uploaded sheet or manual entry.
- Optional dimensional hints (`dept_code`, `dc_code`, `division`, `sales_*`) and product descriptors (`pack_size`, `uom_code`).
- `fact_rows_inserted`: number of `fact_forecast` rows that were written for this line.
- `dim_ids`: the dimension table identifiers that anchor the related fact data.

POST /v1/saleforecast
Body (json):
{
  "anchor_month": "yyyy-MM",
  "company_code": "string",
  "company_desc": "string",
  "material_code": "string",
  "material_desc": "string",
  "forecast_qty": number,
  "metadata": { "key": "value" }
}

PUT /v1/saleforecast/:recordId
Body (json):
{
  "anchor_month": "yyyy-MM",
  "company_code": "string",
  "company_desc": "string",
  "material_code": "string",
  "material_desc": "string",
  "forecast_qty": number,
  "metadata": { "key": "value" }
}

DELETE /v1/saleforecast/:recordId
```

#### Parameter Rules
- `anchor_month` comes from `forecast_run.anchor_month` and is required for all GET, POST, and PUT requests. The value must be a valid month start date (`yyyy-MM`).
- `company_code` and `company_desc` reference the `dim_company` table and are optional filters or attributes.
- `material_code` and `material_desc` reference the `dim_material` table and are optional filters or attributes.

#### Responses
- `GET /v1/saleforecast` returns an array of forecast records filtered by the provided criteria.
- `POST /v1/saleforecast` returns the created record with its generated identifier.
- `PUT /v1/saleforecast/:recordId` returns the updated record.
- `DELETE /v1/saleforecast/:recordId` returns a confirmation payload indicating the record was removed.

#### Audit Logging
Every `GET`, `POST`, `PUT`, and `DELETE` request to the `/v1/saleforecast` endpoints must write an entry to the `audit_logs` table with at least:
```json
{
  "service": "data-service",
  "endpoint": "/v1/saleforecast",
  "action": "GET|POST|PUT|DELETE",
  "record_id": "<recordId>",
  "performed_by": "<user or apiKey>",
  "performed_at": "2025-01-20T10:30:00Z"
}
```
The `action` column captures the HTTP verb to show who performed what operation in the application.

Example entry when a request is made with an API key:
```json
{
  "service": "data-service",
  "endpoint": "/v1/saleforecast",
  "action": "GET",
  "record_id": null,
  "performed_by": "apiKey:sf_client_123",
  "performed_at": "2025-03-05T09:12:44Z"
}
```

### Audit Logs
```http
GET /v1/audit-logs
Parameters (query):
  - service: string
  - endpoint: string
  - action: string
  - performed_by: string
  - since: ISO 8601 timestamp
  - until: ISO 8601 timestamp
  - limit: number (default: 100, max: 500)
  - cursor: string (audit log id for pagination)
```

Returns audit trail entries captured in the `audit_logs` table. Results are ordered by most recent (`id` descending). The optional filters allow narrowing the data to a specific service or endpoint, or to a time window using `since`/`until`. Use `cursor` to page through older records by passing the `paging.next` value from the previous response.

Example (API key):
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:6603/v1/audit-logs?endpoint=/v1/saleforecast&limit=20"
```

Response:
```json
{
  "data": [
    {
      "id": "72",
      "service": "data-service",
      "endpoint": "/v1/saleforecast",
      "action": "GET",
      "record_id": null,
      "performed_by": "static-key",
      "metadata": {
        "query": {
          "anchor_month": "2025-10"
        },
        "resultCount": 3
      },
      "performed_at": "2025-10-18T12:03:53.247Z"
    }
  ],
  "paging": {
    "next": "71"
  }
}
```

### Forecast Runs
```http
GET /v1/forecast-runs
Parameters (query):
  - anchor_month*: yyyy-MM
  - company_code: string
  - company_desc: string
  - material_code: string
  - material_desc: string
```

Retrieves forecast metadata keyed by the run anchor month. The `anchor_month` parameter is required and maps directly to `forecast_run.anchor_month`. Optional filters align with dimension attributes so consumers can narrow the result set to specific companies (`dim_company.company_code`, `dim_company.company_desc`) or materials (`dim_material.material_code`, `dim_material.material_desc`).

Responses include the list of available runs along with any derived summary data needed by the sales forecast UI.

### Pricing
```http
GET /v1/prices
Parameters:
  - company: string
  - skuId: string
  - from: yyyy-MM
  - to: yyyy-MM
```

### 📋 Logging Endpoints (New)
```http
GET /v1/logs
Parameters:
  - limit: number (default: 100, max: 1000)
  - service: string (auth-service|data-service|dim-service|ingest-service)
  - level: string (error|warn|info|debug)
  - since: ISO 8601 timestamp
  - cursor: string (for pagination)

Response:
{
  "data": [
    {
      "id": "stream-id",
      "timestamp": "2025-01-20T10:30:00Z",
      "level": "info",
      "service": "auth-service",
      "message": "User logged in successfully",
      "data": {
        "userId": 123,
        "ip": "192.168.1.100"
      },
      "requestId": "req-123"
    }
  ],
  "paging": {
    "next": "next-cursor-token",
    "hasMore": true
  }
}

GET /v1/logs/stats
Response:
{
  "totalLogs": 1500,
  "services": {
    "auth-service": 450,
    "data-service": 380,
    "dim-service": 320,
    "ingest-service": 350
  },
  "levels": {
    "error": 25,
    "warn": 150,
    "info": 1200,
    "debug": 125
  },
  "timeRange": {
    "from": "2025-01-20T00:00:00Z",
    "to": "2025-01-20T23:59:59Z"
  }
}

DELETE /v1/logs
Response:
{
  "message": "All logs cleared successfully",
  "clearedCount": 1500
}
```

### Health Check
```http
GET /health
```

## 🏗️ DIM Service API (Port 6604)

### Dimension Data
```http
GET /v1/dim/companies
GET /v1/dim/depts
GET /v1/dim/distribution-channels
GET /v1/dim/materials
GET /v1/dim/skus
GET /v1/dim/sales-orgs
GET /v1/dim/months
```

### Query Parameters
- `q`: Search term
- `limit`: Number of results (default: 50, max: 1000)
- `cursor`: Pagination token

### Response Format
```json
{
  "data": [
    {
      "id": "company-001",
      "code": "COMP001",
      "name": "Company Name",
      "active": true
    }
  ],
  "paging": {
    "next": "next-cursor-token",
    "hasMore": true
  }
}
```

### Health Check
```http
GET /health
```

## 📥 Ingest Service API (Port 6602)

### File Upload
```http
POST /v1/upload
Content-Type: multipart/form-data

Form Data:
- file: Excel/CSV file
- anchorMonth: yyyy-MM format

Response:
{
  "success": true,
  "message": "File processed successfully",
  "data": {
    "runId": "run-123",
    "processedRows": 150,
    "errors": [],
    "warnings": []
  }
}
```

### Manual Data Entry
```http
POST /v1/manual
Content-Type: application/json

Body:
{
  "anchorMonth": "2025-09",
  "lines": [
    {
      "company_code": "COMP001",
      "dept_code": "DEPT001",
      "dc_code": "DC001",
      "division": "DIV001",
      "sales_organization": "SO001",
      "sales_office": "OFF001",
      "sales_group": "SG001",
      "sales_representative": "SR001",
      "material_code": "MAT001",
      "pack_size": "12",
      "uom_code": "EA",
      "months": [
        {
          "month": "2025-09",
          "qty": 100,
          "price": 25.50
        }
      ]
    }
  ]
}
```

### Health Check
```http
GET /health
```

## 📋 API Versioning

### Versioning Strategy
- **URI Versioning**: `/v1/...` (increment on breaking changes)
- **Current Version**: v1
- **Backward Compatibility**: Maintained for at least 6 months

### Breaking Changes
- Removing endpoints
- Changing response structure
- Changing required parameters
- Changing authentication requirements

### Non-Breaking Changes
- Adding new endpoints
- Adding optional parameters
- Adding new response fields
- Adding new error codes

## 📄 Pagination

### Cursor-Based Pagination
```json
{
  "data": [...],
  "paging": {
    "next": "eyJpZCI6MTIzfQ==",
    "hasMore": true,
    "total": 1000
  }
}
```

### Usage
```http
GET /v1/dim/companies?cursor=eyJpZCI6MTIzfQ==&limit=50
```

## ⚠️ Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "anchorMonth",
      "reason": "Invalid date format"
    },
    "requestId": "req-123",
    "timestamp": "2025-01-20T10:30:00Z"
  }
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **429**: Too Many Requests
- **500**: Internal Server Error

### Error Codes
- `BAD_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Data validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## 🚦 Rate Limiting

### Limits
- **Default**: 600 requests/minute per API key
- **Burst**: 100 requests in 10 seconds
- **Logs API**: 100 requests/minute (more restrictive)

### Rate Limit Headers
```http
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "retryAfter": 60
  }
}
```

## 📋 Request/Response Headers

### Required Headers
```http
X-API-Key: <api-key>           # For data/dim endpoints
Content-Type: application/json # For JSON endpoints
Authorization: Bearer <token>  # For user endpoints
```

### Optional Headers
```http
X-Request-ID: <uuid>           # For request tracing
Accept: application/json       # Response format
User-Agent: <app-name>/<version> # Client identification
```

### Response Headers
```http
Content-Type: application/json
X-Request-ID: <uuid>
X-Response-Time: 150ms
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
```

## 🔍 API Documentation

### Interactive Documentation
- **Auth Service**: http://localhost:6601/docs
- **Data Service**: http://localhost:6603/docs
- **DIM Service**: http://localhost:6604/docs
- **Ingest Service**: http://localhost:6602/docs

### OpenAPI Specifications
Each service provides OpenAPI 3.0 specifications:
- **Auth Service**: `/openapi.json`
- **Data Service**: `/openapi.json`
- **DIM Service**: `/openapi.json`
- **Ingest Service**: `/openapi.json`

## 🧪 Testing

### API Testing Examples
```bash
# Test auth service
curl -X GET http://localhost:6601/health

# Test data service with API key
curl -H "X-API-Key: your-api-key" http://localhost:6603/v1/forecast

# Test logs endpoint
curl -H "X-API-Key: your-api-key" "http://localhost:6603/v1/logs?limit=10&service=auth-service"

# Test ingest service
curl -H "X-API-Key: your-api-key" -F "file=@data.xlsx" -F "anchorMonth=2025-09" http://localhost:6602/v1/upload
```

### Postman Collection
A Postman collection is available for API testing with pre-configured requests and environment variables.

## 🔐 Security Best Practices

### API Key Management
- Store API keys securely
- Rotate keys regularly
- Use least privilege principle
- Monitor key usage

### Request Security
- Always use HTTPS in production
- Validate all input parameters
- Implement proper CORS policies
- Use request ID for tracing

### Error Handling
- Don't expose sensitive information in errors
- Log errors securely
- Implement proper error monitoring
- Use structured error responses
