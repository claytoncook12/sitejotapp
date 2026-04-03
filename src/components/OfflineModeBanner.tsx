import { useOnlineStatusContext } from "../lib/OnlineStatusContext";
import { useSyncStatus } from "../lib/offlineDb";
import { useStorageQuota } from "../lib/useStorageQuota";

/**
 * Persistent amber banner across the top when offline.
 * Replaces the old OfflineBanner in Option 3.
 * Shows force-offline toggle, storage, and pending count.
 */
export function OfflineModeBanner() {
  const { isEffectivelyOnline, isForceOffline, isDeviceOnline, toggleForceOffline } =
    useOnlineStatusContext();
  const { pendingCount } = useSyncStatus();
  const storageQuota = useStorageQuota();

  if (isEffectivelyOnline && pendingCount === 0) return null;

  return (
    <div className="bg-amber-500 text-slate-900 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-900"></span>
              </span>
              <span className="font-semibold text-sm uppercase tracking-wide">
                {isForceOffline && isDeviceOnline ? "Manual Offline Mode" : "Offline Mode"}
              </span>
            </div>
            <span className="text-sm opacity-80 hidden sm:inline">
              — working with cached data
              {pendingCount > 0 && (
                <span className="font-medium opacity-100"> · {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}</span>
              )}
            </span>
            {pendingCount > 0 && (
              <span className="text-xs font-medium sm:hidden">
                ({pendingCount} pending)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Storage mini-bar (only when there are queued files) */}
            {storageQuota.usedMB > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs opacity-70">{storageQuota.usedMB}MB</span>
                <div className="w-16 bg-slate-900/20 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      storageQuota.isFull ? "bg-red-600" : storageQuota.isWarning ? "bg-orange-600" : "bg-slate-900/60"
                    }`}
                    style={{ width: `${Math.min(100, storageQuota.percentUsed)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Go Online button (only for force-offline) */}
            {isForceOffline && isDeviceOnline && (
              <button
                onClick={toggleForceOffline}
                className="px-3 py-1 text-xs font-semibold bg-white/90 hover:bg-white text-slate-900 rounded-full transition-colors"
              >
                Go Online
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Navbar toggle button for force-offline mode.
 * Airplane icon that turns amber when active.
 */
export function OfflineToggleButton() {
  const { isEffectivelyOnline, isForceOffline, toggleForceOffline } = useOnlineStatusContext();

  return (
    <button
      onClick={toggleForceOffline}
      className={`relative p-2 rounded-lg transition-colors ${
        isForceOffline
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          : !isEffectivelyOnline
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
      }`}
      title={isForceOffline ? "Disable offline mode" : "Enable offline mode"}
    >
      {/* Airplane icon */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
      {/* Active indicator */}
      {isForceOffline && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
      )}
    </button>
  );
}
