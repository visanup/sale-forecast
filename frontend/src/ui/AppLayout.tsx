import { Outlet, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
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
  Zap
} from 'lucide-react';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-full grid grid-rows-[auto_1fr_auto]">
      <nav className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-extrabold text-xl tracking-tight">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-brand-600 to-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 dark:text-white">
              Sale <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">Forecasting</span>
            </span>
          </Link>
          
          <button className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="menu" onClick={() => setOpen(v => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="hidden sm:flex gap-6 items-center">
            <NavLink 
              to="/" 
              className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive 
                  ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Home size={16} />
              Home
            </NavLink>
            
            <button className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Notifications">
              <Bell size={20} className="text-gray-700 dark:text-gray-300" />
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
            </button>
            
            <div className="relative">
              <details>
                <summary className="list-none cursor-pointer rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <CircleUserRound size={22} className="text-gray-700 dark:text-gray-300" />
                </summary>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 text-sm">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                    <p className="font-semibold text-gray-900 dark:text-white">Account</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage your account</p>
                  </div>
                  
                  <NavLink to="/api" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Code size={16} className="text-brand-600" />
                    <span>API Portal</span>
                  </NavLink>
                  <NavLink to="/api-keys" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Key size={16} className="text-purple-600" />
                    <span>API Keys</span>
                  </NavLink>
                  <NavLink to="/admin/import" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Database size={16} className="text-green-600" />
                    <span>Admin: Import</span>
                  </NavLink>
                  
                  <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                  
                  <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <User size={16} className="text-blue-600" />
                    <span>Profile</span>
                  </NavLink>
                  <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Settings size={16} className="text-gray-600" />
                    <span>Settings</span>
                  </NavLink>
                  <NavLink to="/login" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400">
                    <LogOut size={16} />
                    <span>Logout</span>
                  </NavLink>
                </div>
              </details>
            </div>
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
                to="/admin/import" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Database size={16} />
                Admin: Import
              </NavLink>
              <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
              <NavLink 
                to="/profile" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <User size={16} />
                Profile
              </NavLink>
              <NavLink 
                to="/settings" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings size={16} />
                Settings
              </NavLink>
              <NavLink 
                to="/login" 
                onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400"
              >
                <LogOut size={16} />
                Logout
              </NavLink>
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
                  Sale <span className="text-brand-600">Forecasting</span>
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
              © {new Date().getFullYear()} Sale Forecasting. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


