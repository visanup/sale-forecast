import { useEffect, useState } from 'react';
import { logsApi } from '../services/api';
import { 
  Terminal, 
  RefreshCw, 
  Filter,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Activity
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  data?: any;
  requestId?: string;
}

interface LogStats {
  totalLogs: number;
  firstEntry: any;
  lastEntry: any;
}

type UploaderInfo = {
  id?: string;
  username?: string;
};

const NESTED_USER_KEYS = ['uploadedBy', 'uploader', 'user', 'actor', 'owner', 'creator'];
const ID_KEYS = ['userId', 'id', 'uploadedById', 'uploaderId', 'ownerId', 'actorId'];
const USERNAME_KEYS = ['username', 'userName', 'email', 'actorUsername'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDisplayString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function extractUploaderInfo(data: unknown): UploaderInfo {
  const info: UploaderInfo = {};
  if (!isRecord(data)) return info;

  const queue: Record<string, unknown>[] = [data];

  while (queue.length && (!info.id || !info.username)) {
    const current = queue.shift()!;
    for (const [key, value] of Object.entries(current)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (!info.id && ID_KEYS.includes(key)) {
          info.id = String(value);
        }
        if (!info.username && USERNAME_KEYS.includes(key)) {
          info.username = String(value);
        }
      } else if (isRecord(value)) {
        if (NESTED_USER_KEYS.includes(key)) {
          const nestedId =
            toDisplayString(value['id']) ||
            toDisplayString(value['userId']) ||
            toDisplayString(value['uid']);
          if (!info.id && nestedId) {
            info.id = nestedId;
          }

          const nestedUsername =
            toDisplayString(value['username']) ||
            toDisplayString(value['userName']) ||
            toDisplayString(value['email']) ||
            toDisplayString(value['name']);
          if (!info.username && nestedUsername) {
            info.username = nestedUsername;
          }
        }
        queue.push(value);
      }
    }
  }

  return info;
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState({
    service: '',
    level: '',
    limit: 100
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logsApi.getLogs({
        service: filters.service || undefined,
        level: filters.level || undefined,
        limit: filters.limit
      });
      
      setLogs(response.data.logs);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await logsApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    try {
      await logsApi.clearLogs();
      fetchLogs();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to clear logs');
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters]);

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <Activity className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'debug':
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-blue-600/5 dark:from-brand-600/10 dark:to-blue-600/10"></div>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand-600 to-blue-600 rounded-xl shadow-lg">
                  <Terminal className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  System Logs
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                Real-time logs from all microservices. Monitor system activity and troubleshoot issues.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  autoRefresh
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </button>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={clearLogs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        {/* Stats */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Logs</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLogs}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Displaying</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Auto Refresh</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {autoRefresh ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <select
                value={filters.service}
                onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Services</option>
                <option value="auth-service">Auth Service</option>
                <option value="data-service">Data Service</option>
                <option value="dim-service">Dim Service</option>
                <option value="ingest-service">Ingest Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Limit
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ service: '', level: '', limit: 100 })}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Error</h3>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Terminal className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const uploaderInfo = extractUploaderInfo(log.data);
              const hasUploaderInfo = Boolean(uploaderInfo.id || uploaderInfo.username);
              const hasData = Array.isArray(log.data)
                ? log.data.length > 0
                : isRecord(log.data)
                  ? Object.keys(log.data).length > 0
                  : log.data !== undefined && log.data !== null && String(log.data).length > 0;

              return (
                <div
                  key={log.id}
                  className={`border rounded-xl p-4 ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                          {log.service}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          {log.level}
                        </span>
                        {log.requestId && (
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {log.requestId}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-white">{log.message}</p>
                      {hasData && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                            Show data
                          </summary>
                          <div className="mt-2 space-y-2">
                            {hasUploaderInfo && (
                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs text-gray-700 dark:text-gray-200">
                                {uploaderInfo.id && (
                                  <div>
                                    <span className="font-semibold text-gray-900 dark:text-white">Uploader ID:</span>{' '}
                                    {uploaderInfo.id}
                                  </div>
                                )}
                                {uploaderInfo.username && (
                                  <div>
                                    <span className="font-semibold text-gray-900 dark:text-white">Username:</span>{' '}
                                    {uploaderInfo.username}
                                  </div>
                                )}
                              </div>
                            )}
                            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

