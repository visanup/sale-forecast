## API Specification

# ตัวอย่างพื้นฐาน (กรณีมี API key)
curl -H "X-API-Key: <your-api-key>" "http://localhost:6603/v1/audit-logs?endpoint=/v1/saleforecast&limit=20"

# ดึง forecast all
curl -H "X-API-Key: <your-api-key>" http://localhost:6603/v1/forecast

# ดึง auth-service 10 ตัวล่าสุด
curl -H "X-API-Key: <your-api-key>" "http://localhost:6603/v1/logs?limit=10"

# ดึง forecast by month
curl -H "X-API-Key: <your-api-key>" "http://localhost:6603/v1/saleforecast?anchor_month=2025-03"

# ดึง forecast by month, company_code, material_code
curl -H "X-API-Key: <your-api-key>" "http://localhost:6603/v1/saleforecast?anchor_month=2025-03&company_code=1001&material_code=SKU-123"


your-api-key = sf_c2ac6bb38a2fb2cb5e931b148c181df4f590ef7627efe99e5d0c1117ae0e024e