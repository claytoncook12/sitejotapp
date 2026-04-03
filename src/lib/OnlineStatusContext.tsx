import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

interface OnlineStatusContextValue {
  /** True network status from navigator.onLine */
  isDeviceOnline: boolean;
  /** Whether the user has manually forced offline mode */
  isForceOffline: boolean;
  /** Effective status: device is online AND not force-offline */
  isEffectivelyOnline: boolean;
  /** Toggle force-offline mode on/off */
  toggleForceOffline: () => void;
  /** Explicitly set force-offline mode */
  setForceOffline: (value: boolean) => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextValue | null>(null);

const STORAGE_KEY = "sitejot-force-offline";

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const isDeviceOnline = useOnlineStatus();
  const [isForceOffline, setIsForceOffline] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setForceOffline = useCallback((value: boolean) => {
    setIsForceOffline(value);
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const toggleForceOffline = useCallback(() => {
    setForceOffline(!isForceOffline);
  }, [isForceOffline, setForceOffline]);

  const isEffectivelyOnline = isDeviceOnline && !isForceOffline;

  return (
    <OnlineStatusContext.Provider
      value={{
        isDeviceOnline,
        isForceOffline,
        isEffectivelyOnline,
        toggleForceOffline,
        setForceOffline,
      }}
    >
      {children}
    </OnlineStatusContext.Provider>
  );
}

/**
 * Drop-in replacement for useOnlineStatus() that respects force-offline mode.
 * Returns `true` only when device is online AND force-offline is off.
 */
export function useEffectiveOnlineStatus(): boolean {
  const ctx = useContext(OnlineStatusContext);
  // Fallback to raw navigator.onLine when used outside provider
  if (!ctx) return typeof navigator !== "undefined" ? navigator.onLine : true;
  return ctx.isEffectivelyOnline;
}

/**
 * Full context access for components that need toggle controls.
 */
export function useOnlineStatusContext(): OnlineStatusContextValue {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) {
    throw new Error("useOnlineStatusContext must be used within OnlineStatusProvider");
  }
  return ctx;
}
