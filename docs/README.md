# Sales Forecast Data‑Service — README

**Stack**: FE — React + TypeScript + Vite + Tailwind (yarn)  •  BE — Node.js + TypeScript + Express (yarn) + prisma •  DB — PostgreSQL (14+; target 18)

> เป้าหมาย: เก็บ/ให้บริการข้อมูล *Sales Forecast* อย่างยืดหยุ่น ใช้ได้ทั้งอัปโหลด Excel และกรอกผ่านหน้าเว็บ พร้อม Data‑Service API ที่ผู้อื่นเรียกใช้งานได้ด้วย API Key

---

## TL;DR

* เก็บข้อมูลแบบ **star schema (long format)**: หนึ่งแถวต่อ 1 SKU × 1 เดือน × 1 ชุดมิติ (company/dept/sales org/DC) × 1 *forecast run*.
* FE ทำได้ 2 วิธี: **Upload Excel** ตาม template และ **Manual Entry** (ช่องเลือกผูกกับตาราง dim).
* มี **Data‑Service API** ปลอดภัยด้วย **API Key** (สร้าง/เพิกถอนผ่านหน้า FE) เพื่อให้ภายนอกรวบรวม/ดึงข้อมูลได้
* รองรับ versioning (เปรียบเทียบ *runs*) และ snapshot ราคา ณ เวลาสร้าง forecast

---

## สถาปัตยกรรม (ภาพรวม)

```mermaid
flowchart LR
  subgraph FE[FE: React+Vite+Tailwind]
    U[Upload Excel]
    M[Manual Entry Form]
    K[API Key Console]
    B[Data Browser]
  end

  subgraph BE[BE: Node TS Express]
    V[Validator & Parser]
    I[Ingestion Service]
    DS[Data-Service API]
    AK[API Key Service]
  end

  subgraph DB[(PostgreSQL)]
    DIMS[(Dimensions)]
    FACTS[(Forecast/Price Facts)]
    RUNS[(forecast_run)]
    AUTH[(api_clients/api_keys)]
    STG[(staging_uploads)]
  end

  U -- xlsx/csv --> V --> I --> STG --> I --> DIMS
  I --> RUNS
  I --> FACTS
  M --> I
  K --> AK --> AUTH
  B --> DS --> DB
```

---

## เอกสารแยกส่วน

เริ่มต้นอ่านที่ `docs/00-Overview.md` จากนั้นตามลำดับใน `docs/00-Docs-Index.md`:

* 01-Architecture — `docs/01-Architecture.md`
* 02-Database — `docs/02-Database.md`
* 03-Backend Services — `docs/03-Backend-Services.md`
* 04-APIs — `docs/04-API.md`
* 05-Frontend — `docs/05-Frontend.md`
* 06-DevOps — `docs/06-DevOps.md`

## แบบจำลองข้อมูล (MVP)

> หลัก: แยก **มิติ (dim)** ออกจาก **ข้อเท็จจริง (fact)** และใช้ `forecast_run` ทำ versioning

### Dimensions (Master)

* `dim_company(company_id, company_code, company_desc)`
* `dim_dept(dept_id, dept_code)`  ← จากคอลัมน์ **หน่วยงาน**
* `dim_distribution_channel(dc_id, dc_code, dc_desc)`  ← จาก **Distribution Channel**
* `dim_uom(uom_id, uom_code)` ← จาก **หน่วย** (EA/KG/…)
* `dim_material(material_id, material_code, material_desc)` ← จาก **SAP Code / ชื่อสินค้า**
* `dim_sku(sku_id, material_id, pack_size, uom_id)`  ← จาก **Pack Size + หน่วย** (1 วัสดุมีหลายแพ็คได้)
* `dim_sales_org(sales_org_id, division, sales_organization, sales_office, sales_group, sales_representative)`
* `dim_month(month_id DATE PK, yyyy_mm)`  ← ใช้วันที่ 1 ของเดือนเป็นคีย์

### Facts

