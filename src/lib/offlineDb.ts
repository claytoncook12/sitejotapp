import { openDB, type IDBPDatabase } from "idb";
import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useEffectiveOnlineStatus } from "./OnlineStatusContext";

// ── IndexedDB Schema ────────────────────────────────────────────────

const DB_NAME = "sitejot-offline";
const DB_VERSION = 1;

interface SiteJotDB {
  queryCache: {
    key: string;
    value: {
      queryKey: string;
      data: unknown;
      updatedAt: number;
    };
  };
  pendingMutations: {
    key: number;
    value: PendingMutation;
  };
  idMap: {
    key: string;
    value: {
      tempId: string;
      serverId: string;
      tableName: string;
    };
  };
  fileQueue: {
    key: string;
    value: {
      tempFileId: string;
      blob: Blob;
      mimeType: string;
      status: "pending" | "uploading" | "uploaded";
      serverId?: string;
    };
  };
}

export interface PendingMutation {
  id?: number; // auto-increment
  mutationName: string;
  args: Record<string, unknown>;
  tempId?: string; // temp ID this mutation creates
  tempIdTable?: string; // which table the temp ID is for
  dependsOnTempIds?: string[]; // temp IDs that must resolve first
  fileFieldName?: string; // which arg field holds a tempFileId
  status: "pending" | "syncing" | "synced" | "failed";
  error?: string;
  createdAt: number;
  localOrder?: number; // for observation ordering in UI
}

