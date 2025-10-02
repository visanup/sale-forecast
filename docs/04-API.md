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