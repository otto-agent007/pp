import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useJobs } from "../../hooks/useJobs";
import { useChemicalLogs } from "../../hooks/useInventory";
import {
  isComplianceSchemaUnavailableError,
  useComplianceAdvisoryAudits,
  useComplianceChunks,
  useComplianceDocuments,
  useComplianceSources,
  useCreateComplianceAdvisory,
} from "../../hooks/useCompliance";
import { ComplianceClient } from "./compliance-client";

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/useInventory", () => ({
  useChemicalLogs: vi.fn(),
}));

vi.mock("../../hooks/useCompliance", () => ({
  isComplianceSchemaUnavailableError: vi.fn(),
  useComplianceAdvisoryAudits: vi.fn(),
  useComplianceChunks: vi.fn(),
  useComplianceDocuments: vi.fn(),
  useComplianceSources: vi.fn(),
  useCreateComplianceAdvisory: vi.fn(),
}));

const now = "2026-05-16T12:00:00.000Z";
const source = {
  id: "source-1",
  title: "DPR structural recordkeeping",
  url: "https://www.cdpr.ca.gov/",
  jurisdiction: "california",
  authority: "cdpr",
  workflow: "chemical_application",
  branch: "branch_2",
  effective_date: "2026-01-01",
  retrieved_at: now,
  source_hash: "hash-1",
  review_status: "reviewed",
  created_at: now,
  updated_at: now,
} as const;
const document = {
  id: "document-1",
  source_id: "source-1",
  title: "Recordkeeping update",
  document_url: "https://www.cdpr.ca.gov/",
  content_type: "text/html",
  retrieved_at: now,
  source_hash: "hash-1",
  review_status: "reviewed",
  raw_text: null,
  created_at: now,
  updated_at: now,
  source,
} as const;
const chunk = {
  id: "chunk-1",
  source_id: "source-1",
  document_id: "document-1",
  chunk_index: 0,
  heading: "Use records",
  content: "Application time and registration number are required.",
  tokens_estimate: 10,
  metadata: {},
  created_at: now,
  updated_at: now,
  document,
  source,
} as const;

describe("ComplianceClient", () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useComplianceSources).mockReturnValue({
      data: [source],
    } as never);
    vi.mocked(isComplianceSchemaUnavailableError).mockReturnValue(false);
    vi.mocked(useComplianceDocuments).mockReturnValue({
      data: [document],
    } as never);
    vi.mocked(useComplianceChunks).mockReturnValue({
      data: [chunk],
    } as never);
    vi.mocked(useComplianceAdvisoryAudits).mockReturnValue({
      data: [],
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [],
    } as never);
    vi.mocked(useChemicalLogs).mockReturnValue({
      data: [],
    } as never);
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({
      advisory: {
        citations: [
          {
            authority: "cdpr",
            chunk_id: "chunk-1",
            document_title: "Recordkeeping update",
            excerpt: "Application time and registration number are required.",
            source_title: "DPR structural recordkeeping",
            url: "https://www.cdpr.ca.gov/",
          },
        ],
        findings: [],
        generated_at: now,
        required_fields: [
          {
            field: "application_time",
            label: "Application time",
            reason: "Required for use records.",
            status: "present",
          },
        ],
        review_task: null,
        status: "advisory_ready",
        summary: "Chemical application advisory is ready with 1 cited source.",
        workflow: "chemical_application",
      },
      runtime: {
        available: true,
        provider: "openai",
        reason: null,
        requiredEnvName: "OPENAI_API_KEY",
      },
    });
    vi.mocked(useCreateComplianceAdvisory).mockReturnValue({
      isPending: false,
      mutateAsync,
    } as never);
  });

  it("renders knowledge-base counts and workflow surfaces", () => {
    render(<ComplianceClient />);

    expect(screen.getByRole("heading", { name: "Compliance RAG" })).toBeInTheDocument();
    expect(screen.getByText("Reviewed sources")).toBeInTheDocument();
    expect(screen.getByText("Source readiness")).toBeInTheDocument();
    expect(screen.getByText(/Ready workflows:/)).toBeInTheDocument();
    expect(screen.getByText("Chemical review")).toBeInTheDocument();
    expect(screen.getAllByText("Recurring routes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("WDO / Branch 3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Multi-unit audits").length).toBeGreaterThan(0);
    expect(screen.getByText("1 reviewed, 0 draft")).toBeInTheDocument();
  });

  it("runs advisory requests through the server hook and renders citations", async () => {
    const user = userEvent.setup();
    render(<ComplianceClient />);

    await user.click(screen.getByRole("button", { name: "Run advisory" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ workflow: "chemical_application" }),
    );
    expect(
      await screen.findByText("Chemical application advisory is ready with 1 cited source."),
    ).toBeInTheDocument();
    expect(screen.getByText("DPR structural recordkeeping")).toBeInTheDocument();
  });

  it("renders schema-unavailable setup state without raw Supabase details", () => {
    const schemaError = Object.assign(
      new Error('relation "public.compliance_sources" does not exist'),
      { code: "42P01" },
    );
    vi.mocked(useComplianceSources).mockReturnValue({
      data: undefined,
      error: schemaError,
    } as never);
    vi.mocked(isComplianceSchemaUnavailableError).mockImplementation(
      (error) => error === schemaError,
    );

    render(<ComplianceClient />);

    expect(screen.getByText("Compliance setup required")).toBeInTheDocument();
    expect(
      screen.getByText(/20260516175724_california_compliance_rag_v1.sql/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Setup required" }),
    ).toBeDisabled();
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/compliance_sources/)).not.toBeInTheDocument();
  });
});
