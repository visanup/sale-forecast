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
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: '', contactEmail: '' });
  const [newKeyScope, setNewKeyScope] = useState('read:forecast');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('api/v1/api-keys/clients');
      setClients(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch API clients');
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
      setError(err.response?.data?.error?.message || 'Failed to create API client');
    }
  };

  const createKey = async (clientId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(`api/v1/api-keys/clients/${clientId}/keys`, {
        scope: newKeyScope
      });
      setCreatedKey(response.data.data);
      setShowCreateKey(null);
      setNewKeyScope('read:forecast');
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create API key');
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
      setError(err.response?.data?.error?.message || 'Failed to revoke API key');
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
      setError(err.response?.data?.error?.message || 'Failed to deactivate API client');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-blue-600/5 dark:from-brand-600/10 dark:to-blue-600/10"></div>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand-600 to-blue-600 rounded-xl shadow-lg">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  API Keys Management
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                Create and manage API clients and keys to access our forecasting services. Secure, scalable, and enterprise-ready.
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateClient(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-blue-600 text-white font-medium rounded-xl hover:from-brand-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Create API Client
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">

        {error && (
          <div className="mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                    Error
                  </h3>
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {createdKey && (
          <div className="mb-8">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
                    🎉 API Key Created Successfully!
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your API Key:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-lg break-all text-gray-800 dark:text-gray-200">
                          {createdKey.apiKey}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(createdKey.apiKey)}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>⚠️ Copy this key now - it won't be shown again for security reasons!</span>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCreatedKey(null)}
                  className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

      {showCreateClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create API Client</h2>
            <form onSubmit={createClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email (Optional)</label>
                <input
                  type="email"
                  value={newClient.contactEmail}
                  onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateClient(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
            <form onSubmit={(e) => createKey(showCreateKey, e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  value={newKeyScope}
                  onChange={(e) => setNewKeyScope(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="read:forecast">Read Forecast</option>
                  <option value="read:data">Read Data</option>
                  <option value="write:upload">Write Upload</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateKey(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No API clients found. Create your first client to get started.</p>
          </div>
        ) : (
          clients.map(client => (
            <div key={client.clientId} className="card p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{client.name}</h3>
                  {client.contactEmail && (
                    <p className="text-sm text-gray-600">{client.contactEmail}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created: {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => setShowCreateKey(client.clientId)}
                    className="px-3 py-1 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
                    disabled={!client.isActive}
                  >
                    Create Key
                  </button>
                  <button
                    onClick={() => deactivateClient(client.clientId)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    disabled={!client.isActive}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Active Keys: {client.keyCount}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
