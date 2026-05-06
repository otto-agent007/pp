import { create } from "zustand";

export type MobileNetworkStatus = "online" | "offline";
export type MobileSyncActivity = "idle" | "syncing";

interface SyncStatusState {
  activity: MobileSyncActivity;
  lastError: string | null;
  lastSyncAt: string | null;
  networkStatus: MobileNetworkStatus;
  markSyncFailed: (error: string) => void;
  markSyncFinished: () => void;
  markSynced: () => void;
  setActivity: (activity: MobileSyncActivity) => void;
  setNetworkStatus: (networkStatus: MobileNetworkStatus) => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  activity: "idle",
  lastError: null,
  lastSyncAt: null,
  markSyncFailed: (error) => {
    set({
      activity: "idle",
      lastError: error,
    });
  },
  markSyncFinished: () => {
    set({
      activity: "idle",
      lastError: null,
      lastSyncAt: new Date().toISOString(),
    });
  },
  markSynced: () => {
    set({
      activity: "idle",
      lastError: null,
      lastSyncAt: new Date().toISOString(),
    });
  },
  networkStatus: "online",
  setActivity: (activity) => {
    set({ activity });
  },
  setNetworkStatus: (networkStatus) => {
    set({ networkStatus });
  },
}));
