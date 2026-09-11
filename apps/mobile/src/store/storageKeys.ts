/**
 * Every key the app persists under, in one place.
 *
 * These used to be a private constant inside each store, which meant nothing
 * could check them as a set. That mattered: the previous backend,
 * expo-secure-store, rejects any key that is not `/^[\w.-]+$/`, and every one
 * of these contains colons -- so every read and write rejected, both paths
 * swallowed the rejection, and none of this data ever persisted. Listing them
 * here lets `mobilePersistence.test.ts` round-trip all of them through the real
 * backend by construction, so a new store is covered the moment it is added
 * and a backend that cannot hold these keys fails a test instead of silently
 * losing the technician's field work.
 *
 * The auth session is deliberately absent: it is a secret, it stays in
 * expo-secure-store behind supabase-js, and it is keyed by that library.
 */
export const mobileStorageKeys = {
  chemicalLogDrafts: "pest-patrol:chemical-log-drafts:v1",
  formDrafts: "pest-patrol:form-drafts:v1",
  jobGeofenceDrafts: "pest-patrol:job-geofence-drafts:v1",
  jobPhotoDrafts: "pest-patrol:job-photo-drafts:v1",
  jobSignatureDrafts: "pest-patrol:job-signature-drafts:v1",
  languagePreference: "pest-patrol:language-preference:v1",
  offlineQueue: "pest-patrol:offline-queue:v1",
} as const;
