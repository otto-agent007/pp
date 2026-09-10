import {
  clearSyncedQueueItems,
  createOfflineQueueItem,
  discardQueueItem,
  discardRejectedQueueEntry,
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
  reviewPersistedOfflineQueue,
} from "@pest-patrol/domain";
import type { RejectedOfflineQueueEntry } from "@pest-patrol/domain";
import type { OfflineQueueInput, OfflineQueueItem } from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";

const OFFLINE_QUEUE_STORAGE_KEY = "pest-patrol:offline-queue:v1";

interface OfflineQueueState {
  clearAll: () => void;
  clearSynced: () => void;
  discard: (id: string) => void;
  enqueue: (input: OfflineQueueInput) => OfflineQueueItem;
  hydrate: () => Promise<void>;
  items: OfflineQueueItem[];
  markFailed: (id: string, error: string) => void;
  markRetrying: (id: string, error: string) => void;
  markSynced: (id: string) => void;
  /**
   * Entries the persisted-queue validation refused, kept so the technician is
   * shown them rather than losing them on the restart that found them.
   */
  rejected: RejectedOfflineQueueEntry[];
  replaceItems: (items: OfflineQueueItem[]) => void;
}

function makeQueueId() {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Write the whole queue, including the entries this app could not read.
 *
 * A rejected entry goes back exactly as it was stored. Writing only the items
 * would delete the unreadable ones from the device on the next enqueue, which
 * is the silent loss the validation exists to prevent.
 */
function persistQueue(
  items: OfflineQueueItem[],
  rejected: RejectedOfflineQueueEntry[],
) {
  writeMobileJson(OFFLINE_QUEUE_STORAGE_KEY, [
    ...items,
    ...rejected.map((entry) => entry.entry),
  ]);
}

export const useOfflineQueue = create<OfflineQueueState>((set) => ({
  clearAll: () => {
    set({ items: [], rejected: [] });
    persistQueue([], []);
  },
  clearSynced: () => {
    set((state) => {
      const items = clearSyncedQueueItems(state.items);
      persistQueue(items, state.rejected);

      return { items };
    });
  },
  discard: (id) => {
    set((state) => {
      const items = discardQueueItem(state.items, id);
      const rejected = discardRejectedQueueEntry(state.rejected, id);
      persistQueue(items, rejected);

      return { items, rejected };
    });
  },
  enqueue: (input) => {
    const item = createOfflineQueueItem(input, { id: makeQueueId() });

    set((state) => {
      const items = [...state.items, item];
      persistQueue(items, state.rejected);

      return { items };
    });

    return item;
  },
  hydrate: async () => {
    const stored = await readMobileJson<unknown>(OFFLINE_QUEUE_STORAGE_KEY, []);
    // The device's copy is untrusted input: it is whatever survived the last
    // run, an older build's record shape, or a partial write. It used to be
    // cast straight to OfflineQueueItem[], so a queue this app could not
    // actually process became its state without anything noticing.
    const review = reviewPersistedOfflineQueue(stored);

    set({ items: review.items, rejected: review.rejected });
  },
  items: [],
  markFailed: (id, error) => {
    set((state) => ({
      items: state.items.map((item) => {
        const nextItem = item.id === id ? markQueueItemFailed(item, error) : item;

        return nextItem;
      }),
    }));
    persistQueue(
      useOfflineQueue.getState().items,
      useOfflineQueue.getState().rejected,
    );
  },
  markRetrying: (id, error) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemRetrying(item, error) : item,
      ),
    }));
    persistQueue(
      useOfflineQueue.getState().items,
      useOfflineQueue.getState().rejected,
    );
  },
  markSynced: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? markQueueItemSynced(item) : item,
      ),
    }));
    persistQueue(
      useOfflineQueue.getState().items,
      useOfflineQueue.getState().rejected,
    );
  },
  rejected: [],
  replaceItems: (items) => {
    set((state) => {
      persistQueue(items, state.rejected);

      return { items };
    });
  },
}));
