import {
  clearSyncedQueueItems,
  createOfflineQueueItem,
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
} from "@pest-patrol/domain";
import type { OfflineQueueInput, OfflineQueueItem } from "@pest-patrol/types";
import { create } from "zustand";

type MobileOfflinePayload = Record<string, unknown>;

interface OfflineQueueState {
  clearAll: () => void;
  clearSynced: () => void;
  enqueue: (
    input: OfflineQueueInput<MobileOfflinePayload>,
  ) => OfflineQueueItem<MobileOfflinePayload>;
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
  },
  clearSynced: () => {
    set((state) => ({ items: clearSyncedQueueItems(state.items) }));
  },
  enqueue: (input) => {
    const item = createOfflineQueueItem(input, { id: makeQueueId() });

    set((state) => ({ items: [...state.items, item] }));

    return item;
  },
  items: [],
  markFailed: (id, error) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemFailed(item, error) : item,
      ),
    }));
  },
  markRetrying: (id, error) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemRetrying(item, error) : item,
      ),
    }));
  },
  markSynced: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemSynced(item) : item,
      ),
    }));
  },
  replaceItems: (items) => {
    set({ items });
  },
}));
