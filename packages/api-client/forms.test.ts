import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJobFormSubmissionRecord,
  listCustomerPortalFormSubmissionRecords,
  listActiveFormTemplateRecords,
  listJobFormSubmissionRecords,
} from "./forms";
import type { SupabaseProviderClient } from "./supabase";

/**
 * The provider client these tests hand in.
 *
 * It replaces the module mock that used to stand in for the `supabase`
 * singleton: the functions under test take their client now, so the double
 * is passed at the call rather than substituted for a module.
 */
const testClient = {
  from: vi.fn(),
} as unknown as SupabaseProviderClient;

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-05T18:00:00.000Z";

describe("forms api client", () => {
  const from = vi.mocked(testClient.from);

  beforeEach(() => {
    from.mockReset();
  });

  it("lists active form templates", async () => {
    const query = new MockQuery({
      data: [
        {
          id: "template-1",
          name: "Treatment Form",
          version: 1,
          schema: { fields: [] },
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    });
    from.mockReturnValue(query as never);

    const templates = await listActiveFormTemplateRecords(testClient);

    expect(templates).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("form_templates");
    expect(query.calls).toContainEqual(["eq", ["status", "active"]]);
  });

  it("lists form submissions for a job", async () => {
    const query = new MockQuery({ data: [], error: null });
    from.mockReturnValue(query as never);

    await listJobFormSubmissionRecords("job-1", testClient);

    expect(from).toHaveBeenCalledWith("job_form_submissions");
    expect(query.calls).toContainEqual(["eq", ["job_id", "job-1"]]);
  });

  it("lists customer portal form submissions for completed customer jobs", async () => {
    const query = new MockQuery({ data: [], error: null });
    from.mockReturnValue(query as never);

    await listCustomerPortalFormSubmissionRecords("customer-1", testClient);

    expect(from).toHaveBeenCalledWith("job_form_submissions");
    expect(query.calls).toContainEqual(["eq", ["job.customer_id", "customer-1"]]);
    expect(query.calls).toContainEqual(["eq", ["job.status", "completed"]]);
  });

  it("creates a job form submission", async () => {
    const query = new MockQuery({
      data: {
        id: "submission-1",
        job_id: "job-1",
        template_id: "template-1",
        form_data: { target_pests: "Ants" },
        submitted_by: null,
        submitted_at: now,
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    from.mockReturnValue(query as never);

    const submission = await createJobFormSubmissionRecord({
      job_id: "job-1",
      template_id: "template-1",
      form_data: { target_pests: "Ants" },
    }, testClient);

    expect(submission.id).toBe("submission-1");
    expect(query.calls[0]).toEqual([
      "insert",
      [
        {
          job_id: "job-1",
          template_id: "template-1",
          form_data: { target_pests: "Ants" },
          submitted_by: null,
        },
      ],
    ]);
  });
});
