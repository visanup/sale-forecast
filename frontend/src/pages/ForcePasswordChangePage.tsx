import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { MODULE_CONFIG, normalizeModuleId, type ModuleId } from '../constants/modules';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านชั่วคราว'),
    newPassword: z
      .string()
      .min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
      .regex(/[A-Z]/, 'ต้องมีตัวอักษรใหญ่อย่างน้อย 1 ตัว')
      .regex(/[a-z]/, 'ต้องมีตัวอักษรเล็กอย่างน้อย 1 ตัว')
      .regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว'),
    confirmPassword: z.string().min(8, 'ยืนยันรหัสผ่านใหม่อีกครั้ง')
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'รหัสผ่านใหม่ทั้งสองครั้งต้องตรงกัน',
    path: ['confirmPassword']
  });

 type FormValues = z.infer<typeof schema>;

export function ForcePasswordChangePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const requestedModule = searchParams.get('module');
  const normalizedModule: ModuleId = normalizeModuleId(requestedModule);
  const nextParam = searchParams.get('next');

  const fallbackDestination = MODULE_CONFIG[normalizedModule]?.basePath ?? '/';
  const decodedNext = useMemo(() => {
    if (!nextParam) return null;
    try {
      return decodeURIComponent(nextParam);
    } catch {
      return null;
    }
  }, [nextParam]);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      const fromState = (location.state as { from?: Location } | undefined)?.from?.pathname;
      const destination = fromState ?? decodedNext ?? fallbackDestination;
      navigate(destination, { replace: true });
    }
  }, [user?.mustChangePassword, decodedNext, fallbackDestination, location.state, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const response = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      const updatedUser = (response as any)?.data ?? response;
      if (updatedUser) {
        setUser(updatedUser);
      }
      setSuccessMessage('เปลี่ยนรหัสผ่านเรียบร้อย สามารถเข้าใช้งานระบบได้ทันที');
      const fromState = (location.state as { from?: Location } | undefined)?.from?.pathname;
      const destination = fromState ?? decodedNext ?? fallbackDestination;
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 800);
    } catch (error: any) {
      setServerError(error?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 dark:from-slate-900 dark:via-indigo-900 dark:to-emerald-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white/90 dark:bg-slate-900/90 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800/60 p-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-500 text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">เปลี่ยนรหัสผ่านครั้งแรก</h1>
          <p className="text-slate-600 dark:text-slate-300">{user?.email || user?.username} จำเป็นต้องตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">รหัสผ่านชั่วคราว</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="กรอกรหัสผ่านชั่วคราว"
                {...register('currentPassword')}
              />
            </div>
            {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">รหัสผ่านใหม่</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="ตั้งรหัสผ่านใหม่"
                {...register('newPassword')}
              />
            </div>
            {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ยืนยันรหัสผ่านใหม่</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="ยืนยันรหัสผ่านใหม่"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          {serverError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 py-3 text-white font-semibold shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังเปลี่ยนรหัสผ่าน…' : 'บันทึกรหัสผ่านใหม่'}
            {!isSubmitting && <ArrowRight className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
