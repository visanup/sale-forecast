import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, ArrowRight, LogIn, Shield, Zap, BarChart3, CheckCircle2 } from 'lucide-react';
import { MODULE_CONFIG, MODULE_LIST, normalizeModuleId, type ModuleId } from '../constants/modules';

const AVAILABLE_MODULES = MODULE_LIST.filter((module) => module.isAvailable);
const AVAILABLE_MODULE_IDS = (
  AVAILABLE_MODULES.length
    ? AVAILABLE_MODULES.map((module) => module.id)
    : ['AHB']
) as [ModuleId, ...ModuleId[]];

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  module: z.enum(AVAILABLE_MODULE_IDS, { required_error: 'Please select a module' })
});
type FormValues = z.infer<typeof schema> & { remember?: boolean };

export function LoginPage() {
  const storageKey = 'betagro.login.remember';
  const lastModuleKey = 'betagro.module.last';
  let defaults: Partial<FormValues> = {};
  let rememberedModule: ModuleId | undefined;
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      defaults = {
        email: parsed.email || '',
        password: parsed.password || '',
        remember: true,
      } as Partial<FormValues>;
      if (parsed.module) {
        rememberedModule = normalizeModuleId(parsed.module);
      }
    }
  } catch {}

  let lastModule: ModuleId | undefined;
  try {
    const storedModule = typeof window !== 'undefined' ? window.localStorage.getItem(lastModuleKey) : null;
    if (storedModule) {
      lastModule = normalizeModuleId(storedModule);
    }
  } catch {}

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const requestedModule = searchParams.get('module');
  const defaultModule = normalizeModuleId(requestedModule ?? rememberedModule ?? lastModule ?? null);
  defaults.module = defaultModule;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults as any,
  });
  const navigate = useNavigate();
  const { login } = useAuth();
  const activeModule = (watch('module') as ModuleId | undefined) ?? defaultModule;
  const signupHref = `/signup?module=${activeModule}`;

  async function onSubmit(values: FormValues) {
    try {
      const authResult = await login(values.email, values.password);
      // Remember email/password if opted-in
      try {
        if (values.remember) {
          window.localStorage.setItem(storageKey, JSON.stringify({
            email: values.email,
            password: values.password,
            module: values.module,
          }));
        } else {
          window.localStorage.removeItem(storageKey);
        }
        window.localStorage.setItem(lastModuleKey, values.module);
      } catch {}
      const destination = MODULE_CONFIG[values.module]?.basePath ?? '/';
      if (authResult?.user?.mustChangePassword) {
        const encodedNext = encodeURIComponent(destination);
        navigate(`/force-password-change?module=${values.module}&next=${encodedNext}`);
      } else {
        navigate(destination);
      }
    } catch (e: any) {
      setError('root', { message: e.message || 'Login failed' });
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-indigo-900 dark:to-blue-900">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366F1' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-down">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl mb-4 shadow-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">Back</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Sign in to your account to continue forecasting</p>
          </div>

          {/* Login Form */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8 animate-fade-in-up">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Module Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select a module to continue
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {MODULE_LIST.map((moduleOption) => {
                    const isDisabled = moduleOption.isAvailable === false;
                    const isSelected = !isDisabled && activeModule === moduleOption.id;
                    const cardStateClass = isDisabled
                      ? 'cursor-not-allowed border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 opacity-60'
                      : isSelected
                        ? 'cursor-pointer border-indigo-500 shadow-lg ring-2 ring-indigo-200/50 dark:ring-indigo-500/30 bg-white dark:bg-gray-800'
                        : 'cursor-pointer border-gray-200/70 dark:border-gray-700/70 hover:border-indigo-300/70 hover:bg-white/70 dark:hover:bg-gray-800/40';
                    return (
                      <label
                        key={moduleOption.id}
                        className={`rounded-2xl border p-4 transition-all ${cardStateClass}`}
                        aria-disabled={isDisabled}
                      >
                        <input
                          type="radio"
                          value={moduleOption.id}
                          className="sr-only"
                          disabled={isDisabled}
                          {...register('module')}
                        />
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                              {moduleOption.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {moduleOption.description}
                            </p>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {isDisabled ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                              Coming soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/40 dark:text-green-300">
                              Available now
                            </span>
                          )}
                        </div>
                        {isDisabled ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Feed Demand Forecasting will be available in a future release.
                          </p>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                {errors.module && (
                  <p className="text-sm text-red-500 flex items-center">
                    <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                    {errors.module.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md" 
                    type="email" 
                    placeholder="Enter your email"
                    {...register('email')} 
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500 mt-1 flex items-center">
                  <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                  {errors.email.message}
                </p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md" 
                    type="password" 
                    placeholder="Enter your password"
                    {...register('password')} 
                  />
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1 flex items-center">
                  <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                  {errors.password.message}
                </p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    {...register('remember')}
                    defaultChecked={Boolean((defaults as any)?.remember)}
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button 
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Error Message */}
              {/* @ts-ignore */}
              {errors.root && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                    <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                    {String((errors as any).root?.message)}
                  </p>
                </div>
              )}
            </form>

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link 
                  to={signupHref} 
                  className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                >
                  Create one here
                </Link>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Secure</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Fast</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Accurate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
