import { useState, useEffect, useCallback } from "react";
import { useOnlineStatusContext } from "../lib/OnlineStatusContext";
import {
  useSyncStatus,
  getAllPendingMutations,
  getCachedQueryEntries,
  getQueuedFiles,
  clearAllOfflineData,
  clearQueryCache,
  updateMutationStatus,
  type PendingMutation,
  type CachedQueryEntry,
  type QueuedFileEntry,
} from "../lib/offlineDb";
import { useStorageQuota } from "../lib/useStorageQuota";
import { toast } from "sonner";

interface OfflineDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function OfflineDrawer({ open, onClose }: OfflineDrawerProps) {
  const { isDeviceOnline, isForceOffline, isEffectivelyOnline, toggleForceOffline } =
    useOnlineStatusContext();
  const { pendingCount, isSyncing } = useSyncStatus();
  const storageQuota = useStorageQuota();

  const [cachedQueries, setCachedQueries] = useState<CachedQueryEntry[]>([]);
  const [pendingMutations, setPendingMutations] = useState<(PendingMutation & { id: number })[]>([]);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFileEntry[]>([]);

  const refreshData = useCallback(async () => {
    const [queries, mutations, files] = await Promise.all([
      getCachedQueryEntries(),
      getAllPendingMutations(),
      getQueuedFiles(),
    ]);
    setCachedQueries(queries);
    setPendingMutations(mutations);
    setQueuedFiles(files);
  }, []);

  // Refresh data when drawer opens or sync status changes
  useEffect(() => {
    if (open) {
      refreshData();
    }
  }, [open, pendingCount, isSyncing, refreshData]);

  const handleClearCache = async () => {
    await clearQueryCache();
    toast.success("Cache cleared");
    refreshData();
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all offline data? Pending changes that haven't synced will be lost.")) {
      return;
    }
    await clearAllOfflineData();
    toast.success("All offline data cleared");
    refreshData();
  };

  const handleDiscardMutation = async (id: number) => {
    await updateMutationStatus(id, "synced"); // Mark as synced so it gets cleaned up
    toast.info("Discarded failed change");
    refreshData();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diffMin = Math.round((now - ts) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const friendlyQueryName = (entry: CachedQueryEntry) => {
    const name = entry.queryName;
    const data = entry.data as Record<string, unknown> | unknown[] | null;

    switch (name) {
      case "sites.list":
        if (Array.isArray(data)) return `All Sites (${data.length})`;
        return "All Sites";
      case "sites.get": {
        const siteName = data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>).name
          : null;
        return siteName ? `Site: ${siteName}` : "Site Detail";
      }
      case "visits.list": {
        const count = Array.isArray(data) ? data.length : null;
        return count != null ? `Visits (${count})` : "Visits";
      }
      case "observations.listByVisit": {
        const count = Array.isArray(data) ? data.length : null;
        return count != null ? `Observations (${count})` : "Observations";
      }
      default:
        return name
          .split(".")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" → ");
    }
  };

  const friendlyMutationName = (name: string) => {
    switch (name) {
      case "visits.create": return "Create Visit";
      case "observations.create": return "Create Observation";
      default: return name;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>;
      case "syncing":
        return <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Syncing</span>;
      case "synced":
        return <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Synced</span>;
      case "failed":
        return <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  const activeMutations = pendingMutations.filter((m) => m.status !== "synced");
  const failedMutations = pendingMutations.filter((m) => m.status === "failed");

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-800 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Offline Status</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

            {/* Connection Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isEffectivelyOnline ? "bg-green-500" : "bg-amber-500"} ${!isEffectivelyOnline ? "animate-pulse" : ""}`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {!isDeviceOnline
                      ? "No Internet Connection"
                      : isForceOffline
                        ? "Manual Offline Mode"
                        : "Connected"}
                  </span>
                </div>
                {isSyncing && (
                  <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing…
                  </span>
                )}
              </div>

              {/* Force Offline Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Force Offline</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Work offline while connected</p>
                  </div>
                </div>
                <button
                  onClick={toggleForceOffline}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                    isForceOffline ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  role="switch"
                  aria-checked={isForceOffline}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isForceOffline ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Storage</h3>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">File queue</span>
                  <span className={`font-medium ${storageQuota.isWarning ? "text-amber-600 dark:text-amber-400" : storageQuota.isFull ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {storageQuota.usedMB} / {storageQuota.softLimitMB} MB
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      storageQuota.isFull
                        ? "bg-red-500"
                        : storageQuota.isWarning
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, storageQuota.percentUsed)}%` }}
                  />
                </div>
                {storageQuota.isFull && (
                  <p className="text-xs text-red-500 dark:text-red-400">Storage full — new captures blocked</p>
                )}
                {storageQuota.isWarning && !storageQuota.isFull && (
                  <p className="text-xs text-amber-500 dark:text-amber-400">Storage running low</p>
                )}
              </div>
            </div>

            {/* Pending Mutations */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Changes ({activeMutations.length})
              </h3>
              {activeMutations.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No pending changes</p>
              ) : (
                <div className="space-y-1.5">
                  {activeMutations.map((mutation) => (
                    <div
                      key={mutation.id}
                      className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {friendlyMutationName(mutation.mutationName)}
                        </span>
                        {statusBadge(mutation.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatTime(mutation.createdAt)}
                        </span>
                        {mutation.status === "failed" && (
                          <button
                            onClick={() => handleDiscardMutation(mutation.id)}
                            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Discard
                          </button>
                        )}
                      </div>
                      {mutation.error && (
                        <p className="text-xs text-red-500 dark:text-red-400 truncate" title={mutation.error}>
                          {mutation.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Queued Files */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Queued Files ({queuedFiles.length})
              </h3>
              {queuedFiles.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No queued files</p>
              ) : (
                <div className="space-y-1.5">
                  {queuedFiles.map((file) => (
                    <div
                      key={file.tempFileId}
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {file.mimeType.startsWith("image/") ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {file.mimeType.startsWith("image/") ? "Photo" : "Video"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusBadge(file.status)}
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatBytes(file.sizeBytes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cached Queries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cached Data ({cachedQueries.length})
                </h3>
                {cachedQueries.length > 0 && (
                  <button
                    onClick={handleClearCache}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear cache
                  </button>
                )}
              </div>
              {cachedQueries.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No cached data</p>
              ) : (
                <div className="space-y-1.5">
                  {cachedQueries.map((entry) => (
                    <div
                      key={entry.queryKey}
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {friendlyQueryName(entry)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">
                        {formatTime(entry.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Failed Mutations Warning */}
            {failedMutations.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {failedMutations.length} failed change{failedMutations.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  These changes could not sync. They will be retried on next connection, or you can discard them above.
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <button
              onClick={handleClearAll}
              className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              Clear All Offline Data
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Status chip for the navbar that opens the drawer.
 */
export function OfflineStatusChip({ onClick }: { onClick: () => void }) {
  const { isEffectivelyOnline, isForceOffline } = useOnlineStatusContext();
  const { pendingCount, isSyncing } = useSyncStatus();

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        !isEffectivelyOnline
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
          : isSyncing
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${
        !isEffectivelyOnline ? "bg-amber-500 animate-pulse" : isSyncing ? "bg-blue-500 animate-pulse" : "bg-green-500"
      }`} />
      {!isEffectivelyOnline ? (
        <>
          {isForceOffline ? "Manual Offline" : "Offline"}
          {pendingCount > 0 && ` (${pendingCount})`}
        </>
      ) : isSyncing ? (
        "Syncing…"
      ) : (
        "Online"
      )}
    </button>
  );
}
