import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChemicalLogs } from "./useChemicalLogs";
import { useOfflineQueue } from "./useOfflineQueue";

const asyncStorage = vi.hoisted(() => ({
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorage,
}));

const now = "2026-05-05T21:50:00.000Z";

describe("useChemicalLogs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useChemicalLogs.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
    asyncStorage.removeItem.mockReset();
    asyncStorage.getItem.mockReset();
    asyncStorage.setItem.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists chemical log drafts and hydrates them after restart", async () => {
    useChemicalLogs
      .getState()
      .setDraftField("job-1", "chemicalId", "chemical-1");
    const storedDrafts = useChemicalLogs.getState().drafts;

    expect(asyncStorage.setItem).toHaveBeenLastCalledWith(
      "pest-patrol:chemical-log-drafts:v1",
      JSON.stringify(storedDrafts),
    );

    useChemicalLogs.setState({ drafts: {} });
    asyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedDrafts));

    await useChemicalLogs.getState().hydrate();

    expect(useChemicalLogs.getState().drafts).toEqual(storedDrafts);
  });

  it("persists queued chemical log metadata", () => {
    useChemicalLogs
      .getState()
      .setDraftField("job-1", "chemicalId", "chemical-1");
    useChemicalLogs.getState().setDraftField("job-1", "amount", "2.5");
    useChemicalLogs.getState().setDraftField("job-1", "notes", "Exterior");

    useChemicalLogs.getState().queueLog("job-1");

    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      action: "chemical_log_create",
      payload: {
        amount_used: 2.5,
        chemical_id: "chemical-1",
        job_id: "job-1",
        notes: "Exterior",
      },
    });
    expect(useChemicalLogs.getState().getDraft("job-1")).toMatchObject({
      amount: "",
      chemicalId: "chemical-1",
      notes: "",
      queuedAt: now,
    });
    expect(asyncStorage.setItem).toHaveBeenLastCalledWith(
      "pest-patrol:chemical-log-drafts:v1",
      JSON.stringify(useChemicalLogs.getState().drafts),
    );
  });
});
