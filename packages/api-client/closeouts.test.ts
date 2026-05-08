import { beforeEach, describe, expect, it, vi } from "vitest";

import { listCloseoutCaptureSummaryRecords } from "./closeouts";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  in(...args: unknown[]) {
    this.calls.push(["in", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

describe("closeouts api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
  });

  it("aggregates closeout capture summaries for completed jobs", async () => {
    const formsQuery = new MockQuery({
      data: [{ job_id: "job-1" }, { job_id: "job-1" }, { job_id: "job-2" }],
      error: null,
    });
    const logsQuery = new MockQuery({
      data: [{ job_id: "job-1" }],
      error: null,
    });
    const mediaQuery = new MockQuery({
      data: [
        { job_id: "job-1", media_type: "photo" },
        { job_id: "job-1", media_type: "signature" },
        { job_id: "job-2", media_type: "photo" },
      ],
      error: null,
    });
    from
      .mockReturnValueOnce(formsQuery as never)
      .mockReturnValueOnce(logsQuery as never)
      .mockReturnValueOnce(mediaQuery as never);

    const summaries = await listCloseoutCaptureSummaryRecords(["job-1", "job-2"]);

    expect(from).toHaveBeenNthCalledWith(1, "job_form_submissions");
    expect(from).toHaveBeenNthCalledWith(2, "chemical_logs");
    expect(from).toHaveBeenNthCalledWith(3, "job_media");
    expect(formsQuery.calls).toContainEqual(["select", ["job_id"]]);
    expect(formsQuery.calls).toContainEqual(["in", ["job_id", ["job-1", "job-2"]]]);
    expect(logsQuery.calls).toContainEqual(["select", ["job_id"]]);
    expect(mediaQuery.calls).toContainEqual(["select", ["job_id, media_type"]]);
    expect(summaries).toEqual([
      {
        chemicalLogs: 1,
        forms: 2,
        jobId: "job-1",
        photos: 1,
        signatures: 1,
      },
      {
        chemicalLogs: 0,
        forms: 1,
        jobId: "job-2",
        photos: 1,
        signatures: 0,
      },
    ]);
  });

  it("returns no summaries without job ids", async () => {
    await expect(listCloseoutCaptureSummaryRecords([])).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
