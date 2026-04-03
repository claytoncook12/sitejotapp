import { useState, useEffect, useCallback } from "react";
import { useEffectiveOnlineStatus } from "../lib/OnlineStatusContext";
import {
  useSyncStatus,
  getAllPendingMutations,
  getQueuedFiles,
  type PendingMutation,
  type QueuedFileEntry,
} from "../lib/offlineDb";
import { useStorageQuota } from "../lib/useStorageQuota";

/**
 * Floating action button (bottom-right) showing pending change count.
 * Tapping opens a mini popup with sync queue details.
 * Only appears when there are pending changes or user is offline.
 */
export function OfflineStatusFAB() {
  const isOnline = useEffectiveOnlineStatus();
  const { pendingCount, isSyncing } = useSyncStatus();
  const storageQuota = useStorageQuota();
  const [showPopup, setShowPopup] = useState(false);
  const [mutations, setMutations] = useState<(PendingMutation & { id: number })[]>([]);
  const [files, setFiles] = useState<QueuedFileEntry[]>([]);

  const refreshData = useCallback(async () => {
    const [muts, fs] = await Promise.all([getAllPendingMutations(), getQueuedFiles()]);
    setMutations(muts);
    setFiles(fs);
  }, []);

  useEffect(() => {
    if (showPopup) refreshData();
  }, [showPopup, pendingCount, refreshData]);

  // Hide when fully online with nothing pending
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const activeMutations = mutations.filter((m) => m.status !== "synced");
  const failedCount = mutations.filter((m) => m.status === "failed").length;

  const friendlyName = (name: string) => {
    switch (name) {
      case "visits.create": return "Create Visit";
      case "observations.create": return "Create Observation";
      default: return name;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Popup */}
      {showPopup && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPopup(false)} />
          <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden">
            {/* Popup Header */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sync Status</h3>
                {isSyncing && (
                  <span className="flex items-center gap-1 text-xs text-blue-500">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing…
                  </span>
                )}
              </div>
            </div>

            {/* Storage */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">File storage</span>
                <span className={`font-medium ${storageQuota.isWarning ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`}>
                  {storageQuota.usedMB} / {storageQuota.softLimitMB} MB
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    storageQuota.isFull ? "bg-red-500" : storageQuota.isWarning ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, storageQuota.percentUsed)}%` }}
                />
              </div>
            </div>

            {/* Mutations List */}
            <div className="max-h-60 overflow-y-auto">
              {activeMutations.length === 0 && files.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 italic text-center">
                  No pending changes
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeMutations.map((m) => (
                    <div key={m.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {friendlyName(m.mutationName)}
                        </p>
                        {m.error && (
                          <p className="text-xs text-red-500 truncate">{m.error}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 ml-2 px-1.5 py-0.5 text-xs rounded font-medium ${
                        m.status === "pending"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : m.status === "syncing"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {m.status === "pending" ? "Queued" : m.status === "syncing" ? "Syncing" : "Failed"}
                      </span>
                    </div>
                  ))}
                  {files.map((f) => (
                    <div key={f.tempFileId} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {f.mimeType.startsWith("image/") ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {f.mimeType.startsWith("image/") ? "Photo" : "Video"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatBytes(f.sizeBytes)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Failed warning */}
            {failedCount > 0 && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {failedCount} failed — will retry on reconnect
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* FAB button */}
      <button
        onClick={() => setShowPopup(!showPopup)}
        className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
          isSyncing
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : failedCount > 0
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-amber-500 hover:bg-amber-600 text-slate-900"
        }`}
      >
        {isSyncing ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
        {/* Badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white shadow">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