* `forecast_run(run_id PK, anchor_month DATE, created_at, method, notes)`
* `fact_price(company_id, sku_id, month_id, price)` PK (company_id, sku_id, month_id)
* `fact_forecast(run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id, forecast_qty, unit_price_snapshot, revenue_snapshot)`
  **PK** `(run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id)`

### ทำไมต้อง long format?

* ไม่ล็อกกับคอลัมน์ `n-2 … n+3` เปลี่ยน horizon ได้ง่าย
* Query รายเดือน/ช่วงวันที่ยืดหยุ่น, ทำ aggregate ได้สะดวก, ใช้ BI ง่าย

---

## DDL (PostgreSQL) — MVP

> ใช้ได้กับ ORM/Query builder อะไรก็ได้ (Prisma/Kysely/Knex) หรือรัน SQL ตรง ๆ

```sql
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
  material_id BIGINT NOT NULL REFERENCES dim_material(material_id),
  pack_size TEXT NOT NULL,
  uom_id BIGINT NOT NULL REFERENCES dim_uom(uom_id),
  UNIQUE(material_id, pack_size, uom_id)
);

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
  company_id BIGINT NOT NULL REFERENCES dim_company(company_id),
  sku_id BIGINT NOT NULL REFERENCES dim_sku(sku_id),
  month_id DATE NOT NULL REFERENCES dim_month(month_id),
  price NUMERIC(18,4) NOT NULL,
  PRIMARY KEY (company_id, sku_id, month_id)
);

CREATE TABLE IF NOT EXISTS fact_forecast (
  run_id BIGINT NOT NULL REFERENCES forecast_run(run_id),
  company_id BIGINT NOT NULL REFERENCES dim_company(company_id),
  dept_id BIGINT NOT NULL REFERENCES dim_dept(dept_id),
  sku_id BIGINT NOT NULL REFERENCES dim_sku(sku_id),
  sales_org_id BIGINT NOT NULL REFERENCES dim_sales_org(sales_org_id),
  dc_id BIGINT NOT NULL REFERENCES dim_distribution_channel(dc_id),
  month_id DATE NOT NULL REFERENCES dim_month(month_id),

  forecast_qty NUMERIC(18,4) NOT NULL,
  unit_price_snapshot NUMERIC(18,4),
  revenue_snapshot NUMERIC(18,4),

  PRIMARY KEY (run_id, company_id, dept_id, sku_id, sales_org_id, dc_id, month_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_forecast_month ON fact_forecast(month_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_company ON fact_forecast(company_id);
CREATE INDEX IF NOT EXISTS idx_fact_forecast_sku ON fact_forecast(sku_id);
```

## Prisma (ORM) — Setup & Usage

> หากเลือกใช้ Prisma ให้ยึดแนวคิดสคีมาตามด้านบน (dims/facts/runs/auth/staging) แต่ประกาศผ่าน `schema.prisma` แทน DDL SQL ตรง ๆ เพื่อให้จัดการ migration และ type‑safe ได้ง่ายขึ้น

### ติดตั้งและเริ่มต้น

```bash
yarn add -D prisma
yarn add @prisma/client
npx prisma init
```

ตั้งค่า `DATABASE_URL` ใน `.env` ให้ชี้ไปยัง Postgres ของโปรเจกต์

### ไฮไลต์สำคัญใน `schema.prisma`

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
```

* ชนิดวันรายเดือนให้ใช้ `@db.Date` กับ `month_id` และ `anchor_month`
* คีย์ผสมใน `fact_forecast` ให้ใช้ `@@id([...])` และความสัมพันธ์หลายฟิลด์ด้วย `@relation(fields:[...], references:[...])`
* จะใช้ชื่อตารางแบบ `snake_case` เป็น **ชื่อโมเดล** ตรง ๆ (เช่น `fact_forecast`) หรือจะใช้ **CamelCase** แล้ว map ไปตารางเดิมก็ได้ เช่น `@@map("fact_forecast")`

**ตัวอย่างบางส่วน**

```prisma
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
  @@index([month_id], map: "idx_fact_forecast_month")
}
```

### Migration & Partial Index

สร้างตารางด้วย:

```bash
npx prisma migrate dev --name init
```

> Prisma ยังไม่รองรับ **partial index** ในสคีมา ให้เพิ่มด้วย SQL migration แยกต่างหาก (แก้ไฟล์ `migration.sql` ที่ Prisma สร้างให้):

```sql
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys(client_id)
  WHERE revoked_at IS NULL;
