import { useState, useEffect } from "react";
import { getFileQueueSize } from "./offlineDb";
import { useSyncStatus } from "./offlineDb";

// 40MB soft limit for offline file storage
const QUOTA_SOFT_LIMIT = 40 * 1024 * 1024;
// 48MB hard limit - block new captures
const QUOTA_HARD_LIMIT = 48 * 1024 * 1024;

export function useStorageQuota() {
  const [usedBytes, setUsedBytes] = useState(0);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    getFileQueueSize().then(setUsedBytes);
  }, [syncStatus.pendingCount]);

  const usedMB = usedBytes / (1024 * 1024);
  const percentUsed = Math.min(100, (usedBytes / QUOTA_SOFT_LIMIT) * 100);
  const isWarning = usedBytes >= QUOTA_SOFT_LIMIT * 0.8;
  const isFull = usedBytes >= QUOTA_HARD_LIMIT;

  return {
    usedBytes,
    usedMB: Math.round(usedMB * 10) / 10,
    percentUsed: Math.round(percentUsed),
    isWarning,
    isFull,
    softLimitMB: Math.round(QUOTA_SOFT_LIMIT / (1024 * 1024)),
  };
}
