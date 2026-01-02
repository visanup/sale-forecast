import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useErrorLog } from '../hooks/useErrorLog';

const AUTO_HIDE_MS = 6000;

export function ErrorToast() {
  const { latestLog, lastAddedId } = useErrorLog();
  const [visible, setVisible] = useState(false);
  const [activeLog, setActiveLog] = useState<typeof latestLog>(null);

  useEffect(() => {
    if (!latestLog || !lastAddedId) return;
    if (latestLog.id !== lastAddedId) return;

    setActiveLog(latestLog);
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_MS);

    return () => window.clearTimeout(timer);
  }, [latestLog, lastAddedId]);

  if (!visible || !activeLog) {
    return null;
  }

  const timestamp = new Date(activeLog.timestamp).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const severity = activeLog.severity ?? 'error';
  const styleMap = {
    error: {
      container:
        'border-red-200 bg-white/95 ring-red-500/20 dark:border-red-500/40 dark:bg-gray-900/95 dark:ring-red-500/30',
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      title: 'พบข้อผิดพลาด',
      icon: AlertCircle
    },
    warning: {
      container:
        'border-amber-200 bg-white/95 ring-amber-500/20 dark:border-amber-500/40 dark:bg-gray-900/95 dark:ring-amber-500/30',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'พบคำเตือน',
      icon: AlertTriangle
    },
    info: {
      container:
        'border-blue-200 bg-white/95 ring-blue-500/20 dark:border-blue-500/40 dark:bg-gray-900/95 dark:ring-blue-500/30',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'แจ้งเตือน',
      icon: Info
    }
  } as const;
  const activeStyle = styleMap[severity];
  const Icon = activeStyle.icon;

  return (
    <div className="fixed top-24 right-6 z-[60] w-full max-w-xs sm:max-w-sm md:max-w-md">
      <div
        className={`rounded-2xl border shadow-2xl ring-1 backdrop-blur ${activeStyle.container}`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className={`mt-1 rounded-full p-2 ${activeStyle.iconBg}`}>
            <Icon className={`h-5 w-5 ${activeStyle.iconColor}`} aria-hidden="true" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-gray-900 dark:text-white">{activeStyle.title}</p>
            <p className="mt-1 text-gray-700 dark:text-gray-200">{activeLog.message}</p>
            {activeLog.source && (
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {activeLog.source}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{timestamp}</p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Dismiss error notification"
            onClick={() => setVisible(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
