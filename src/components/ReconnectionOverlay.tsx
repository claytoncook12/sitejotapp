import { useState, useEffect, useRef } from "react";
import { useOnlineStatusContext } from "../lib/OnlineStatusContext";
import { useSyncStatus } from "../lib/offlineDb";

/**
 * Brief overlay when coming back online: "Back online — syncing N changes..."
 * Automatically dismisses after sync completes (or after timeout).
 */
export function ReconnectionOverlay() {
  const { isEffectivelyOnline } = useOnlineStatusContext();
  const { pendingCount, isSyncing } = useSyncStatus();
  const [show, setShow] = useState(false);
  const [syncingCount, setSyncingCount] = useState(0);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isEffectivelyOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current && isEffectivelyOnline) {
      wasOfflineRef.current = false;
      setSyncingCount(pendingCount);
      if (pendingCount > 0) {
        setShow(true);
      }
    }
  }, [isEffectivelyOnline, pendingCount]);

  // Auto-dismiss after sync completes or after 8 seconds
  useEffect(() => {
    if (show) {
      // Dismiss when syncing finishes
      if (!isSyncing && syncingCount > 0 && pendingCount === 0) {
        timerRef.current = setTimeout(() => setShow(false), 2000);
        return () => clearTimeout(timerRef.current);
      }
      // Safety timeout
      timerRef.current = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(timerRef.current);
    }
  }, [show, isSyncing, pendingCount, syncingCount]);

  if (!show) return null;

  const isDone = !isSyncing && pendingCount === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity print:hidden">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-8 py-6 max-w-sm mx-4 text-center space-y-4">
        {isDone ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">All Synced</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {syncingCount} change{syncingCount !== 1 ? "s" : ""} synced successfully
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Back Online</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Syncing {syncingCount} change{syncingCount !== 1 ? "s" : ""}…
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: syncingCount > 0
                    ? `${Math.max(10, ((syncingCount - pendingCount) / syncingCount) * 100)}%`
                    : "10%"
                }}
              />
            </div>
          </>
        )}

        <button
          onClick={() => setShow(false)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