```

### การใช้งานในโค้ด

**Client**

```ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

**ตรวจ API Key**

```ts
const key = req.header("X-API-Key");
if (!key) return res.status(401).json({ error: { code: "UNAUTHORIZED" } });
const hash = await hashApiKey(key); // argon2/bcrypt
const rec = await prisma.api_keys.findFirst({
  where: { api_key_hash: hash, revoked_at: null, client: { is_active: true } },
  include: { client: true },
});
if (!rec) return res.status(401).json({ error: { code: "UNAUTHORIZED" } });
```

**Ingestion (ธุรกรรมเดียว)**

```ts
await prisma.$transaction(async (tx) => {
  await tx.dim_material.createMany({ data: materials, skipDuplicates: true });
  await tx.dim_uom.createMany({ data: uoms, skipDuplicates: true });
  await tx.dim_sku.createMany({ data: skus, skipDuplicates: true });

  const run = await tx.forecast_run.create({ data: { anchor_month, method: "upload", notes } });

  // แปลง n±k เป็น month จริงแล้วเตรียม rows
  await tx.fact_forecast.createMany({ data: rows, skipDuplicates: true }); // insert‑only
});
```

> ต้องการ **update เมื่อซ้ำ** ให้ใช้ `$executeRaw` แบบ `INSERT ... ON CONFLICT ... DO UPDATE` เพื่ออัปเดต `forecast_qty`/`unit_price_snapshot`/`revenue_snapshot` ตาม composite key

**Aggregate Query ตัวอย่าง**

```ts
const rows = await prisma.$queryRaw<any[]>`
  SELECT c.company_code, m.month_id, SUM(f.revenue_snapshot) AS revenue
  FROM fact_forecast f
  JOIN dim_company c ON c.company_id = f.company_id
  JOIN dim_month   m ON m.month_id   = f.month_id
  WHERE m.month_id BETWEEN ${from} AND ${to}
  GROUP BY 1,2
  ORDER BY 2,1;
`;
```

### Seeding ที่ควรมี

* สร้าง `dim_month` ล่วงหน้า (ช่วงปีที่ต้องใช้):

```ts
for (let d = start; d <= end; d = addMonths(d,1)) {
  await prisma.dim_month.upsert({
    where: { month_id: d },
    update: {},
    create: { month_id: d, yyyy_mm: format(d, "yyyy-MM") },
  });
}
```

### เช็คลิสต์ก่อนใช้งานจริง

* [ ] `prisma generate` / `migrate dev` ผ่าน
* [ ] เติม partial index ของ `api_keys`
* [ ] ตรวจ timezone ของ Date ให้เป็น **UTC 00:00** (วันที่ 1 ของเดือน)
* [ ] อินเด็กซ์เสริมตามแพทเทิร์นการค้นจริง (เช่น company+month, sku+month)

---

### Auth & API Key (สำหรับ Data‑Service)

```sql
CREATE TABLE IF NOT EXISTS api_clients (
  client_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS api_keys (
  key_id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES api_clients(client_id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL, -- เก็บ hash เท่านั้น
  scope TEXT DEFAULT 'read:forecast',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP,
  UNIQUE(client_id, api_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(client_id) WHERE revoked_at IS NULL;
```

### Staging สำหรับอัปโหลด Excel

```sql
CREATE TABLE IF NOT EXISTS staging_forecast_uploads (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID NOT NULL,
  raw_json JSONB NOT NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT now(),
  errors JSONB
);
```

