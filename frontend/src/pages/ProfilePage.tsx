import { useEffect, useMemo, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Camera, 
  Save, 
  Check, 
  Edit3,
  Shield,
  Award,
  Activity,
  X
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  const displayName = useMemo(() => {
    if (firstName) return firstName;
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0]!;
    return 'Your Name';
  }, [firstName, user?.firstName, user?.username, user?.email]);

  const initials = useMemo(() => {
    const source = (firstName || user?.firstName || user?.username || user?.email || 'User')
      .trim()
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return source || 'U';
  }, [firstName, user?.firstName, user?.username, user?.email]);

  const primaryEmail = user?.email || 'you@example.com';

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await authApi.updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined
      });
      const updatedUser = (response as any)?.data ?? response;
      if (updatedUser) {
        setUser(updatedUser);
        setIsEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-indigo-900 py-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl mb-6 shadow-2xl">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">Profile</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Manage your personal information and preferences with our intuitive interface</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Sidebar */}
          <div>
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 sticky top-8 hover:shadow-3xl transition-all duration-300">
              {/* Profile Picture */}
              <div className="text-center mb-8">
                <div className="relative inline-block group">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 mx-auto shadow-2xl ring-4 ring-white/20 dark:ring-gray-700/20 group-hover:scale-105 transition-transform duration-300">
                    {initials}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{displayName}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">{primaryEmail}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Online</span>
                </div>
              </div>

              {/* Profile Stats */}
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Member since</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">January 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Role</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Administrator</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Security</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">2FA Enabled</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
        <div>
            {/* Personal Information */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-7 h-7 text-white" />
        </div>
        <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Update your personal details and preferences</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setFirstName(user?.firstName ?? '');
                      setLastName(user?.lastName ?? '');
                      setErrorMessage(null);
                    }
                    setIsEditing(!isEditing);
                  }}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isEditing 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              <form className="space-y-8">
                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-300 shadow-sm">
                    {errorMessage}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                          isEditing 
                            ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400' 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Last Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                          isEditing 
                            ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400' 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                        'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                      type="email"
                      value={primaryEmail}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input 
                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                          isEditing 
                            ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400' 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                        placeholder="+1 (555) 123-4567"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input 
                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                          isEditing 
                            ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400' 
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                        type="date"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${
                        isEditing 
                          ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                      placeholder="123 Main St, City, State 12345"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`flex items-center gap-3 px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        isSaving 
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' 
                          : saved 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white' 
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <Check className="w-5 h-5" />
                          Saved Successfully!
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
        </div>
        </div>
      </div>
    </div>
  );
}
