import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComplianceReviewItems } from "./useComplianceReviewItems";
import {
  isComplianceSchemaUnavailableError,
  useComplianceAdvisoryAudits,
  useComplianceChunks,
  useComplianceDocuments,
  useComplianceSources,
} from "./useCompliance";
import { useChemicalLogs } from "./useInventory";
import { useJobs } from "./useJobs";

vi.mock("./useCompliance", () => ({
  isComplianceSchemaUnavailableError: vi.fn(
    (error: unknown) =>
      Boolean(error) &&
      typeof error === "object" &&
      (error as { code?: string }).code === "42P01",
  ),
  useComplianceAdvisoryAudits: vi.fn(),
  useComplianceChunks: vi.fn(),
  useComplianceDocuments: vi.fn(),
  useComplianceSources: vi.fn(),
}));

vi.mock("./useInventory", () => ({
  useChemicalLogs: vi.fn(),
}));

vi.mock("./useJobs", () => ({
  useJobs: vi.fn(),
}));

const now = "2026-06-04T12:00:00.000Z";
const customer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: null,
  email: null,
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const location = {
  id: "location-1",
  customer_id: "customer-1",
  address: "10 Pine Street",
  nickname: null,
  service_notes: null,
  is_primary: true,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const completedJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: now,
  scheduled_end: null,
  status: "completed",
  service_notes: "Quarterly service",
  created_at: now,
  updated_at: now,
  customer,
  location,
} as const;
const complianceChemicalLog = {
  id: "log-1",
  job_id: "job-1",
  chemical_id: "chemical-1",
  amount_used: 2,
  notes: "Kitchen baseboards",
  created_at: now,
  chemical: {
    id: "chemical-1",
    name: "Bait Gel",
    epa_number: "EPA-123",
    current_stock: 10,
    unit: "oz",
    reorder_level: 4,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  job: completedJob,
} as const;

function queryResult(data: unknown[] = [], error: unknown = null) {
  return {
    data,
    error,
    isLoading: false,
  } as never;
}

describe("useComplianceReviewItems", () => {
  beforeEach(() => {
    vi.mocked(useJobs).mockReturnValue(queryResult([completedJob]));
    vi.mocked(useChemicalLogs).mockReturnValue(queryResult([]));
    vi.mocked(useComplianceSources).mockReturnValue(queryResult([]));
    vi.mocked(useComplianceDocuments).mockReturnValue(queryResult([]));
    vi.mocked(useComplianceChunks).mockReturnValue(queryResult([]));
    vi.mocked(useComplianceAdvisoryAudits).mockReturnValue(queryResult([]));
    vi.mocked(isComplianceSchemaUnavailableError).mockClear();
  });

  it("builds deterministic review items and job guardrails from loaded data", () => {
    vi.mocked(useChemicalLogs).mockReturnValue(
      queryResult([complianceChemicalLog]),
    );

    const { result } = renderHook(() =>
      useComplianceReviewItems({ jobs: [completedJob] }),
    );

    expect(result.current.schemaUnavailable).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.setupWarning).toBeNull();
    expect(result.current.summary.openItems).toBeGreaterThan(0);
    expect(result.current.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobId: "job-1",
          title: "Bait Gel chemical review",
        }),
      ]),
    );

    const guardrail = result.current.buildGuardrailForJob("job-1");
    expect(guardrail.status).toBe("warning");
    expect(guardrail.items).toHaveLength(1);
    expect(result.current.guardrailByJobId(["job-1"]).get("job-1")).toEqual(
      guardrail,
    );
    expect(result.current.guardrailSummaryForJobs(["job-1"])).toEqual({
      clearJobs: 0,
      criticalJobs: 0,
      totalJobs: 1,
      warningJobs: 1,
    });
  });

  it("returns sanitized setup state and clear guardrails when compliance schema is unavailable", () => {
    const schemaError = Object.assign(
      new Error('relation "public.compliance_sources" does not exist'),
      { code: "42P01" },
    );
    vi.mocked(useComplianceSources).mockReturnValue(
      queryResult(undefined as never, schemaError),
    );
    vi.mocked(useChemicalLogs).mockReturnValue(
      queryResult([complianceChemicalLog]),
    );

    const { result } = renderHook(() =>
      useComplianceReviewItems({ jobs: [completedJob] }),
    );

    expect(result.current.schemaUnavailable).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.summary.openItems).toBe(0);
    expect(result.current.setupReadiness?.status).toBe("schema_unavailable");
    expect(result.current.setupWarning).toBe(
      "Compliance advisory review data is unavailable. Continue the workflow, then review compliance setup from the Compliance page.",
    );
    expect(result.current.setupWarning).not.toMatch(/relation|compliance_sources/i);
    expect(result.current.buildGuardrailForJob("job-1").status).toBe("clear");
    expect(result.current.guardrailSummaryForJobs(["job-1"])).toEqual({
      clearJobs: 1,
      criticalJobs: 0,
      totalJobs: 1,
      warningJobs: 0,
    });
  });
});