let dbPromise: Promise<IDBPDatabase<SiteJotDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SiteJotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SiteJotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("queryCache")) {
          db.createObjectStore("queryCache", { keyPath: "queryKey" });
        }
        if (!db.objectStoreNames.contains("pendingMutations")) {
          db.createObjectStore("pendingMutations", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains("idMap")) {
          db.createObjectStore("idMap", { keyPath: "tempId" });
        }
        if (!db.objectStoreNames.contains("fileQueue")) {
          db.createObjectStore("fileQueue", { keyPath: "tempFileId" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Event emitter for sync status ───────────────────────────────────

type SyncStatusListener = () => void;
const syncListeners = new Set<SyncStatusListener>();
let currentSyncStatus = { pendingCount: 0, isSyncing: false };

function notifySyncListeners() {
  syncListeners.forEach((l) => l());
}

function setSyncStatus(update: Partial<typeof currentSyncStatus>) {
  currentSyncStatus = { ...currentSyncStatus, ...update };
  notifySyncListeners();
}

export function useSyncStatus() {
  const status = useSyncExternalStore(
    (cb) => {
      syncListeners.add(cb);
      return () => syncListeners.delete(cb);
    },
    () => currentSyncStatus,
    () => currentSyncStatus,
  );
  return status;
}

// ── Temp ID generation ──────────────────────────────────────────────

let tempCounter = 0;
export function generateTempId(table: string): string {
  return `temp_${table}_${Date.now()}_${++tempCounter}`;
}

export function isTempId(id: string): boolean {
  return typeof id === "string" && id.startsWith("temp_");
}

// ── Query Cache ─────────────────────────────────────────────────────

function makeQueryKey(queryName: string, args: Record<string, unknown>): string {
  return `${queryName}::${JSON.stringify(args, Object.keys(args).sort())}`;
}

export async function cacheQueryResult(
  queryName: string,
  args: Record<string, unknown>,
  data: unknown,
): Promise<void> {
  const db = await getDb();
  const queryKey = makeQueryKey(queryName, args);
  await db.put("queryCache", {
    queryKey,
    data,
    updatedAt: Date.now(),
  });
}

export async function getCachedQuery(
  queryName: string,
  args: Record<string, unknown>,
): Promise<unknown | undefined> {
  const db = await getDb();
  const queryKey = makeQueryKey(queryName, args);
  const result = await db.get("queryCache", queryKey);
  return result?.data;
}

// ── Pending Mutations ───────────────────────────────────────────────

export async function queueMutation(mutation: Omit<PendingMutation, "id" | "status" | "createdAt">): Promise<number> {
  const db = await getDb();
  const entry: PendingMutation = {
    ...mutation,
    status: "pending",
    createdAt: Date.now(),
  };
  const id = await db.add("pendingMutations", entry as PendingMutation & { id: number });
  await refreshPendingCount();
  return id as number;
}

export async function getPendingMutations(): Promise<(PendingMutation & { id: number })[]> {
  const db = await getDb();
  const all = await db.getAll("pendingMutations");
  return all.filter((m) => m.status === "pending" || m.status === "syncing") as (PendingMutation & { id: number })[];
}

export async function getAllPendingMutations(): Promise<(PendingMutation & { id: number })[]> {
  const db = await getDb();
  return (await db.getAll("pendingMutations")) as (PendingMutation & { id: number })[];
}

export async function updateMutationStatus(
  id: number,
  status: PendingMutation["status"],
  error?: string,
): Promise<void> {
  const db = await getDb();
  const entry = await db.get("pendingMutations", id);
  if (entry) {
    entry.status = status;
    if (error) entry.error = error;
    await db.put("pendingMutations", entry);
    await refreshPendingCount();
  }
}

export async function clearSyncedMutations(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll("pendingMutations");
  const tx = db.transaction("pendingMutations", "readwrite");
  for (const m of all) {
    if (m.status === "synced" && m.id != null) {
      await tx.store.delete(m.id);
    }
  }
  await tx.done;
  await refreshPendingCount();
}

async function refreshPendingCount() {
  const pending = await getPendingMutations();
  setSyncStatus({ pendingCount: pending.length });
}

// ── ID Map ──────────────────────────────────────────────────────────

export async function storeIdMapping(tempId: string, serverId: string, tableName: string): Promise<void> {
  const db = await getDb();
  await db.put("idMap", { tempId, serverId, tableName });
}

export async function resolveId(id: string): Promise<string> {
  if (!isTempId(id)) return id;
  const db = await getDb();
  const mapping = await db.get("idMap", id);
  if (!mapping) throw new Error(`No server ID found for temp ID: ${id}`);
  return mapping.serverId;
}

export async function tryResolveId(id: string): Promise<string | null> {
  if (!isTempId(id)) return id;
  const db = await getDb();
  const mapping = await db.get("idMap", id);
  return mapping?.serverId ?? null;
}

// ── File Queue ──────────────────────────────────────────────────────

export async function queueFile(tempFileId: string, blob: Blob, mimeType: string): Promise<void> {
  const db = await getDb();
  await db.put("fileQueue", {
    tempFileId,
    blob,
    mimeType,
    status: "pending",
  });
}

export async function getQueuedFile(tempFileId: string) {
  const db = await getDb();
  return db.get("fileQueue", tempFileId);
}

export async function updateFileStatus(
  tempFileId: string,
  status: "pending" | "uploading" | "uploaded",
  serverId?: string,
): Promise<void> {
  const db = await getDb();
  const entry = await db.get("fileQueue", tempFileId);
  if (entry) {
    entry.status = status;
    if (serverId) entry.serverId = serverId;
    await db.put("fileQueue", entry);
  }
}

export async function removeQueuedFile(tempFileId: string): Promise<void> {
  const db = await getDb();
  await db.delete("fileQueue", tempFileId);
}

export async function getFileQueueSize(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll("fileQueue");
  let total = 0;
  for (const f of all) {
    total += f.blob.size;
  }
  return total;
}

// ── Sync Engine ─────────────────────────────────────────────────────

let isSyncingNow = false;

interface SyncContext {
  callMutation: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  generateUploadUrl: () => Promise<string>;
}

/**
 * Replays all pending mutations in order. Called when coming back online.
 * 
 * The callMutation function should call the actual Convex mutation.
 * The generateUploadUrl function should call the Convex upload URL generator.
 */
export async function runSync(ctx: SyncContext): Promise<{ synced: number; failed: number }> {
  if (isSyncingNow) return { synced: 0, failed: 0 };
  isSyncingNow = true;
  setSyncStatus({ isSyncing: true });

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingMutations();

    for (const mutation of pending) {
      try {
        await updateMutationStatus(mutation.id, "syncing");

        // Resolve any temp IDs in the args
        const resolvedArgs = await resolveArgsIds(mutation.args, mutation.dependsOnTempIds);

        // Handle file uploads if needed
        if (mutation.fileFieldName && mutation.args[mutation.fileFieldName]) {
          const tempFileId = mutation.args[mutation.fileFieldName] as string;
          if (isTempId(tempFileId)) {
            const fileEntry = await getQueuedFile(tempFileId);
            if (fileEntry) {
              await updateFileStatus(tempFileId, "uploading");
              const uploadUrl = await ctx.generateUploadUrl();
              const uploadResult = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": fileEntry.mimeType },
                body: fileEntry.blob,
              });
              if (!uploadResult.ok) {
                throw new Error(`File upload failed: ${uploadResult.statusText}`);
              }
              const { storageId } = await uploadResult.json();
              resolvedArgs[mutation.fileFieldName] = storageId;
              await updateFileStatus(tempFileId, "uploaded", storageId);
              await removeQueuedFile(tempFileId);
            }
          }
        }

        // Call the actual mutation
        const result = await ctx.callMutation(mutation.mutationName, resolvedArgs);

        // If this mutation creates a new entity, store the ID mapping
        if (mutation.tempId && result && typeof result === "string") {
          await storeIdMapping(mutation.tempId, result, mutation.tempIdTable || "unknown");
        }

        await updateMutationStatus(mutation.id, "synced");
        synced++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Sync failed for mutation ${mutation.id} (${mutation.mutationName}):`, message);
        await updateMutationStatus(mutation.id, "failed", message);
        failed++;

        // If a create failed, skip dependent mutations
        if (mutation.tempId) {
          const remaining = await getPendingMutations();
          for (const dep of remaining) {
            if (dep.dependsOnTempIds?.includes(mutation.tempId)) {
              await updateMutationStatus(
                dep.id,
                "failed",
                `Dependency failed: ${mutation.tempId}`,
              );
              failed++;
            }
          }
        }
      }
    }

    await clearSyncedMutations();
  } finally {
    isSyncingNow = false;
    await refreshPendingCount();
    setSyncStatus({ isSyncing: false });
  }

  return { synced, failed };
}

async function resolveArgsIds(
  args: Record<string, unknown>,
  dependsOnTempIds?: string[],
): Promise<Record<string, unknown>> {
  const resolved = { ...args };

  // Resolve known temp ID fields
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string" && isTempId(value)) {
      const serverId = await tryResolveId(value);
      if (serverId) {
        resolved[key] = serverId;
      } else if (dependsOnTempIds?.includes(value)) {
        throw new Error(`Unresolved dependency: ${value}`);
      }
    }
  }

  return resolved;
}

// ── React Hooks ─────────────────────────────────────────────────────

/**
 * useOfflineQuery: wraps Convex useQuery with offline caching.
 * 
 * - When online and data is available: returns server data, caches it
 * - When offline: returns cached data
 * - Merges in pending mutations that affect this query
 */
export function useOfflineQuery<T>(
  convexQueryResult: T | undefined,
  queryName: string,
  args: Record<string, unknown>,
  mergePending?: (data: T, pending: PendingMutation[]) => T,
): T | undefined {
  const [cachedData, setCachedData] = useState<T | undefined>(undefined);
  const isOnline = useEffectiveOnlineStatus();
  const pendingRef = useRef<PendingMutation[]>([]);
  const [, forceUpdate] = useState(0);

  // Stable serialized args — only changes when the actual content changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const argsKey = JSON.stringify(args);

  // Cache server data when it arrives
  useEffect(() => {
    if (convexQueryResult !== undefined) {
      const parsed = JSON.parse(argsKey);
      cacheQueryResult(queryName, parsed, convexQueryResult);
      // Only update state if the data actually changed to avoid re-render loops
      setCachedData((prev) => {
        const newStr = JSON.stringify(convexQueryResult);
        return JSON.stringify(prev) === newStr ? prev : convexQueryResult;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexQueryResult, queryName, argsKey]);

  // Load from cache when offline and no server data
  useEffect(() => {
    if (convexQueryResult === undefined) {
      const parsed = JSON.parse(argsKey);
      getCachedQuery(queryName, parsed).then((cached) => {
        if (cached !== undefined) {
          setCachedData(cached as T);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexQueryResult, queryName, argsKey]);

  // Load pending mutations for merge
  useEffect(() => {
    getAllPendingMutations().then((all) => {
      pendingRef.current = all;
      forceUpdate((n) => n + 1);
    });

    // Re-check on sync status changes
    const unsub = () => {
      getAllPendingMutations().then((all) => {
        pendingRef.current = all;
        forceUpdate((n) => n + 1);
      });
    };
    syncListeners.add(unsub);
    return () => { syncListeners.delete(unsub); };
  }, []);

  const baseData = convexQueryResult ?? cachedData;

  if (mergePending) {
    const dataForMerge = baseData !== undefined ? baseData : ([] as unknown as T);
    return mergePending(dataForMerge, pendingRef.current);
  }

  return baseData;
}

/**
 * useOfflineMutation: wraps Convex mutation with offline queuing.
 * 
 * - When online: calls Convex directly
 * - When offline: queues the mutation in IndexedDB
 */
export function useOfflineMutation() {
  const queueOffline = useCallback(
    async (options: {
      mutationName: string;
      args: Record<string, unknown>;
      tempId?: string;
      tempIdTable?: string;
      dependsOnTempIds?: string[];
      fileFieldName?: string;
    }) => {
      const id = await queueMutation({
        mutationName: options.mutationName,
        args: options.args,
        tempId: options.tempId,
        tempIdTable: options.tempIdTable,
        dependsOnTempIds: options.dependsOnTempIds,
        fileFieldName: options.fileFieldName,
      });
      return id;
    },
    [],
  );

  return { queueOffline };
}

// ── Offline Data Inspection ─────────────────────────────────────────

export interface CachedQueryEntry {
  queryKey: string;
  queryName: string;
  updatedAt: number;
}

export async function getCachedQueryEntries(): Promise<CachedQueryEntry[]> {
  const db = await getDb();
  const all = await db.getAll("queryCache");
  return all.map((entry) => ({
    queryKey: entry.queryKey,
    queryName: entry.queryKey.split("::")[0],
    updatedAt: entry.updatedAt,
  }));
}

export interface QueuedFileEntry {
  tempFileId: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "uploading" | "uploaded";
}

export async function getQueuedFiles(): Promise<QueuedFileEntry[]> {
  const db = await getDb();
  const all = await db.getAll("fileQueue");
  return all.map((f) => ({
    tempFileId: f.tempFileId,
    mimeType: f.mimeType,
    sizeBytes: f.blob.size,
    status: f.status,
  }));
}

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDb();
  const tx1 = db.transaction("queryCache", "readwrite");
  await tx1.store.clear();
  await tx1.done;
  const tx2 = db.transaction("pendingMutations", "readwrite");
  await tx2.store.clear();
  await tx2.done;
  const tx3 = db.transaction("idMap", "readwrite");
  await tx3.store.clear();
  await tx3.done;
  const tx4 = db.transaction("fileQueue", "readwrite");
  await tx4.store.clear();
  await tx4.done;
  await refreshPendingCount();
}

export async function clearQueryCache(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("queryCache", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// ── Initialize on load ──────────────────────────────────────────────

// Refresh pending count on module load
getDb().then(() => refreshPendingCount());
