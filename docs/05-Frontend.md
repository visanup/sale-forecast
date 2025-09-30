## Frontend (React + TypeScript + Vite + Tailwind)

Document ID: FE-05

Scope: Theme, project structure, env, API usage conventions

Audience: Frontend engineers

**Theme**: beautiful, premium, professional

### Tech
- React 18 + TypeScript
- Vite
- TailwindCSS + Headless UI + Radix UI
- TanStack Query (data fetching)
- React Hook Form + Zod (validation)

### Ports
- Dev server: 6610

### Environment (.env.example)
```
VITE_APP_NAME=Sales Forecast Console
VITE_AUTH_BASE=http://localhost:6601
VITE_INGEST_BASE=http://localhost:6602
VITE_DATA_BASE=http://localhost:6603
VITE_DIM_BASE=http://localhost:6604
VITE_FEATURE_UPLOAD=true
VITE_FEATURE_MANUAL_ENTRY=true
VITE_FEATURE_API_KEYS=true
```

### Design Tokens (Tailwind)
- Colors: use neutral/stone for base, primary = indigo, accent = emerald
- Spacing scale: Tailwind defaults, use `space-y-*` for rhythm
- Typography: Inter/Prompt, 14–16 body, 20–24 headings
- Elevation: subtle shadows `shadow-sm`/`shadow` for premium feel

### Coding Conventions
- Components: PascalCase, hooks start with `use*`
- Forms: React Hook Form + Zod schema beside component
- API: centralize in `api/*` with typed functions and TanStack Query keys in `store/queryKeys.ts`
- State: favor server state (Query), minimal client state

### Pages
- UploadPage: เลือก Anchor Month + อัปโหลด Excel/CSV + ดูผลตรวจสอบ
- ManualEntry: กรอกข้อมูล forecast/price โดยเลือกจาก dim ต่าง ๆ
- ApiKeyPage: สร้าง/เพิกถอน API Key (ผ่าน Gateway → Auth Service)
- DataBrowser: ตาราง/กราฟ ดูข้อมูลผ่าน Data‑Service

### Components
- DimSelect: generic select (Company, Dept, DC, Sales Org chain, Material, SKU)
- MonthPicker
- FileDropzone
- DataTable, Chart

### UX Guidelines
- สีและคอมโพเนนต์สไตล์ premium (spacing, shadows, rounded, focus states)
- ฟอร์มมี helper คำนวณ `n±k` จาก Anchor Month อัตโนมัติ
- Lazy loading + typeahead สำหรับ dim ขนาดใหญ่
- แสดง error per-row เมื่ออัปโหลดไฟล์ไม่ผ่าน

### FE ↔ API Contracts
- Include `X-API-Key` for data/dim routes (if user has an active key)
- Admin-only key management routes proxied via gateway (session/role handled by org policy; dev mode is open)

### API Client
- ใช้ TanStack Query + fetch wrapper ใส่ `X-API-Key` เมื่อจำเป็น
- สำหรับหน้าภายใน (สร้าง API Key) ใช้ session ผู้ดูแลตามนโยบายขององค์กร (เช่น SSO), ที่นี่สมมติ dev mode ไม่ต้อง SSO

### Routing (แนะนำ)
```
/upload
/manual
/api-keys
/browse
```

### Folder Structure (suggestion)
```
fe/
  src/
    pages/
      UploadPage.tsx
      ManualEntry.tsx
      ApiKeyPage.tsx
      DataBrowser.tsx
    components/
      DimSelect.tsx
      MonthPicker.tsx
      FileDropzone.tsx
    api/
      client.ts
      dim.ts
      forecast.ts
      auth.ts
    store/
      queryKeys.ts
    styles/
      tailwind.css
```


