import * as SecureStore from "expo-secure-store";

export async function readMobileJson<T>(key: string, fallback: T): Promise<T> {
  let value: string | null = null;

  try {
    value = await SecureStore.getItemAsync(key);
  } catch {
    return fallback;
  }

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function writeMobileJson(key: string, value: unknown) {
  try {
    void SecureStore.setItemAsync(key, JSON.stringify(value)).catch(
      () => undefined,
    );
  } catch {
    // Persistence is best-effort; callers keep in-memory state usable.
  }
}
