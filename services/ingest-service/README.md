# Ingest Service

Endpoints to ingest forecast via manual JSON or Excel upload.

## Run
- Dev: `yarn dev` (port 6602)
- Build/Start: `yarn build && yarn start`

## Env
- `PORT` (default 6602)
- `DATABASE_URL`

## Endpoints
- Health: `GET /health`
- Manual: `POST /v1/manual` (application/json)
- Upload: `POST /v1/upload` (multipart/form-data: fields `file`, `anchorMonth`)

## Payload examples
- Manual JSON (min 1 line):
```json
{
  "anchorMonth": "2025-01",
  "lines": [
    {
      "company_code": "ACME",
      "dept_code": "D01",
      "dc_code": "DC1",
      "division": "DIV",
      "sales_organization": "SO",
      "sales_office": "SOFF",
      "sales_group": "SG",
      "sales_representative": "SR",
      "material_code": "MAT001",
      "pack_size": "1L",
      "uom_code": "EA",
      "months": [
        { "month": "2025-01", "qty": 100, "price": 9.99 },
        { "month": "2025-02", "qty": 120 }
      ]
    }
  ]
}
```

## Quick test
```bash
# health
curl -s http://localhost:6602/health
# manual
curl -s -H "Content-Type: application/json" \
  -d '{"anchorMonth":"2025-01","lines":[{"company_code":"ACME","dept_code":"D01","dc_code":"DC1","material_code":"MAT001","pack_size":"1L","uom_code":"EA","months":[{"month":"2025-01","qty":100}]}]}' \
  http://localhost:6602/v1/manual
# upload (requires sample_upload.xlsx)
curl -s -F "file=@sample_upload.xlsx" -F "anchorMonth=2025-01" http://localhost:6602/v1/upload
```

_________________________

## สิ่งที่แก้ไขในการดีบั๊กล่าสุด
1. ปรับ `tsconfig.json` ให้ใช้ `module`/`moduleResolution: "NodeNext"` และเปิด `allowSyntheticDefaultImports` เพื่อให้ TypeScript สร้างไฟล์ ESM ที่มีนามสกุล `.js` ตามที่ Node.js ต้องการ
2. เพิ่ม `.js` ต่อท้ายเส้นทาง import ภายในโปรเจ็กต์ (`src/server.ts`, `src/routes/ingest.ts`, `src/utils/redis-logger.ts`) และปรับ type ให้เข้มงวดขึ้นเพื่อให้คอมไพล์ผ่าน
3. ยืนยันว่า `npx tsc -p tsconfig.json` สร้างโฟลเดอร์ `dist/` ครบถ้วน (มี `dist/routes/ingest.js`) ทำให้คอนเทนเนอร์ไม่ล้มด้วยข้อผิดพลาด `ERR_MODULE_NOT_FOUND`

## ขั้นตอนทดสอบ/นำขึ้นคอนเทนเนอร์หลังแก้ไข
1. `npx -y prisma@6.16.3 generate`
2. `yarn install`
3. `npx tsc -p tsconfig.json`
4. `docker compose build ingest-service`
5. `docker compose up ingest-service`
