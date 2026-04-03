import { useOnlineStatusContext } from "../lib/OnlineStatusContext";
import { useSyncStatus } from "../lib/offlineDb";

export function OfflineBanner() {
  const { isEffectivelyOnline, isForceOffline, isDeviceOnline } = useOnlineStatusContext();
  const { pendingCount, isSyncing } = useSyncStatus();

  if (isEffectivelyOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium shadow-lg transition-colors ${
        !isEffectivelyOnline
          ? "bg-amber-500 text-slate-900"
          : isSyncing
            ? "bg-blue-500 text-white"
            : "bg-amber-400 text-slate-900"
      }`}
    >
      {!isEffectivelyOnline ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {isForceOffline && isDeviceOnline
            ? "Manual Offline Mode"
            : "Offline"} — changes will sync when you reconnect
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </span>
      ) : isSyncing ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Syncing changes…
        </span>
      ) : pendingCount > 0 ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Syncing {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}…
        </span>
      ) : null}
    </div>
  );
}
