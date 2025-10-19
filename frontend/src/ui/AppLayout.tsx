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
  Settings,
  User,
  LogOut,
  Home,
  Shield,
  Zap,
  Terminal
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

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

  const notifications = [
    {
      id: 'forecast-status',
      title: 'Latest Forecast Run',
      description: 'The daily forecast finished successfully.',
      timestamp: '2h ago',
    },
    {
      id: 'system-health',
      title: 'System Health',
      description: 'No issues detected across environments.',
      timestamp: '6h ago',
    },
  ];

  const hasUnreadNotifications = notifications.length > 0;
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };
  return (
    <div className="min-h-full grid grid-rows-[auto_1fr_auto]">
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-extrabold text-xl tracking-tight">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-brand-600 to-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 dark:text-white">
              Demand <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">Forecasting</span>
            </span>
          </Link>
          
          <button className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="menu" onClick={() => setOpen(v => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="hidden sm:flex gap-6 items-center">
            <NavLink
              to="/"
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
                          Notifications
                        </p>
                        <button
                          type="button"
                          className="text-xs font-medium text-brand-600 hover:text-brand-500"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {notifications.length === 0 ? (
                          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800/80 dark:text-gray-300">
                            No new notifications right now.
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="rounded-xl border border-transparent bg-gray-50 p-3 text-sm text-gray-700 transition hover:border-brand-200 hover:bg-brand-50/60 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:border-brand-400/40"
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {notification.description}
                              </p>
                              <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                {notification.timestamp}
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

                      <NavLink
                        to="/api"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Code size={16} className="text-brand-600" />
                        <span>API Portal</span>
                      </NavLink>
                      <NavLink
                        to="/api-keys"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Key size={16} className="text-purple-600" />
                        <span>API Keys</span>
                      </NavLink>
                      <NavLink
                        to="/logs"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Terminal size={16} className="text-orange-600" />
                        <span>System Logs</span>
                      </NavLink>
                      <NavLink
                        to="/admin/import"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Database size={16} className="text-green-600" />
                        <span>Admin: Import</span>
                      </NavLink>

                      <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

                      <NavLink
                        to="/profile"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User size={16} className="text-blue-600" />
                        <span>Profile</span>
                      </NavLink>
                      <NavLink
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings size={16} className="text-gray-600" />
                        <span>Settings</span>
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
                  to="/login"
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
                  to="/signup"
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
                to="/" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Home size={16} />
                Home
              </NavLink>
              <NavLink 
                to="/api" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Code size={16} />
                API Portal
              </NavLink>
              <NavLink 
                to="/api-keys" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Key size={16} />
                API Keys
              </NavLink>
              <NavLink 
                to="/logs" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Terminal size={16} />
                System Logs
              </NavLink>
              <NavLink 
                to="/admin/import" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Database size={16} />
                Admin: Import
              </NavLink>
              <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <User size={16} />
                    Profile
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings size={16} />
                    Settings
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
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CircleUserRound size={16} />
                    Sign in
                  </NavLink>
                  <NavLink
                    to="/signup"
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
                  Demand <span className="text-brand-600">Forecasting</span>
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
              © {new Date().getFullYear()} Demand Forecasting. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
