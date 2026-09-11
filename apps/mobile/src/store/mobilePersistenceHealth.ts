import { create } from "zustand";

/**
 * Whether the device is actually keeping what the app writes to it.
 *
 * `writeMobileJson` used to swallow every failure, so a write that never
 * landed was indistinguishable from one that did. The queue and the drafts
 * are the technician's unsent field work; if the device stops storing them,
 * that has to reach the technician rather than be discovered after a restart
 * when the work is already gone.
 *
 * Keyed by storage key so one failing store does not report the others as
 * broken, and so a key that recovers clears itself.
 */
interface MobilePersistenceHealthState {
  clearFailure: (key: string) => void;
  failures: Record<string, string>;
  recordFailure: (key: string, reason: string) => void;
}

export const useMobilePersistenceHealth = create<MobilePersistenceHealthState>(
  (set) => ({
    failures: {},
    clearFailure: (key) =>
      set((state) => {
        if (!(key in state.failures)) {
          return state;
        }

        const failures = { ...state.failures };
        delete failures[key];

        return { failures };
      }),
    recordFailure: (key, reason) =>
      set((state) => ({ failures: { ...state.failures, [key]: reason } })),
  }),
);

export function hasMobilePersistenceFailure(
  failures: Record<string, string>,
) {
  return Object.keys(failures).length > 0;
}
