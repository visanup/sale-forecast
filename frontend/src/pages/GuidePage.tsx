import { BookOpen, CheckCircle2, CloudUpload, Database, FileText, KeyRound, ClipboardList } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Simple role helpers (kept local to avoid cross-page imports)
const ADMIN_ROLE_NAME = 'ADMIN';
function normalizeRoleName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}
function userHasAdminRole(user: { roles?: string[] } | Record<string, unknown> | null | undefined): boolean {
  if (!user) return false;
  const normalizedRoles = new Set<string>();
  if (Array.isArray((user as any).roles)) {
    for (const role of (user as any).roles) {
      const normalized = normalizeRoleName(role);
      if (normalized) normalizedRoles.add(normalized);
    }
  }
  const fallbackRole = normalizeRoleName((user as any)?.role);
  if (fallbackRole) normalizedRoles.add(fallbackRole);
  return normalizedRoles.has(ADMIN_ROLE_NAME);
}

const API_SAMPLE_COMMAND = `curl -X GET "https://data-service.your-domain.com/v1/saleforecast?anchor_month=2025-01&company_code=1001" \\
  -H "X-API-Key: <your-api-key>"`;

const API_SAMPLE_RESPONSE = `{
  "data": [
    {
      "id": "1024",
      "anchor_month": "2025-01",
      "company_code": "1001",
      "company_desc": "Betagro",
      "material_code": "MAT-001",
      "material_desc": "Frozen Chicken Breast",
      "forecast_qty": 1250,
      "metadata": {
        "source": "upload",
        "dept_code": "FROZEN",
        "months": [
          { "month": "2024-11", "qty": 1100 },
          { "month": "2024-12", "qty": 1200 },
          { "month": "2025-01", "qty": 1250 }
        ]
      },
      "created_at": "2025-10-18T04:35:12.120Z"
    }
  ]
}`;

export function GuidePage() {
  const { user } = useAuth();
  const isAdminUser = userHasAdminRole(user);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-brand-600 to-blue-600 p-4 shadow-xl">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Sales Forecasting Guide
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300">
            {isAdminUser
              ? 'คู่มือการใช้งาน Web App Sales Forecasting และตัวอย่าง API Document สำหรับดึงข้อมูลพื้นฐานด้วย API Key'
              : 'คู่มือการใช้งาน Web App Sales Forecasting'}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <CloudUpload className="h-6 w-6 text-brand-600" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">ขั้นตอนใช้งาน Web App</h2>
            </div>
            <ol className="mt-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  1
                </span>
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">Upload Forecast</strong> – เลือกไฟล์ Excel ที่จัดเตรียมตาม Template แล้วกด Submit to Ingest เพื่อลงระบบ
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  2
                </span>
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">Manual Entry</strong> – หากไม่ได้ใช้ไฟล์ สามารถกรอกข้อมูลด้วยฟอร์ม Manual Entry โดยระบบจะตรวจสอบความครบถ้วนก่อนบันทึก
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  3
                </span>
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">Preview History</strong> – ตรวจสอบประวัติการอัปเดต โดยผู้ใช้ทั่วไป (USER) จะเห็นเฉพาะรายการที่ตนสร้างหรือแก้ไข ส่วน ADMIN จะเห็นได้ทั้งหมด
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  4
                </span>
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-white">Master Display</strong> - ตรวจสอบประวัติ Master Data ที่อยู่ในระบบในปัจจุบัน
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-brand-600" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Best Practices</h2>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                ตรวจสอบ Template ให้มีคอลัมน์และรูปแบบตรงตามที่ระบบกำหนดก่อนอัปโหลด
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                ระบุ Anchor Month ให้ถูกต้องเพื่อให้ระบบจัดกลุ่มประวัติและคาดการณ์ได้อย่างแม่นยำ
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                ใช้ Search บนแท็บ History เพื่อกรองตามรหัสลูกค้า รหัสสินค้า หรือชื่อบริษัทได้อย่างรวดเร็ว
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                ตรวจสอบ Error Logs (ไอคอนกระดิ่ง) เมื่อระบบแจ้งเตือนการอัปโหลดหรือการประมวลผลผิดพลาด
              </li>
            </ul>
          </div>
        </section>

        {isAdminUser && (
        <section className="rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-brand-600" />
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">API พื้นฐาน (GET)</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  ใช้ API Key ใน Header <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">X-API-Key</code> เพื่อดึงข้อมูลได้จากทุกที่
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
              <KeyRound className="h-4 w-4" />
              ใช้ได้กับ API Key ที่สร้างจากหน้า API Keys
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-sm text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Database className="h-5 w-5 text-brand-600" />
                Endpoint: /v1/saleforecast
              </h3>
              <p className="mt-2">
                ดึงประวัติการคาดการณ์โดยกำหนด <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">anchor_month</code> (รูปแบบ YYYY-MM) และสามารถใส่ตัวกรองเพิ่มเติม เช่น <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">company_code</code>, <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">material_code</code> หรือ <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">search</code>.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 shadow-lg">
                <code>{API_SAMPLE_COMMAND}</code>
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-sm text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <BookOpen className="h-5 w-5 text-brand-600" />
                ตัวอย่าง Response
              </h3>
              <p className="mt-2">
                ข้อมูลที่ได้จะประกอบด้วยรายละเอียดลูกค้า วัตถุดิบ ปริมาณคาดการณ์ และ metadata สำหรับการวิเคราะห์เชิงลึก
              </p>
              <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 shadow-lg">
                <code>{API_SAMPLE_RESPONSE}</code>
              </pre>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-6 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-200">
            <h3 className="text-base font-semibold">เคล็ดลับเพิ่มเติม</h3>
            <ul className="mt-3 space-y-2">
              <li>• สามารถใช้ Postman หรือเครื่องมือ API Client ใดๆ เพื่อทดสอบ Endpoint ได้</li>
              <li>• จัดการ API Key ได้จากเมนู <strong>API Keys</strong> และสามารถยกเลิกได้ทันทีหากสงสัยถูกนำไปใช้ผิด</li>
              <li>• หากต้องการข้อมูลรวม (Aggregate) ให้ใช้ Endpoint <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">/v1/forecast</code> พร้อมพารามิเตอร์ <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">group</code> และ <code className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">metric</code></li>
            </ul>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
