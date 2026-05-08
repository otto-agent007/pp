import * as SecureStore from "expo-secure-store";

export async function readMobileJson<T>(key: string, fallback: T): Promise<T> {
  const value = await SecureStore.getItemAsync(key);

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
  void SecureStore.setItemAsync(key, JSON.stringify(value));
}
