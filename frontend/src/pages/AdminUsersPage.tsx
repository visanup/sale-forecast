import { useEffect, useMemo, useState } from 'react';
import { adminApi, type AdminUser } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Shield, RefreshCw, RotateCcw, AlertTriangle, LockKeyhole } from 'lucide-react';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminUsersPage() {
  const { user } = useAuth();
  const isAdmin = useMemo(() => String((user as any)?.role || '').toUpperCase() === 'ADMIN', [user]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [resetInfo, setResetInfo] = useState<{ email: string; password: string } | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadAdmins();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadAdmins() {
    setLoading(true);
    try {
      const result = await adminApi.listUsers();
      setAdmins(result?.users ?? []);
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'ไม่สามารถโหลดรายชื่อผู้ดูแลระบบได้' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(userId: string, patch: Partial<Pick<AdminUser, 'isActive' | 'mustChangePassword'>>) {
    setBusyUser(userId);
    try {
      const updated = await adminApi.updateUser(userId, patch);
      setAdmins((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updated } : item)));
      setMessage({ kind: 'success', text: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว' });
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'อัปเดตสถานะไม่สำเร็จ' });
    } finally {
      setBusyUser(null);
    }
  }

  async function handleResetPassword(target: AdminUser) {
    setBusyUser(target.id);
    try {
      const result = await adminApi.resetPassword(target.id);
      setResetInfo({ email: target.email, password: result.temporaryPassword });
      setAdmins((prev) => prev.map((item) => (item.id === target.id ? { ...item, ...result.user } : item)));
      setMessage({ kind: 'success', text: 'รีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้' });
    } finally {
      setBusyUser(null);
    }
  }

  async function handleSeedAdmins() {
    setSeeding(true);
    try {
      await adminApi.seedDefaults();
      setMessage({ kind: 'success', text: 'ซิงค์บัญชีผู้ดูแลระบบเรียบร้อยแล้ว' });
      await loadAdmins();
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'ไม่สามารถซิงค์บัญชีได้' });
    } finally {
      setSeeding(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <p className="text-lg font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้าจอนี้</p>
          <p className="text-sm mt-1">โปรดติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่มเติม</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-brand-600" size={24} />
            Admin Control Center
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            จัดการบัญชีผู้ดูแลระบบ ตรวจสอบสิทธิ์ และบังคับเปลี่ยนรหัสผ่าน
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            onClick={loadAdmins}
            disabled={loading}
          >
            <RefreshCw size={16} /> รีเฟรช
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
            onClick={handleSeedAdmins}
            disabled={seeding}
          >
            <Shield size={16} /> {seeding ? 'กำลังซิงค์...' : 'ซิงค์บัญชีผู้ดูแล'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.kind === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {resetInfo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle size={16} /> รหัสผ่านชั่วคราวสำหรับ {resetInfo.email}
          </p>
          <p className="mt-2 font-mono text-lg tracking-wide">{resetInfo.password}</p>
          <p className="text-xs mt-1">โปรดส่งต่อให้ผู้ใช้และแนะนำให้เปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบ</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Last Login</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Active</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Force Reset</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  ยังไม่มีผู้ดูแลระบบ
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{admin.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{admin.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(admin.lastLoginAt as string)}</td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={Boolean(admin.isActive)}
                        disabled={busyUser === admin.id}
                        onChange={(event) => toggleFlag(admin.id, { isActive: event.target.checked })}
                      />
                      <span>ใช้งาน</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        checked={Boolean(admin.mustChangePassword)}
                        disabled={busyUser === admin.id}
                        onChange={(event) => toggleFlag(admin.id, { mustChangePassword: event.target.checked })}
                      />
                      <span>ต้องเปลี่ยน</span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        onClick={() => handleResetPassword(admin)}
                        disabled={busyUser === admin.id}
                      >
                        <RotateCcw size={14} /> Reset Password
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        type="button"
                        title="Force MFA coming soon"
                        disabled
                      >
                        <LockKeyhole size={14} /> Force MFA
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