---

## Excel Template & Mapping (อินพุต)

รองรับไฟล์ `.xlsx`/`.csv` โดย **เฮดเดอร์ตามนี้** (ตัวอย่างจากสกรีน):

| Header                            | ความหมาย                                      | แม็ปสู่                                                                |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `หน่วยงาน`                        | แผนก                                          | `dim_dept.dept_code`                                                   |
| `ชื่อบริษัท`                      | ชื่อบริษัท                                    | `dim_company.company_desc` (แปลงเป็น `company_code` ตามกติกา)          |
| `SAP Code`                        | รหัสวัสดุ                                     | `dim_material.material_code`                                           |
| `ZPCcode` *(ถ้ามี)*               | รหัสภายใน                                     | ใช้ประกอบเป็น meta/notes                                               |
| `ชื่อสินค้า`                      | คำอธิบาย                                      | `dim_material.material_desc`                                           |
| `Pack Size`                       | ขนาดบรรจุ                                     | `dim_sku.pack_size`                                                    |
| `หน่วย`                           | UOM                                           | `dim_uom.uom_code`                                                     |
| `n-2`,`n-1`,`n`,`n+1`,`n+2`,`n+3` | ปริมาณ forecast ตาม offset จาก `anchor_month` | `fact_forecast.forecast_qty` ต่อเดือน                                  |
| `Price`                           | ราคาอ้างอิง                                   | `fact_price.price` และ snapshot ใน `fact_forecast.unit_price_snapshot` |
| `Division`                        |                                               | `dim_sales_org.division`                                               |
| `Sales Organization`              |                                               | `dim_sales_org.sales_organization`                                     |
| `Sales Office`                    |                                               | `dim_sales_org.sales_office`                                           |
| `Sales Group`                     |                                               | `dim_sales_org.sales_group`                                            |
| `Sales Representative`            |                                               | `dim_sales_org.sales_representative`                                   |
| `Distribution Channel`            |                                               | `dim_distribution_channel.dc_code`                                     |

> **Anchor Month**: ผู้ใช้งานเลือกใน FE (เช่น 2025‑09). ระบบจะแปลง `n-2 … n+3` → เดือนจริง (`anchor_month ± k เดือน`).

### ขั้นตอนโหลด (Ingestion)

1. อัปโหลด → เก็บดิบใน `staging_forecast_uploads`
2. Validate header/ชนิดข้อมูล/ค่าเป็นบวก/รหัสอ้างอิง (dim) — ถ้าไม่ผ่าน บันทึก `errors`
3. Upsert **dims** (company/dept/material/uom/sku/sales_org/DC)
4. สร้างแถวใน `forecast_run` (เก็บ `anchor_month`, วิธีการ, notes จาก batch)
5. แตกคอลัมน์ `n±k` เป็นหลายแถว และ insert `fact_forecast` พร้อม `unit_price_snapshot` & `revenue_snapshot = qty*price`
6. อัปเดต/แทรก `fact_price` ตามเดือนที่เกี่ยวข้อง (ถ้าต้องการรักษาราคากลาง)

---

## Manual Entry (FE)

* ฟิลด์ที่ **key ได้** (ตัวอย่าง):

  * **เลือกจาก dim**: Company, Dept, Distribution Channel, Sales Org Chain (Division → Sales Org → Office → Group → Rep), Material → SKU (Pack Size, UOM)
  * **ระบุเดือน & ปริมาณ**: เลือก `Anchor Month` แล้วกรอก `n-2 … n+3` หรือกรอกไล่เดือนตรง ๆ
  * **ราคา**: ระบุ price ณ run นี้ (optional) → จะถูก snapshot ใน fact และอาจอัปเดต `fact_price`
* การกรอกจะสร้าง/ใช้ `forecast_run` เช่นเดียวกับการอัปโหลด

---

## Data‑Service API (ออกข้อมูล)

### การยืนยันตัวตน

