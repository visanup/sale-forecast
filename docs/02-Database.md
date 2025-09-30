## Database Design (PostgreSQL 18)

Document ID: DB-02

Scope: Schema, keys, mapping from Excel, indexing, seed

Audience: Backend engineers, DBAs

### Rationale
- Long format facts keyed by month for flexible horizons
- Separate dimensions for FE selects and normalization
- `forecast_run` for versioning per upload/manual save

### Tables Overview
- Dimensions: `dim_company`, `dim_dept`, `dim_distribution_channel`, `dim_uom`, `dim_material`, `dim_sku`, `dim_sales_org`, `dim_month`
- Facts: `fact_price`, `fact_forecast`
- Control: `forecast_run`, `api_clients`, `api_keys`, `staging_forecast_uploads`

### DDL (summary)
อ้างอิงรายละเอียดฉบับเต็มใน `README.md` ส่วน DDL

### Mapping from the single input table
- dept → `dim_dept.dept_code`
- company_desc/company_code → `dim_company`
- material/material_desc → `dim_material`
- pack_size + unit → `dim_sku` joins `dim_uom`
- forecast_n-2 … forecast_n+2 → แตกเป็นหลายแถวของ `fact_forecast` ตามเดือนจริง
- price → ใช้เป็น snapshot ใน `fact_forecast.unit_price_snapshot` และ optionally insert `fact_price`
- division, sale_organization, sale_office, sale_group, sale_representative → `dim_sales_org`
- Distribution Channel → `dim_distribution_channel`

### Keys
- `fact_forecast`: `(run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id)`
- `fact_price`: `(company_id, sku_id, month_id)`

### Seed Suggestions
- Pre-generate `dim_month` for 5–10 ปี

### Indexing
- `idx_fact_forecast_month`, `idx_fact_forecast_company`, `idx_fact_forecast_sku`
- Partial index for active api_keys
 - Consider composite indexes matching query patterns, e.g. `(company_id, month_id)`, `(sku_id, month_id)`

### Recommended DDL (with constraints)
The following DDL extends the MVP with `NOT NULL`, `CHECK` constraints, and helpful indexes:

