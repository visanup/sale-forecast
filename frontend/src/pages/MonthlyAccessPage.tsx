import { useEffect, useMemo, useState } from 'react';
import { Shield, Filter, Lock, Unlock, RefreshCw, Loader2, Calendar } from 'lucide-react';
import { monthlyAccessApi, type MonthlyAccessRecord } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useErrorLog } from '../hooks/useErrorLog';

type StatusFilter = 'all' | 'locked' | 'unlocked';

const MONTH_INPUT_MASK = new Date().toISOString().slice(0, 7);

function normalizeRole(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

function userHasAdminRole(candidate: any): boolean {
  if (!candidate) return false;
  const roles = new Set<string>();
  if (Array.isArray(candidate.roles)) {
    for (const role of candidate.roles) {
      const normalized = normalizeRole(role);
      if (normalized) roles.add(normalized);
    }
  }
  const fallbackRole = normalizeRole(candidate.role);
  if (fallbackRole) roles.add(fallbackRole);
  return roles.has('ADMIN');
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function MonthlyAccessPage() {
  const { user } = useAuth();
  const { logError } = useErrorLog();
  const isAdmin = useMemo(() => userHasAdminRole(user), [user]);

  const [records, setRecords] = useState<MonthlyAccessRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<{ search: string; anchorMonth: string; status: StatusFilter }>({
    search: '',
    anchorMonth: MONTH_INPUT_MASK,
    status: 'all'
  });

  useEffect(() => {
    if (isAdmin) {
      loadAccessList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadAccessList() {
    setLoading(true);
    setNotice(null);
    try {
      const query = paramsFromFilters(filters);
      const response = await monthlyAccessApi.list(query);
      const data = response?.data ?? [];
      setRecords(data);
    } catch (error: any) {
      const message = error?.message || 'ไม่สามารถโหลดรายการสิทธิ์รายเดือนได้';
      logError({
        message,
        source: 'MonthlyAccessPage:loadAccessList',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: paramsFromFilters(filters)
      });
      setNotice({ kind: 'error', text: message });
    } finally {
      setLoading(false);
    }
  }

  function paramsFromFilters(current: typeof filters) {
    const params: { search?: string; anchor_month?: string; status?: 'locked' | 'unlocked' } = {};
    if (current.search.trim()) params.search = current.search.trim();
    if (current.anchorMonth) params.anchor_month = current.anchorMonth;
    if (current.status !== 'all') params.status = current.status;
    return params;
  }

  const stats = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        if (record.is_locked) acc.locked += 1;
        else acc.unlocked += 1;
        return acc;
      },
      { locked: 0, unlocked: 0 }
    );
  }, [records]);

  const allLocked = records.length > 0 && records.every((record) => record.is_locked);
  const primaryBulkAction = allLocked ? 'UNLOCK' : 'LOCK';

  async function handleToggle(record: MonthlyAccessRecord) {
    const targetState = !record.is_locked;
    setRowBusy(record.id);
    setNotice(null);
    try {
      const response = await monthlyAccessApi.update(record.id, { is_locked: targetState });
      const nextRecord = response?.data;
      setRecords((prev) => (nextRecord ? prev.map((item) => (item.id === record.id ? nextRecord : item)) : prev));
      setNotice({
        kind: 'success',
        text: targetState ? 'ล็อกการเข้าถึงเรียบร้อย' : 'ปลดล็อกการเข้าถึงเรียบร้อย'
      });
    } catch (error: any) {
      const message = error?.message || 'อัปเดตสถานะไม่สำเร็จ';
      logError({
        message,
        source: 'MonthlyAccessPage:handleToggle',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { recordId: record.id, targetState }
      });
      setNotice({ kind: 'error', text: message });
    } finally {
      setRowBusy(null);
    }
  }

  async function handleBulkToggle() {
    if (records.length === 0) return;
    setBulkBusy(true);
    setNotice(null);
    try {
      await monthlyAccessApi.bulkToggle({
        action: primaryBulkAction,
        ids: records.map((record) => record.id),
        filter: paramsFromFilters(filters)
      });
      await loadAccessList();
      setNotice({
        kind: 'success',
        text:
          primaryBulkAction === 'LOCK'
            ? 'ล็อกสิทธิ์ทั้งหมดตามตัวกรองเรียบร้อย'
            : 'ปลดล็อกสิทธิ์ทั้งหมดตามตัวกรองเรียบร้อย'
      });
    } catch (error: any) {
      const message = error?.message || 'ไม่สามารถเปลี่ยนสถานะทั้งหมดได้';
      logError({
        message,
        source: 'MonthlyAccessPage:handleBulkToggle',
        details: typeof error?.stack === 'string' ? error.stack : undefined,
        context: { primaryBulkAction, filter: paramsFromFilters(filters) }
      });
      setNotice({ kind: 'error', text: message });
    } finally {
      setBulkBusy(false);
    }
  }

  function handleResetFilters() {
    setFilters({ search: '', anchorMonth: MONTH_INPUT_MASK, status: 'all' });
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <p className="text-lg font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้า Monthly Access Control</p>
          <p className="text-sm mt-1">โปรดติดต่อผู้ดูแลระบบหากคิดว่านี่เป็นความผิดพลาด</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide">
              <Shield className="h-4 w-4" />
              Admin Exclusive
            </p>
            <h1 className="mt-4 text-3xl font-bold">Monthly Access Control</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              ควบคุมสิทธิ์การแก้ไขข้อมูลรายเดือนของผู้ใช้ได้อย่างแม่นยำ เลือกล็อกหรือปลดล็อกได้ทั้งรายบุคคลและแบบรวมตามตัวกรองที่กำลังเปิดอยู่
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-6 py-4 text-center shadow-lg backdrop-blur">
            <p className="text-sm text-white/70">สถานะปัจจุบัน</p>
            <p className="mt-2 text-4xl font-bold">
              {stats.locked}/{records.length || 0}
            </p>
            <p className="text-xs tracking-wide text-white/60">รายการที่ถูกล็อกทั้งหมด</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 p-3 text-white">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ตัวกรองการเข้าถึง</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">ระบุผู้ใช้ เดือน และสถานะเพื่อจำกัดผลลัพธ์</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ค้นหาผู้ใช้ / Email / Username
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                placeholder="napat@betagro.com"
              />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Anchor Month
              <input
                type="month"
                value={filters.anchorMonth}
                max="9999-12"
                onChange={(event) => setFilters((prev) => ({ ...prev, anchorMonth: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              สถานะสิทธิ์
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as StatusFilter }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="locked">Locked</option>
                <option value="unlocked">Unlocked</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadAccessList}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{loading ? 'กำลังดึงข้อมูล...' : 'ค้นหาข้อมูล'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-400"
            >
              รีเซ็ตตัวกรอง
            </button>
          </div>
        </div>

      </div>

      {notice && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-100'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">รายการสิทธิ์ตามเดือน</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {records.length === 0 ? 'ยังไม่มีข้อมูลสำหรับตัวกรองนี้' : `พบทั้งหมด ${records.length} รายการ`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBulkToggle}
            disabled={records.length === 0 || bulkBusy || loading}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {bulkBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : primaryBulkAction === 'LOCK' ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
            <span>{primaryBulkAction === 'LOCK' ? 'Lock All Filtered' : 'Unlock All Filtered'}</span>
          </button>
        </div>

        <div className="overflow-x-auto px-4 pb-6">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">ผู้ใช้</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Anchor Month</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">แก้ไขล่าสุด</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">การทำงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลที่ตรงกับตัวกรอง'}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{record.user_email}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {record.user_name || record.user_id || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-gray-800 dark:text-gray-200">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                        <Calendar className="h-3.5 w-3.5" />
                        {record.anchor_month}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${
                          record.is_locked
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                        }`}
                      >
                        {record.is_locked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                        {record.is_locked ? 'Locked' : 'Unlocked'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <p>{formatDate(record.updated_at)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {record.locked_by ? `โดย ${record.locked_by}` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggle(record)}
                        disabled={rowBusy === record.id}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                          record.is_locked
                            ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-300'
                            : 'bg-red-600 hover:bg-red-500 focus:ring-red-300'
                        }`}
                      >
                        {rowBusy === record.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : record.is_locked ? (
                          <Unlock className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {record.is_locked ? 'ปลดล็อก' : 'ล็อก'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
