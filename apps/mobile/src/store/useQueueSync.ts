import { processOfflineQueueItems } from "@pest-patrol/domain";
import { create } from "zustand";

import { mobileSupabase } from "../lib/supabase";
import { useOfflineQueue } from "./useOfflineQueue";
import { useSyncStatus } from "./useSyncStatus";

interface QueueSyncState {
  error: string | null;
  syncNow: () => Promise<void>;
}

function syncErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sync queued changes";
}

export const useQueueSync = create<QueueSyncState>((set) => ({
  error: null,
  syncNow: async () => {
    const syncStatus = useSyncStatus.getState();

    if (syncStatus.activity === "syncing") {
      return;
    }

    if (syncStatus.networkStatus === "offline") {
      const error = "Device is offline";
      syncStatus.markSyncFailed(error);
      set({ error });
      return;
    }

    syncStatus.setActivity("syncing");
    set({ error: null });

    try {
      const result = await processOfflineQueueItems(
        useOfflineQueue.getState().items,
        { client: mobileSupabase },
      );

      useOfflineQueue.getState().replaceItems(result.items);

      if (result.summary.failed > 0) {
        const error = "Some queued changes failed to sync";
        syncStatus.markSyncFailed(error);
        set({ error });
        return;
      }

      syncStatus.markSyncFinished();
      set({ error: null });
    } catch (error) {
      const message = syncErrorMessage(error);
      syncStatus.markSyncFailed(message);
      set({ error: message });
    }
  },
}));
