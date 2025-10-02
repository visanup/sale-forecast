import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Globe, 
  Server, 
  Save, 
  Check, 
  Moon, 
  Sun, 
  Monitor,
  Shield,
  Bell,
  User,
  Database
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 py-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-2xl">
            <SettingsIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Settings</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Customize your experience and preferences with our advanced configuration options</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 sticky top-8 h-fit hover:shadow-3xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 text-white" />
                </div>
                Categories
              </h3>
              <nav className="space-y-3">
                <a href="#appearance" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Appearance</span>
                </a>
                <a href="#language" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:text-green-700 dark:hover:text-green-300 transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Language</span>
                </a>
                <a href="#notifications" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20 hover:text-yellow-700 dark:hover:text-yellow-300 transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Notifications</span>
                </a>
                <a href="#api" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/20 dark:hover:to-blue-900/20 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">API Settings</span>
                </a>
                <a href="#security" className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Security</span>
                </a>
              </nav>
              
              {/* Additional content to fill space */}
              <div className="mt-8 space-y-6">
                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <SettingsIcon className="w-3 h-3 text-white" />
                    </div>
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-left text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl transition-all duration-300 group">
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <SettingsIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Reset to Defaults</span>
                    </button>
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-left text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl transition-all duration-300 group">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Export Settings</span>
                    </button>
                  </div>
                </div>
                
                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Bell className="w-3 h-3 text-white" />
                    </div>
                    Help & Support
                  </h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-left text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl transition-all duration-300 group">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Database className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Documentation</span>
                    </button>
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-left text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl transition-all duration-300 group">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Bell className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Contact Support</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Appearance Settings */}
            <div id="appearance" className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Palette className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">Customize the look and feel of your interface</p>
                </div>
              </div>

              <div className="space-y-8">
        <div>
                  <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-6">Theme Selection</label>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="relative cursor-pointer group">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="system" 
                        className="sr-only" 
                        checked={theme === 'system'}
                        onChange={() => setTheme('system')}
                      />
                      <div className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-all duration-300 transform group-hover:scale-105 ${
                        theme === 'system' 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-lg' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:shadow-md'
                      }`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                          theme === 'system' 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                        }`}>
                          <Monitor className={`w-6 h-6 ${
                            theme === 'system' 
                              ? 'text-white' 
                              : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          }`} />
                        </div>
                        <span className={`text-sm font-bold ${
                          theme === 'system' 
                            ? 'text-blue-700 dark:text-blue-300' 
                            : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                        }`}>System</span>
                        <span className={`text-xs mt-1 ${
                          theme === 'system' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>Auto</span>
                      </div>
                    </label>
                    <label className="relative cursor-pointer group">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="light" 
                        className="sr-only" 
                        checked={theme === 'light'}
                        onChange={() => setTheme('light')}
                      />
                      <div className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-all duration-300 transform group-hover:scale-105 ${
                        theme === 'light' 
                          ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 shadow-lg' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-yellow-400 hover:shadow-md'
                      }`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                          theme === 'light' 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/30'
                        }`}>
                          <Sun className={`w-6 h-6 ${
                            theme === 'light' 
                              ? 'text-white' 
                              : 'text-gray-600 dark:text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400'
                          }`} />
                        </div>
                        <span className={`text-sm font-bold ${
                          theme === 'light' 
                            ? 'text-yellow-700 dark:text-yellow-300' 
                            : 'text-gray-700 dark:text-gray-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400'
                        }`}>Light</span>
                        <span className={`text-xs mt-1 ${
                          theme === 'light' 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>Always</span>
                      </div>
                    </label>
                    <label className="relative cursor-pointer group">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="dark" 
                        className="sr-only" 
                        checked={theme === 'dark'}
                        onChange={() => setTheme('dark')}
                      />
                      <div className={`flex flex-col items-center p-6 border-2 rounded-2xl transition-all duration-300 transform group-hover:scale-105 ${
                        theme === 'dark' 
                          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-lg' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:shadow-md'
                      }`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'
                        }`}>
                          <Moon className={`w-6 h-6 ${
                            theme === 'dark' 
                              ? 'text-white' 
                              : 'text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`} />
                        </div>
                        <span className={`text-sm font-bold ${
                          theme === 'dark' 
                            ? 'text-indigo-700 dark:text-indigo-300' 
                            : 'text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}>Dark</span>
                        <span className={`text-xs mt-1 ${
                          theme === 'dark' 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>Always</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div id="language" className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.1s'}}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Globe className="w-7 h-7 text-white" />
        </div>
        <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Language & Region</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">Choose your preferred language and regional settings</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Language Selection</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Globe className="w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <select className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-sm hover:shadow-md">
                      <option value="en">English (US)</option>
                      <option value="th">ไทย (Thai)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="ja">日本語 (Japanese)</option>
                      <option value="zh">中文 (Chinese)</option>
          </select>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Select your preferred language for the interface</p>
                </div>
              </div>
            </div>

            {/* API Settings */}
            <div id="api" className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Server className="w-7 h-7 text-white" />
        </div>
        <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">API Configuration</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">Configure API endpoints and service connections</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Data Service URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Database className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <input 
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 shadow-sm hover:shadow-md" 
                      defaultValue={import.meta.env.VITE_DATA_URL || ''}
                      placeholder="https://api.example.com"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enter the base URL for your data service endpoint</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-3 px-12 py-4 text-lg font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl ${
                  isSaving 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' 
                    : saved 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white' 
                      : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Settings...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-6 h-6" />
                    Settings Saved Successfully!
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