* ทุก endpoint (ยกเว้นสร้าง API Key ภายใต้ session ผู้ดูแล) ใช้ **Header: ****`X-API-Key: <key>`**
* BE เก็บเฉพาะ **hash** ของ key, เปรียบเทียบด้วย constant‑time

### Routes (ตัวอย่างเวอร์ชันแรก)

```
POST   /v1/auth/keys           (FE แอดมินสร้าง; สร้าง client + key ใหม้)
GET    /v1/auth/keys           (FE แอดมินดูรายการ key ของ client)
DELETE /v1/auth/keys/:keyId    (เพิกถอน key)

GET    /v1/dim/companies       (option สำหรับ FE และภายนอก)
GET    /v1/dim/depts
GET    /v1/dim/distribution-channels
GET    /v1/dim/materials
GET    /v1/dim/skus
GET    /v1/dim/sales-orgs
GET    /v1/dim/months

GET    /v1/forecast            (ดึงแถว forecast รายเดือน)
GET    /v1/forecast/aggregate  (สรุปยอด, group by มิติที่เลือก)
GET    /v1/prices              (ราคาตามเดือน/sku)
```

#### Query ตัวอย่าง

* `/v1/forecast?company=CP01&dept=Aqua%20team&from=2025-07&to=2025-12&material=A101200076&run=latest`
* `/v1/forecast/aggregate?group=company,month&metric=revenue_snapshot&run=123`

#### Response ตัวอย่าง

```json
{
  "data": [
    {
      "month": "2025-09-01",
      "company_code": "CP01",
      "dept": "Aqua team",
      "material_code": "A101200076",
      "sku": { "pack_size": "1 Litre", "uom": "BOT" },
      "sales_org": { "division": "50000658", "sales_organization": "50002592", "sales_office": "50002639", "sales_group": "E009430434", "sales_representative": "E009410119" },
      "dc": "11",
      "forecast_qty": 30,
      "unit_price_snapshot": 725.12,
      "revenue_snapshot": 21753.60,
      "run_id": 123
    }
  ],
  "paging": { "next": null }
}
```

#### Error Model

```json
{ "error": { "code": "BAD_REQUEST", "message": "invalid month range" } }
```

---

## การติดตั้ง/รันระบบ

### 1) Database (Docker Compose)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: sales_forecast
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

> ใช้ 17/18 ได้ตามเครื่อง — ไม่มีฟีเจอร์พิเศษ

### 2) Backend (Microservices)

ใช้ docker compose ใน `docs/DevOps.md` หรือรันแยก service ตาม `docs/BE.md` (พอร์ตเริ่มที่ 6600)

**ENV (api-gateway ตัวอย่าง)**

```
PORT=6600
CORS_ORIGINS=http://localhost:6610
AUTH_SERVICE_URL=http://localhost:6601
INGEST_SERVICE_URL=http://localhost:6602
DATA_SERVICE_URL=http://localhost:6603
DIM_SERVICE_URL=http://localhost:6604
```

### 3) Frontend

```
yarn install
yarn dev           # Vite
```

**ENV (FE)**

```
VITE_API_BASE=http://localhost:6600
```

---

## BE Structure (ข้อแนะนำ)

```
be/
  src/
    app.ts                 # express app
    server.ts              # bootstrap
    middlewares/
      apiKeyAuth.ts        # ตรวจ X-API-Key
    modules/
      dims/                # GET dims
      forecast/            # GET forecast & aggregate
      price/
      ingest/
        excelParser.ts     # read xlsx/csv (xlsx / fast-csv)
        validator.ts       # zod schema
        loader.ts          # upsert dims + insert facts
      runs/
      auth/                # สร้าง/ลบ API key (ภายใต้ session ของ FE แอดมิน)
    db/
      pool.ts              # pg / kysely / prisma
  prisma/                  # ถ้าเลือก Prisma
  package.json
```

