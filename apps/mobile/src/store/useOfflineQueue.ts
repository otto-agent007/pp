import {
  clearSyncedQueueItems,
  createOfflineQueueItem,
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
} from "@pest-patrol/domain";
import type { OfflineQueueInput, OfflineQueueItem } from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";

type MobileOfflinePayload = Record<string, unknown>;
const OFFLINE_QUEUE_STORAGE_KEY = "pest-patrol:offline-queue:v1";

interface OfflineQueueState {
  clearAll: () => void;
  clearSynced: () => void;
  enqueue: (
    input: OfflineQueueInput<MobileOfflinePayload>,
  ) => OfflineQueueItem<MobileOfflinePayload>;
  hydrate: () => Promise<void>;
  items: OfflineQueueItem<MobileOfflinePayload>[];
  markFailed: (id: string, error: string) => void;
  markRetrying: (id: string, error: string) => void;
  markSynced: (id: string) => void;
  replaceItems: (items: OfflineQueueItem<MobileOfflinePayload>[]) => void;
}

function makeQueueId() {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useOfflineQueue = create<OfflineQueueState>((set) => ({
  clearAll: () => {
    set({ items: [] });
    writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, []);
  },
  clearSynced: () => {
    set((state) => {
      const items = clearSyncedQueueItems(state.items);
      writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, items);

      return { items };
    });
  },
  enqueue: (input) => {
    const item = createOfflineQueueItem(input, { id: makeQueueId() });

    set((state) => {
      const items = [...state.items, item];
      writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, items);

      return { items };
    });

    return item;
  },
  hydrate: async () => {
    const items = await readMobileJson<OfflineQueueItem<MobileOfflinePayload>[]>(
      OFFLINE_QUEUE_STORAGE_KEY,
      [],
    );

    set({ items });
  },
  items: [],
  markFailed: (id, error) => {
    set((state) => ({
      items: state.items.map((item) => {
        const nextItem = item.id === id ? markQueueItemFailed(item, error) : item;

        return nextItem;
      }),
    }));
    writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, useOfflineQueue.getState().items);
  },
  markRetrying: (id, error) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemRetrying(item, error) : item,
      ),
    }));
    writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, useOfflineQueue.getState().items);
  },
  markSynced: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemSynced(item) : item,
      ),
    }));
    writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, useOfflineQueue.getState().items);
  },
  replaceItems: (items) => {
    set({ items });
    writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, items);
  },
}));
