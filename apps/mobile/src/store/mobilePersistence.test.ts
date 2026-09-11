import { beforeEach, describe, expect, it, vi } from "vitest";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { useMobilePersistenceHealth } from "./mobilePersistenceHealth";
import { mobileStorageKeys } from "./storageKeys";

const asyncStorage = vi.hoisted(() => {
  const values = new Map<string, string>();

  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorage,
}));

/**
 * Every key the app persists under, taken from the single declaration the
 * stores themselves use, so a store added later is covered the moment its key
 * joins the map rather than whenever someone remembers to update a list here.
 *
 * This is the regression guard for what went wrong. The previous backend,
 * expo-secure-store, rejects any key that is not `/^[\w.-]+$/`, and every one
 * of these contains colons -- so every read and write rejected, both paths
 * swallowed it, and nothing persisted, ever. A backend swapped in later that
 * cannot hold these exact keys fails here instead of silently losing the
 * technician's field work again.
 */
const storageKeys = Object.values(mobileStorageKeys);

describe("mobile persistence", () => {
  beforeEach(() => {
    asyncStorage.values.clear();
    asyncStorage.getItem.mockClear();
    asyncStorage.setItem.mockClear();
    useMobilePersistenceHealth.setState({ failures: {} });
  });

  it.each(storageKeys)("round-trips %s through the storage backend", async (key) => {
    const value = { captured: true, key };

    await expect(writeMobileJson(key, value)).resolves.toBe(true);
    await expect(readMobileJson(key, null)).resolves.toEqual(value);
    expect(useMobilePersistenceHealth.getState().failures).toEqual({});
  });

  it("covers every store the app has", () => {
    expect(storageKeys).toHaveLength(7);
  });

  it("returns the fallback when nothing is stored", async () => {
    await expect(
      readMobileJson("pest-patrol:offline-queue:v1", []),
    ).resolves.toEqual([]);
  });

  it("records a failure the technician can be shown when a write rejects", async () => {
    asyncStorage.setItem.mockRejectedValueOnce(new Error("quota exceeded"));

    await expect(
      writeMobileJson("pest-patrol:offline-queue:v1", [{ id: "queued" }]),
    ).resolves.toBe(false);

    expect(useMobilePersistenceHealth.getState().failures).toEqual({
      "pest-patrol:offline-queue:v1": "quota exceeded",
    });
  });

  it("records a failure when the backend throws synchronously", async () => {
    asyncStorage.setItem.mockImplementationOnce(() => {
      throw new Error("invalid key");
    });

    await expect(
      writeMobileJson("pest-patrol:offline-queue:v1", []),
    ).resolves.toBe(false);

    expect(
      useMobilePersistenceHealth.getState().failures[
        "pest-patrol:offline-queue:v1"
      ],
    ).toBe("invalid key");
  });

  it("clears a key's failure once a later write lands", async () => {
    asyncStorage.setItem.mockRejectedValueOnce(new Error("device full"));
    await writeMobileJson("pest-patrol:offline-queue:v1", []);
    expect(useMobilePersistenceHealth.getState().failures).not.toEqual({});

    await writeMobileJson("pest-patrol:offline-queue:v1", []);
    expect(useMobilePersistenceHealth.getState().failures).toEqual({});
  });

  it("keeps one failing store from reporting the others as broken", async () => {
    asyncStorage.setItem.mockRejectedValueOnce(new Error("device full"));
    await writeMobileJson("pest-patrol:offline-queue:v1", []);
    await writeMobileJson("pest-patrol:form-drafts:v1", {});

    expect(
      Object.keys(useMobilePersistenceHealth.getState().failures),
    ).toEqual(["pest-patrol:offline-queue:v1"]);
  });

  it("records a failure when a read rejects", async () => {
    asyncStorage.getItem.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      readMobileJson("pest-patrol:form-drafts:v1", { fallback: true }),
    ).resolves.toEqual({ fallback: true });
    expect(
      useMobilePersistenceHealth.getState().failures[
        "pest-patrol:form-drafts:v1"
      ],
    ).toBe("storage unavailable");
  });

  it("treats unreadable stored JSON as absent rather than as a device failure", async () => {
    asyncStorage.values.set("pest-patrol:offline-queue:v1", "{not json");

    await expect(
      readMobileJson("pest-patrol:offline-queue:v1", []),
    ).resolves.toEqual([]);
    // The queue's own hydrate validation reports a bad record in the terms the
    // technician needs; raising a storage alarm here would double-report it.
    expect(useMobilePersistenceHealth.getState().failures).toEqual({});
  });

  it("reports a value that cannot be serialised instead of throwing", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(
      writeMobileJson("pest-patrol:form-drafts:v1", circular),
    ).resolves.toBe(false);
    expect(
      useMobilePersistenceHealth.getState().failures[
        "pest-patrol:form-drafts:v1"
      ],
    ).toBeDefined();
    expect(asyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("holds a payload far larger than the keystore limit that forced this move", async () => {
    // A signature PNG arrives as a base64 data URI. expo-secure-store's
    // documented Android value limit is about 2 KB, and the queue is one key
    // holding every unsent item.
    const signature = `data:image/png;base64,${"A".repeat(200_000)}`;

    await expect(
      writeMobileJson("pest-patrol:offline-queue:v1", [{ signature }]),
    ).resolves.toBe(true);
    await expect(
      readMobileJson("pest-patrol:offline-queue:v1", []),
    ).resolves.toEqual([{ signature }]);
  });
});
