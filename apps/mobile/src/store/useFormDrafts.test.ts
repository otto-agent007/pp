import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFormDrafts } from "./useFormDrafts";
import { useOfflineQueue } from "./useOfflineQueue";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStore);

const now = "2026-05-07T17:15:00.000Z";

describe("useFormDrafts persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useFormDrafts.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
    secureStore.deleteItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists treatment form drafts and hydrates them after restart", async () => {
    useFormDrafts
      .getState()
      .setFieldValue("job-1", "target_pests", "Ants");
    const key = `job-1:${defaultTreatmentFormTemplate.id}`;
    const storedDrafts = useFormDrafts.getState().drafts;

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:form-drafts:v1",
      JSON.stringify(storedDrafts),
    );

    useFormDrafts.setState({ drafts: {} });
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(storedDrafts));

    await useFormDrafts.getState().hydrate();

    expect(useFormDrafts.getState().drafts[key]).toEqual(storedDrafts[key]);
  });

  it("persists queued draft metadata after enqueueing a form submission", () => {
    useFormDrafts
      .getState()
      .setFieldValue("job-1", "target_pests", "Ants");
    useFormDrafts
      .getState()
      .setFieldValue("job-1", "areas_treated", "Kitchen");

    useFormDrafts.getState().enqueueDraft("job-1");

    expect(useFormDrafts.getState().getDraft("job-1")).toMatchObject({
      queued_at: now,
    });
    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:form-drafts:v1",
      JSON.stringify(useFormDrafts.getState().drafts),
    );
  });
});
