import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  KeyRound,
  Database,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { setActiveApiKey } from '../services/apiKeyStorage';
import { useErrorLog } from '../hooks/useErrorLog';

interface ApiClient {
  clientId: string;
  name: string;
  contactEmail?: string;
  isActive: boolean;
  createdAt: string;
  keyCount: number;
}

interface ApiKey {
  keyId: string;
  apiKey: string;
  scope: string;
  createdAt: string;
}

export function ApiKeysPage() {
  const { logError } = useErrorLog();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: '', contactEmail: '' });
  const [newKeyScope, setNewKeyScope] = useState('read:forecast');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);

  const reportError = (
    scope: string,
    error: any,
    fallbackMessage: string,
    context?: Record<string, unknown>
  ) => {
    console.error(scope, error);
    logError({
      message: fallbackMessage,
      source: `ApiKeysPage:${scope}`,
      details: typeof error?.stack === 'string' ? error.stack : undefined,
      context: {
        ...context,
        errorMessage:
          error?.response?.data?.error?.message ||
          error?.message ||
          (typeof error === 'string' ? error : undefined)
      }
    });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('api/v1/api-keys/clients');
      console.log('API Response:', response);
      console.log('Clients data:', response.data);
      setClients(response.data || []);
    } catch (err: any) {
      const fallback = err?.response?.data?.error?.message || err?.message || 'Failed to fetch API clients';
      reportError('fetchClients', err, 'ไม่สามารถดึงข้อมูล API Client ได้', {
        operation: 'GET /api/v1/api-keys/clients'
      });
      setError(fallback);
      setClients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('api/v1/api-keys/clients', newClient);
      setNewClient({ name: '', contactEmail: '' });
      setShowCreateClient(false);
      fetchClients();
    } catch (err: any) {
      const fallback = err?.response?.data?.error?.message || 'Failed to create API client';
      reportError('createClient', err, 'ไม่สามารถสร้าง API Client ได้', {
        payload: newClient
      });
      setError(fallback);
    }
  };

  const createKey = async (clientId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(`api/v1/api-keys/clients/${clientId}/keys`, {
        scope: newKeyScope
      });
      console.log('Create Key Response:', response);
      console.log('Created Key Data:', response.data);
      setCreatedKey(response.data);
      if (response.data?.apiKey) {
        setActiveApiKey(response.data.apiKey);
      }
      setShowCreateKey(null);
      setNewKeyScope('read:forecast');
      fetchClients();
    } catch (err: any) {
      const fallback = err?.response?.data?.error?.message || 'Failed to create API key';
      reportError('createKey', err, 'ไม่สามารถสร้าง API Key ได้', {
        clientId,
        scope: newKeyScope
      });
      setError(fallback);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`api/v1/api-keys/keys/${keyId}`);
      fetchClients();
    } catch (err: any) {
      const fallback = err?.response?.data?.error?.message || 'Failed to revoke API key';
      reportError('revokeKey', err, 'ไม่สามารถยกเลิก API Key ได้', { keyId });
      setError(fallback);
    }
  };

  const deactivateClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to deactivate this API client? All associated keys will become invalid.')) {
      return;
    }
    
    try {
      await api.delete(`api/v1/api-keys/clients/${clientId}`);
      fetchClients();
    } catch (err: any) {
      const fallback = err?.response?.data?.error?.message || 'Failed to deactivate API client';
      reportError('deactivateClient', err, 'ไม่สามารถปิดการใช้งาน API Client ได้', { clientId });
      setError(fallback);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 py-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-blue-900"></div>
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366F1' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Header Section */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">API Keys Management</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Create and manage API clients and keys to access our forecasting services. Secure, scalable, and enterprise-ready.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Create Client Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setShowCreateClient(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl"
            >
              <Plus className="w-5 h-5" />
              Create API Client
            </button>
          </div>

          {error && (
            <div className="mb-8">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-red-200/50 dark:border-red-800/50 p-8 animate-fade-in-up">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                      Error
                    </h3>
                    <p className="text-red-700 dark:text-red-300 text-lg">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {createdKey && (
            <div className="mb-8">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-green-200/50 dark:border-green-800/50 p-8 animate-fade-in-up">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-2xl">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
                      🎉 API Key Created Successfully!
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border border-green-200 dark:border-green-700">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Your API Key:
                        </p>
                        <div className="flex items-center gap-3">
                          <code className="flex-1 font-mono text-sm bg-white dark:bg-gray-800 p-4 rounded-xl break-all text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                            {createdKey.apiKey}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(createdKey.apiKey)}
                            className="p-3 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <span className="font-medium">⚠️ Copy this key now - it won't be shown again for security reasons!</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreatedKey(null)}
                    className="p-3 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-all duration-300 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-xl"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreateClient && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 max-w-md w-full animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create API Client</h2>
                </div>
                <form onSubmit={createClient} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Client Name</label>
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Email (Optional)</label>
                    <input
                      type="email"
                      value={newClient.contactEmail}
                      onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter contact email"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Create Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateClient(false)}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showCreateKey && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 max-w-md w-full animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create API Key</h2>
                </div>
                <form onSubmit={(e) => createKey(showCreateKey, e)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scope</label>
                    <select
                      value={newKeyScope}
                      onChange={(e) => setNewKeyScope(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="read:forecast">Read Forecast</option>
                      <option value="read:data">Read Data</option>
                      <option value="write:upload">Write Upload</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Create Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateKey(null)}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {!clients || clients.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-12 max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <KeyRound className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No API Clients Found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first API client to get started with our forecasting services.</p>
                  <button
                    onClick={() => setShowCreateClient(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Client
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {(clients || []).map((client, index) => (
                  <div key={client.clientId} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Database className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{client.name}</h3>
                          {client.contactEmail && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              {client.contactEmail}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Created: {new Date(client.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          client.isActive 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300' 
                            : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300'
                        }`}>
                          {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Key className="w-4 h-4" />
                          <span className="font-semibold">Active Keys: {client.keyCount}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Zap className="w-4 h-4" />
                          <span>Client ID: {client.clientId}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowCreateKey(client.clientId)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          disabled={!client.isActive}
                        >
                          <Key className="w-4 h-4 inline mr-2" />
                          Create Key
                        </button>
                        <button
                          onClick={() => deactivateClient(client.clientId)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          disabled={!client.isActive}
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