**Lib ที่แนะนำ**: `zod`, `xlsx` หรือ `exceljs`, `fast-csv`, `kysely` *หรือ* `prisma`, `argon2` (hash api key), `helmet`, `pino`, `rate-limiter-flexible`.

### Upsert แนวทาง (Postgres)

* ใช้ `INSERT ... ON CONFLICT ... DO UPDATE` กับตาราง dim/price
* ทำ transaction ต่อ batch

---

## FE Structure (ข้อแนะนำ)

```
fe/
  src/
    pages/
      UploadPage.tsx       # เลือก anchor month + อัปโหลด + ดูผล validate
      ManualEntry.tsx      # ฟอร์มกรอก (Select จาก dim)
      ApiKeyPage.tsx       # สร้าง/เพิกถอน API Key (สำหรับผู้ดูแล)
      DataBrowser.tsx      # ตาราง/กราฟดูข้อมูลผ่าน Data‑Service
    components/
      DimSelect.tsx        # generic select + search (company/dept/material/sku/...)
      MonthPicker.tsx
      FileDropzone.tsx
    api/
      client.ts            # fetch wrapper
    store/
      queryKeys.ts
```

**UI/UX**

* Select ของ dim ใช้โหลดแบบ lazy + ค้นหา (virtualized list)
* แสดง error รายแถวของ Excel ที่ validate ไม่ผ่าน
* Manual Entry: ใส่ helper แปลง `n±k` auto จาก anchor month

---

## Business Rules & Validation

* ปริมาณ forecast ต้อง ≥ 0
* `Pack Size` + `หน่วย` ต้อง match SKU ของ `material` (ถ้าไม่พบให้เสนอสร้าง)
* ต้องเลือก `Anchor Month` ทุกครั้งเมื่ออัปโหลด/กรอก
* ถ้าไม่ระบุ `Price` ให้ดึงจาก `fact_price` ล่าสุดของเดือนนั้น (ถ้ามี)
* สร้าง `forecast_run` ใหม่ทุกครั้งที่อัปโหลด/บันทึก manual (เพื่อเทียบเวอร์ชันได้)

---

## ตัวอย่าง: แตก `n±k` → แถวรายเดือน

```sql
-- สร้าง run
INSERT INTO forecast_run(anchor_month, method, notes)
VALUES (DATE '2025-09-01', 'upload', 'batch-2025-09')
RETURNING run_id;
```

> จากนั้นในโค้ด: map `n-2…n+3` → `month_id = date_trunc('month', anchor_month + (k || ' month')::interval)` แล้ว `INSERT` เข้า `fact_forecast` ทีละแถว

---

## ตัวอย่าง cURL

```bash
# ดึง aggregate รายได้ตามเดือน (ใช้ API Key)
curl -H "X-API-Key: $KEY" \
  "http://localhost:8080/v1/forecast/aggregate?group=company,month&metric=revenue_snapshot&from=2025-07&to=2025-12&run=latest"
```

---

## Observability & Ops

* Logging: `pino` (JSON), แยก ingest vs api
* Metrics: `/metrics` (Prometheus) — req/sec, error rate
* Rate limit: ต่อ API Key + ต่อ IP
* Backup: pg_dump รายวัน, แยก retention 30/180 วัน

---

## Roadmap (ต่อยอด)

* แยกโครงขายเป็นลำดับชั้นเต็ม (division→org→office→group→rep) พร้อม FK ย้อนขึ้น
* ราคาแบบ SCD (`valid_from/valid_to`) และ FX/currency
* RLS/Multi‑tenant (`tenant_id` ในทุกตาราง)
* Job Scheduler สำหรับ import อัตโนมัติจาก SFTP/Share
* BI dashboards (Metabase/Superset/Power BI)

---

## License & Notes

* โค้ดส่วนนี้ใช้เป็น baseline/blueprint — ปรับแต่ง field names ให้ตรงกับระบบจริง
* แนบไฟล์ template.xlsx ในโปรเจกต์ FE เพื่อผู้ใช้ดาวน์โหลดไปกรอกได้ทันที
