import AsyncStorage from "@react-native-async-storage/async-storage";

import { useMobilePersistenceHealth } from "./mobilePersistenceHealth";

/**
 * Where the app's unsent field work lives between launches.
 *
 * This used to be `expo-secure-store`, which was wrong twice over.
 *
 * SecureStore rejects any key that is not `/^[\w.-]+$/`, and every key this
 * module is called with is of the form `pest-patrol:offline-queue:v1`. The
 * colons made each call reject, `writeMobileJson` swallowed the rejection with
 * `.catch(() => undefined)` and `readMobileJson` swallowed it by returning the
 * fallback, so **nothing was ever persisted**: the offline queue, the form,
 * photo, signature, chemical-log and geofence drafts, and the language
 * preference were all lost on every restart, silently. The 2026-09-10 security
 * review found the swallowed failure and the size problem below; the invalid
 * keys turned up on the way to fixing them, and nothing had to be migrated off
 * SecureStore because nothing could ever have been written there.
 *
 * Even with valid keys it was the wrong store. SecureStore is a keystore: its
 * documented Android value limit is about 2 KB, and the queue is a single key
 * holding every unsent item, including signature PNGs as base64 data URIs.
 * AsyncStorage has no such limit and no key restriction, and none of this data
 * is a secret -- the auth session, which is, stays in SecureStore behind
 * supabase-js in `src/lib/supabase.ts`.
 *
 * Failures are now reported rather than swallowed. Persistence is still
 * best-effort in the sense that the app keeps working from memory, but the
 * technician is told when the device has stopped keeping their work.
 */

function failureReason(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function readMobileJson<T>(key: string, fallback: T): Promise<T> {
  let value: string | null = null;

  try {
    value = await AsyncStorage.getItem(key);
  } catch (error) {
    useMobilePersistenceHealth.getState().recordFailure(key, failureReason(error));
    return fallback;
  }

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    // Unparseable stored state is not a device failure: it is an older or
    // partial record, which the queue's own hydrate validation reports in the
    // terms the technician needs. Fall back rather than raise a storage alarm.
    return fallback;
  }
}

/**
 * Persist a value, and say whether it landed.
 *
 * Returns a promise so tests and future callers can await the result; callers
 * inside a zustand `set` do not, because the in-memory state is already
 * correct by then and blocking a reducer on I/O would be worse. The failure
 * still reaches the technician through `useMobilePersistenceHealth`.
 */
export function writeMobileJson(key: string, value: unknown): Promise<boolean> {
  const health = useMobilePersistenceHealth.getState();
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    health.recordFailure(key, failureReason(error));
    return Promise.resolve(false);
  }

  let pending: Promise<unknown>;

  try {
    // Promise.resolve so a backend that throws synchronously, or one that
    // returns nothing, cannot escape into the zustand reducer that called us.
    pending = Promise.resolve(AsyncStorage.setItem(key, serialized));
  } catch (error) {
    health.recordFailure(key, failureReason(error));
    return Promise.resolve(false);
  }

  return pending.then(
    () => {
      health.clearFailure(key);
      return true;
    },
    (error: unknown) => {
      health.recordFailure(key, failureReason(error));
      return false;
    },
  );
}
