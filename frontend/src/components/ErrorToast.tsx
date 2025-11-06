import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
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

  return (
    <div className="fixed top-24 right-6 z-[60] w-full max-w-xs sm:max-w-sm md:max-w-md">
      <div className="rounded-2xl border border-red-200 bg-white/95 shadow-2xl ring-1 ring-red-500/20 backdrop-blur dark:border-red-500/40 dark:bg-gray-900/95 dark:ring-red-500/30">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-1 rounded-full bg-red-50 p-2 dark:bg-red-500/10">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-gray-900 dark:text-white">พบข้อผิดพลาด</p>
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