```
-- === DIMENSIONS ===
CREATE TABLE IF NOT EXISTS dim_company (
  company_id BIGSERIAL PRIMARY KEY,
  company_code TEXT NOT NULL UNIQUE,
  company_desc TEXT
);

CREATE TABLE IF NOT EXISTS dim_dept (
  dept_id BIGSERIAL PRIMARY KEY,
  dept_code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dim_distribution_channel (
  dc_id BIGSERIAL PRIMARY KEY,
  dc_code TEXT NOT NULL UNIQUE,
  dc_desc TEXT
);

CREATE TABLE IF NOT EXISTS dim_uom (
  uom_id BIGSERIAL PRIMARY KEY,
  uom_code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dim_material (
  material_id BIGSERIAL PRIMARY KEY,
  material_code TEXT NOT NULL UNIQUE,
  material_desc TEXT
);

CREATE TABLE IF NOT EXISTS dim_sku (
  sku_id BIGSERIAL PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES dim_material(material_id) ON DELETE RESTRICT,
  pack_size TEXT NOT NULL,
  uom_id BIGINT NOT NULL REFERENCES dim_uom(uom_id) ON DELETE RESTRICT,
  UNIQUE(material_id, pack_size, uom_id)
);

-- Sales org hierarchy kept in one table for MVP
CREATE TABLE IF NOT EXISTS dim_sales_org (
  sales_org_id BIGSERIAL PRIMARY KEY,
  division TEXT,
  sales_organization TEXT,
  sales_office TEXT,
  sales_group TEXT,
  sales_representative TEXT,
  UNIQUE(division, sales_organization, sales_office, sales_group, sales_representative)
);

CREATE TABLE IF NOT EXISTS dim_month (
  month_id DATE PRIMARY KEY,
  yyyy_mm TEXT NOT NULL UNIQUE
);

-- === FACTS & RUNS ===
CREATE TABLE IF NOT EXISTS forecast_run (
  run_id BIGSERIAL PRIMARY KEY,
  anchor_month DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  method TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS fact_price (
  company_id BIGINT NOT NULL REFERENCES dim_company(company_id) ON DELETE RESTRICT,
  sku_id BIGINT NOT NULL REFERENCES dim_sku(sku_id) ON DELETE RESTRICT,
  month_id DATE NOT NULL REFERENCES dim_month(month_id) ON DELETE RESTRICT,
  price NUMERIC(18,4) NOT NULL CHECK (price >= 0),
  PRIMARY KEY (company_id, sku_id, month_id)
);

CREATE TABLE IF NOT EXISTS fact_forecast (
  run_id BIGINT NOT NULL REFERENCES forecast_run(run_id) ON DELETE RESTRICT,
  company_id BIGINT NOT NULL REFERENCES dim_company(company_id) ON DELETE RESTRICT,
  dept_id BIGINT NOT NULL REFERENCES dim_dept(dept_id) ON DELETE RESTRICT,
  sku_id BIGINT NOT NULL REFERENCES dim_sku(sku_id) ON DELETE RESTRICT,
  sales_org_id BIGINT NOT NULL REFERENCES dim_sales_org(sales_org_id) ON DELETE RESTRICT,
  dc_id BIGINT NOT NULL REFERENCES dim_distribution_channel(dc_id) ON DELETE RESTRICT,
  month_id DATE NOT NULL REFERENCES dim_month(month_id) ON DELETE RESTRICT,

  forecast_qty NUMERIC(18,4) NOT NULL CHECK (forecast_qty >= 0),
  unit_price_snapshot NUMERIC(18,4) CHECK (unit_price_snapshot IS NULL OR unit_price_snapshot >= 0),
  revenue_snapshot NUMERIC(18,4) CHECK (revenue_snapshot IS NULL OR revenue_snapshot >= 0),

  PRIMARY KEY (run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_fact_forecast_month ON fact_forecast(month_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_company ON fact_forecast(company_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_sku ON fact_forecast(sku_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_company_month ON fact_forecast(company_id, month_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_sku_month ON fact_forecast(sku_id, month_id);
```

### Optional: Price as SCD (valid_from/valid_to)
If price needs historical ranges, use a Slowly Changing Dimension style:

```
CREATE TABLE IF NOT EXISTS fact_price_scd (
  company_id BIGINT NOT NULL REFERENCES dim_company(company_id) ON DELETE RESTRICT,
  sku_id BIGINT NOT NULL REFERENCES dim_sku(sku_id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL,
  valid_to   DATE,
  price NUMERIC(18,4) NOT NULL CHECK (price >= 0),
  PRIMARY KEY (company_id, sku_id, valid_from)
);
```

### Prisma & Seeding (quickstart)

Prisma setup snippet:
```
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
```

Model highlights:
```
model dim_month {
  month_id DateTime @id @db.Date
  yyyy_mm  String   @unique
}

model forecast_run {
  run_id       BigInt   @id @default(autoincrement()) @db.BigInt
  anchor_month DateTime @db.Date
  created_at   DateTime @default(now())
}

model fact_forecast {
  run_id       BigInt
  company_id   BigInt
  dept_id      BigInt
  sku_id       BigInt
  sales_org_id BigInt
  dc_id        BigInt
  month_id     DateTime @db.Date
  forecast_qty        Decimal  @db.Decimal(18, 4)
  unit_price_snapshot Decimal? @db.Decimal(18, 4)
  revenue_snapshot    Decimal? @db.Decimal(18, 4)

  @@id([run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id])
}
```

Seed months example:
```
for (let d = start; d <= end; d = addMonths(d,1)) {
  await prisma.dim_month.upsert({
    where: { month_id: d },
    update: {},
    create: { month_id: d, yyyy_mm: format(d, "yyyy-MM") },
  });
}
```

Recommended SQL index (manual migration):
```
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys(client_id)
  WHERE revoked_at IS NULL;
```


