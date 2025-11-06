import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type ErrorLogSeverity = 'error' | 'warning' | 'info';

export type ErrorLogEntry = {
  id: string;
  message: string;
  details?: string;
  source?: string;
  context?: unknown;
  severity: ErrorLogSeverity;
  timestamp: number;
  read: boolean;
};

type LoggableError =
  | string
  | Error
  | {
      message: string;
      details?: string;
      source?: string;
      context?: unknown;
      severity?: ErrorLogSeverity;
    };

type ErrorLogContextValue = {
  logs: ErrorLogEntry[];
  latestLog: ErrorLogEntry | null;
  lastAddedId: string | null;
  unreadCount: number;
  logError: (input: LoggableError) => void;
  clearLogs: () => void;
  markAllAsRead: () => void;
};

const ErrorLogContext = createContext<ErrorLogContextValue | undefined>(undefined);

const STORAGE_KEY = 'app.errorLogs';
const MAX_LOG_ENTRIES = 50;

function safeParseLogs(value: string | null): ErrorLogEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          return {
            id: String(entry.id ?? crypto.randomUUID?.() ?? Date.now().toString(36)),
            message: typeof entry.message === 'string' ? entry.message : 'Unknown error',
            details: typeof entry.details === 'string' ? entry.details : undefined,
            source: typeof entry.source === 'string' ? entry.source : undefined,
            context: entry.context,
            severity: entry.severity === 'warning' || entry.severity === 'info' ? entry.severity : 'error',
            timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
            read: Boolean(entry.read)
          } satisfies ErrorLogEntry;
        })
        .filter(Boolean) as ErrorLogEntry[];
    }
  } catch {
    // ignore parse failures
  }
  return [];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function ErrorLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ErrorLogEntry[]>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    return safeParseLogs(window.localStorage.getItem(STORAGE_KEY));
  });
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // ignore storage errors (quota, privacy mode, etc.)
    }
  }, [logs]);

  const markAllAsRead = useCallback(() => {
    setLogs((prev) => {
      if (prev.every((entry) => entry.read)) {
        return prev;
      }
      return prev.map((entry) => ({ ...entry, read: true }));
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setLastAddedId(null);
  }, []);

  const logError = useCallback((input: LoggableError) => {
    const base: ErrorLogEntry = {
      id: generateId(),
      message: 'Unexpected error',
      details: undefined,
      source: undefined,
      context: undefined,
      severity: 'error',
      timestamp: Date.now(),
      read: false
    };

    if (typeof input === 'string') {
      base.message = input;
    } else if (input instanceof Error) {
      base.message = input.message || base.message;
      base.details = input.stack || input.message;
      base.source = input.name || base.source;
    } else if (input && typeof input === 'object') {
      base.message = typeof input.message === 'string' ? input.message : base.message;
      if (typeof input.details === 'string') base.details = input.details;
      if (typeof input.source === 'string') base.source = input.source;
      if ('context' in input) base.context = input.context;
      if (input.severity === 'warning' || input.severity === 'info') {
        base.severity = input.severity;
      }
    }

    setLogs((prev) => {
      const next = [base, ...prev].slice(0, MAX_LOG_ENTRIES);
      return next;
    });
    setLastAddedId(base.id);
  }, []);

  const unreadCount = useMemo(() => logs.filter((entry) => !entry.read).length, [logs]);
  const latestLog = logs.length > 0 ? logs[0] : null;

  const value = useMemo<ErrorLogContextValue>(
    () => ({
      logs,
      latestLog,
      lastAddedId,
      unreadCount,
      logError,
      clearLogs,
      markAllAsRead
    }),
    [logs, latestLog, lastAddedId, unreadCount, logError, clearLogs, markAllAsRead]
  );

  return <ErrorLogContext.Provider value={value}>{children}</ErrorLogContext.Provider>;
}

export function useErrorLogContext(): ErrorLogContextValue {
  const ctx = useContext(ErrorLogContext);
  if (!ctx) {
    throw new Error('useErrorLog must be used within an ErrorLogProvider');
  }
  return ctx;
}
