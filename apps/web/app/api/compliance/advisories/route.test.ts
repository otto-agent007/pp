import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const createComplianceAdvisoryAuditRecord = vi.fn();
const isComplianceSchemaUnavailableError = vi.fn();
const listChemicalLogRecords = vi.fn();
const listJobRecords = vi.fn();
const searchComplianceChunkRecords = vi.fn();
let adminResponse: Response | null = null;
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", () => ({
  createComplianceAdvisoryAuditRecord: (
    input: unknown,
    client: unknown,
  ) => createComplianceAdvisoryAuditRecord(input, client),
  isComplianceSchemaUnavailableError: (error: unknown) =>
    isComplianceSchemaUnavailableError(error),
  listChemicalLogRecords: (client: unknown) => listChemicalLogRecords(client),
  listJobRecords: (client: unknown) => listJobRecords(client),
  searchComplianceChunkRecords: (input: unknown, client: unknown) =>
    searchComplianceChunkRecords(input, client),
}));

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminResponse
        ? { access: null, response: adminResponse }
        : { access: { userId: "admin-1" }, response: null },
    ),
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
};
const chunk = {
  id: "chunk-1",
  source_id: "source-1",
  document_id: "document-1",
  chunk_index: 0,
  heading: "Use records",
  content:
    "Structural pesticide use records include application time and registration number.",
  tokens_estimate: 12,
  metadata: {},
  created_at: now,
  updated_at: now,
  source,
  document: {
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
  },
};

function request(body = {}) {
  return new Request("http://localhost/api/compliance/advisories", {
    body: JSON.stringify({
      prompt: "Review this chemical log",
      workflow: "chemical_application",
      ...body,
    }),
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json",
    },
    method: "POST",
  });
}

describe("compliance advisory route", () => {
  beforeEach(() => {
    adminResponse = null;
    serviceClient = { from: vi.fn() };
    createComplianceAdvisoryAuditRecord.mockReset();
    isComplianceSchemaUnavailableError.mockReset();
    isComplianceSchemaUnavailableError.mockReturnValue(false);
    listChemicalLogRecords.mockReset();
    listChemicalLogRecords.mockResolvedValue([]);
    listJobRecords.mockReset();
    listJobRecords.mockResolvedValue([]);
    searchComplianceChunkRecords.mockReset();
    searchComplianceChunkRecords.mockResolvedValue([chunk]);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires admin authentication", async () => {
    adminResponse = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(searchComplianceChunkRecords).not.toHaveBeenCalled();
  });

  it("returns a disabled advisory without touching OpenAI when the key is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = (await response.json()) as {
      advisory?: { status: string; review_task: string | null };
      runtime?: { available: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.runtime?.available).toBe(false);
    expect(body.advisory?.status).toBe("rag_disabled");
    expect(body.advisory?.review_task).toContain("Configure OPENAI_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createComplianceAdvisoryAuditRecord).not.toHaveBeenCalled();
  });

  it("embeds, retrieves, cites, and records advisory audits server-side", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2] }] }),
        ok: true,
      }),
    );

    const response = await POST(
      request({ context: { chemical_log_id: "log-1" } }),
    );
    const body = (await response.json()) as {
      advisory?: { citations: Array<{ chunk_id: string }>; status: string };
    };

    expect(response.status).toBe(200);
    expect(body.advisory?.status).toBe("advisory_ready");
    expect(body.advisory?.citations[0].chunk_id).toBe("chunk-1");
    expect(searchComplianceChunkRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        embedding: [0.1, 0.2],
        workflow: "chemical_application",
      }),
      serviceClient,
    );
    expect(createComplianceAdvisoryAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: "admin-1",
        status: "advisory_ready",
        workflow: "chemical_application",
      }),
      serviceClient,
    );
    expect(JSON.stringify(createComplianceAdvisoryAuditRecord.mock.calls)).not.toContain(
      "sk-test-secret",
    );
  });

  it("returns sanitized setup state when the compliance schema is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2] }] }),
        ok: true,
      }),
    );
    const schemaError = Object.assign(
      new Error('relation "public.compliance_chunks" does not exist'),
      { code: "42P01" },
    );
    searchComplianceChunkRecords.mockRejectedValue(schemaError);
    isComplianceSchemaUnavailableError.mockImplementation(
      (error) => error === schemaError,
    );

    const response = await POST(request());
    const body = (await response.json()) as {
      advisory?: { status: string; summary: string };
      setup?: {
        available: boolean;
        migrationName: string;
        reason: string;
        status: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.setup).toEqual({
      available: false,
      migrationName: "20260516175724_california_compliance_rag_v1.sql",
      reason:
        "Compliance schema is unavailable. Apply 20260516175724_california_compliance_rag_v1.sql in an approved Supabase environment before relying on source-backed advisories.",
      status: "schema_unavailable",
    });
    expect(body.advisory?.status).toBe("insufficient_sources");
    expect(createComplianceAdvisoryAuditRecord).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("relation");
    expect(JSON.stringify(body)).not.toContain("compliance_chunks");
  });
});
