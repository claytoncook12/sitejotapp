import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { runSync } from "../lib/offlineDb";
import { toast } from "sonner";

/**
 * SyncManager: watches online status and triggers sync when coming back online.
 * Must be rendered inside ConvexAuthProvider.
 */
export function SyncManager() {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Convex mutations we'll delegate to during sync
  const createVisit = useMutation(api.visits.create);
  const createObservation = useMutation(api.observations.create);
  const generateUploadUrl = useMutation(api.observations.generateUploadUrl);

  const doSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const result = await runSync({
        callMutation: async (name: string, args: Record<string, unknown>) => {
          switch (name) {
            case "visits.create":
              return await createVisit(args as { siteId: any; visitDate: string });
            case "observations.create":
              return await createObservation(args as any);
            default:
              throw new Error(`Unknown mutation: ${name}`);
          }
        },
        generateUploadUrl: async () => {
          return await generateUploadUrl();
        },
      });

      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} offline change${result.synced !== 1 ? "s" : ""}`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} change${result.failed !== 1 ? "s" : ""} failed to sync`);
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Sync failed — will retry on next connection");
    } finally {
      isSyncingRef.current = false;
    }
  }, [createVisit, createObservation, generateUploadUrl]);

  // Sync when coming back online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      // Small delay to let Convex WebSocket reconnect
      const timer = setTimeout(doSync, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, doSync]);

  // Also attempt sync on mount (in case there are leftover pending mutations from a previous session)
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(doSync, 3000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
