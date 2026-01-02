import { Outlet, Link, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { 
  Bell, 
  CircleUserRound, 
  BarChart3, 
  Menu, 
  X,
  Code,
  Key,
  Database,
  User,
  LogOut,
  Home,
  Shield,
  Zap,
  Terminal,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useErrorLog } from '../hooks/useErrorLog';
import { ErrorToast } from '../components/ErrorToast';
import { MODULE_CONFIG, type ModuleId } from '../constants/modules';

type AppLayoutProps = {
  module?: ModuleId;
};

export function AppLayout({ module = 'AHB' }: AppLayoutProps) {
  const moduleConfig = MODULE_CONFIG[module];
  const modulePath = (subpath = '') => buildModulePath(moduleConfig.basePath, subpath);
  const { prefix: brandPrefix, highlight: brandHighlight } = splitBrandTitle(moduleConfig.title);
  const homePath = modulePath();
  const loginPath = `/login?module=${moduleConfig.id}`;
  const signupPath = `/signup?module=${moduleConfig.id}`;

  // Simple role helpers (kept local to avoid cross-page imports)
  const ADMIN_ROLE_NAME = 'ADMIN';
  const normalizeRoleName = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : null;
  };
  const userHasAdminRole = (candidate: { roles?: string[] } | Record<string, unknown> | null | undefined): boolean => {
    if (!candidate) return false;
    const normalizedRoles = new Set<string>();
    if (Array.isArray((candidate as any).roles)) {
      for (const role of (candidate as any).roles) {
        const normalized = normalizeRoleName(role);
        if (normalized) normalizedRoles.add(normalized);
      }
    }
    const fallbackRole = normalizeRoleName((candidate as any)?.role);
    if (fallbackRole) normalizedRoles.add(fallbackRole);
    return normalizedRoles.has(ADMIN_ROLE_NAME);
  };
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { logs, unreadCount, markAllAsRead, clearLogs } = useErrorLog();

  useEffect(() => {
    try {
      window.localStorage.setItem('betagro.module.last', moduleConfig.id);
    } catch {
      // no-op if storage blocked
    }
  }, [moduleConfig.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUnreadNotifications = unreadCount > 0;
  const { isAuthenticated, user, logout } = useAuth();
  const isAdminUser = userHasAdminRole(user as any);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  useEffect(() => {
    if (notificationsOpen) {
      markAllAsRead();
    }
  }, [notificationsOpen, markAllAsRead]);

  function formatTimestamp(value: number) {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  return (
    <div className="min-h-full grid grid-rows-[auto_1fr_auto]">
      <ErrorToast />
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={homePath} className="flex items-center gap-3 font-extrabold text-xl tracking-tight">
            <img
              src="/Betagro.png"
              alt="Betagro"
              className="w-14 h-14 rounded-lg object-contain"
            />
            <span className="text-gray-900 dark:text-white">
              {brandPrefix}
              {brandHighlight ? (
                <>
                  {' '}
                  <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">
                    {brandHighlight}
                  </span>
                </>
              ) : null}
            </span>
          </Link>
          
          <button className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="menu" onClick={() => setOpen(v => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="hidden sm:flex gap-6 items-center">
            <NavLink
              to={homePath}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`
              }
            >
              <Home size={16} />
              Home
            </NavLink>
            <NavLink
              to={modulePath('guide')}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`
              }
            >
              <BookOpen size={16} />
              Guide
            </NavLink>

            {isAdminUser && (
              <NavLink
                to={modulePath('admin/users')}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`
                }
              >
                <Shield size={16} />
                Admin
              </NavLink>
            )}

            {isAuthenticated ? (
              <>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label="Notifications"
                    aria-expanded={notificationsOpen}
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                  >
                    <Bell size={20} className="text-gray-700 dark:text-gray-300" />
                    {hasUnreadNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Error Logs
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => clearLogs()}
                            disabled={logs.length === 0}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-brand-600 hover:text-brand-500"
                            onClick={() => setNotificationsOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {logs.length === 0 ? (
                          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800/80 dark:text-gray-300">
                            ยังไม่มีข้อผิดพลาดที่บันทึกไว้
                          </div>
                        ) : (
                          logs.map((log) => (
                            <div
                              key={log.id}
                              className={`rounded-xl border p-3 text-sm transition hover:border-brand-200 hover:bg-brand-50/60 dark:hover:border-brand-400/40 ${
                                log.read
                                  ? 'border-transparent bg-gray-50 text-gray-700 dark:border-transparent dark:bg-gray-800/70 dark:text-gray-200'
                                  : 'border-red-200 bg-red-50 text-gray-900 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-gray-100'
                              }`}
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {log.message}
                              </p>
                              {log.source && (
                                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                  {log.source}
                                </p>
                              )}
                              {log.details && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 break-words">
                                  {log.details}
                                </p>
                              )}
                              {log.context !== undefined && log.context !== null && (
                                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white/60 p-2 text-xs font-mono text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:ring-gray-700">
                                  {JSON.stringify(log.context, null, 2)}
                                </p>
                              )}
                              <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                {formatTimestamp(log.timestamp)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <details>
                    <summary className="list-none cursor-pointer rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <CircleUserRound size={22} className="text-gray-700 dark:text-gray-300" />
                    </summary>
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 text-sm">
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user?.firstName || user?.username || 'Account'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email || 'Manage your account'}
                        </p>
                      </div>

                      {isAdminUser && (
                        <>
                          <NavLink
                            to={modulePath('api')}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Code size={16} className="text-brand-600" />
                            <span>API Portal</span>
                          </NavLink>
                          <NavLink
                            to={modulePath('api-keys')}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Key size={16} className="text-purple-600" />
                            <span>API Keys</span>
                          </NavLink>
                          <NavLink
                            to={modulePath('logs')}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Terminal size={16} className="text-orange-600" />
                            <span>System Logs</span>
                          </NavLink>
                          <NavLink
                            to={modulePath('admin/import')}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Database size={16} className="text-green-600" />
                            <span>Admin: Import</span>
                          </NavLink>
                          <NavLink
                            to={modulePath('admin/monthly-access')}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Shield size={16} className="text-indigo-600" />
                            <span>Monthly Access</span>
                          </NavLink>
                          <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                        </>
                      )}

                      <NavLink
                        to={modulePath('profile')}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User size={16} className="text-blue-600" />
                        <span>Profile</span>
                      </NavLink>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </details>
                </div>
              </>
            ) : (
              <>
                <NavLink
                  to={loginPath}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  Sign in
                </NavLink>
                <NavLink
                  to={signupPath}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-brand-600 to-blue-600 shadow hover:shadow-md transition-all duration-200"
                >
                  Get started
                </NavLink>
              </>
            )}
          </div>
        </div>
        {open && (
          <div className="sm:hidden px-4 pb-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="py-4 space-y-2">
              <NavLink 
                to={homePath} 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Home size={16} />
                Home
              </NavLink>
              <NavLink 
                to={modulePath('guide')} 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <BookOpen size={16} />
                Guide
              </NavLink>
              {isAdminUser && (
                <>
                  <NavLink 
                    to={modulePath('api')} 
                    onClick={()=>setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Code size={16} />
                    API Portal
                  </NavLink>
                  <NavLink 
                    to={modulePath('api-keys')} 
                    onClick={()=>setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Key size={16} />
                    API Keys
                  </NavLink>
                  <NavLink 
                    to={modulePath('logs')} 
                    onClick={()=>setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Terminal size={16} />
                    System Logs
                  </NavLink>
                  <NavLink 
                    to={modulePath('admin/import')} 
                    onClick={()=>setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Database size={16} />
                    Admin: Import
                  </NavLink>
                  <NavLink 
                    to={modulePath('admin/monthly-access')} 
                    onClick={()=>setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Shield size={16} />
                    Monthly Access
                  </NavLink>
                  <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
                </>
              )}
              <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
              {isAuthenticated ? (
                <>
                  <NavLink
                    to={modulePath('profile')}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <User size={16} />
                    Profile
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to={loginPath}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CircleUserRound size={16} />
                    Sign in
                  </NavLink>
                  <NavLink
                    to={signupPath}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-blue-600 text-white transition-colors"
                  >
                    <User size={16} />
                    Get started
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <footer className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200/60 dark:border-gray-800/60 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-brand-600 to-blue-600 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {brandPrefix}
                  {brandHighlight ? (
                    <>
                      {' '}
                      <span className="text-brand-600">{brandHighlight}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">v0.1.0</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>Scalable</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {moduleConfig.footerLabel}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function buildModulePath(basePath: string, subpath = ''): string {
  const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/+$/, '');
  if (!subpath) {
    return normalizedBase || '/';
  }
  const normalizedSubpath = subpath.replace(/^\/+/, '');
  if (!normalizedSubpath) {
    return normalizedBase || '/';
  }
  const combined = `${normalizedBase}/${normalizedSubpath}`;
  return combined.startsWith('/') ? combined : `/${combined}`;
}

function splitBrandTitle(fullTitle: string, highlight = 'Forecasting'): { prefix: string; highlight: string | null } {
  if (!fullTitle || !fullTitle.includes(highlight)) {
    return { prefix: fullTitle, highlight: null };
  }
  const prefix = fullTitle.replace(highlight, '').trim();
  return {
    prefix: prefix.length > 0 ? prefix : fullTitle,
    highlight
  };
}
