import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createComplianceAdvisoryAuditRecord,
  isComplianceSchemaUnavailableError,
  listComplianceSourceRecords,
  searchComplianceChunkRecords,
  upsertComplianceChunkRecords,
  upsertComplianceDocumentRecord,
  upsertComplianceSourceRecord,
} from "./compliance";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
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

  upsert(...args: unknown[]) {
    this.calls.push(["upsert", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  limit(...args: unknown[]) {
    this.calls.push(["limit", args]);
    return this;
  }

  textSearch(...args: unknown[]) {
    this.calls.push(["textSearch", args]);
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
  heading: null,
  content: "Recordkeeping guidance",
  tokens_estimate: 10,
  metadata: {},
  created_at: now,
  updated_at: now,
  source,
};

describe("compliance api client", () => {
  const from = vi.mocked(supabase.from);
  const rpc = vi.mocked(supabase.rpc);

  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it("classifies missing compliance tables and functions without catching unrelated errors", () => {
    expect(
      isComplianceSchemaUnavailableError({
        code: "42P01",
        message: 'relation "public.compliance_sources" does not exist',
      }),
    ).toBe(true);
    expect(
      isComplianceSchemaUnavailableError({
        code: "PGRST202",
        message:
          "Could not find the function public.match_compliance_chunks in the schema cache",
      }),
    ).toBe(true);
    expect(
      isComplianceSchemaUnavailableError({
        code: "42501",
        message: "permission denied for table compliance_sources",
      }),
    ).toBe(false);
  });

  it("lists compliance sources through Supabase", async () => {
    const query = new MockQuery({ data: [source], error: null });
    from.mockReturnValue(query as never);

    const sources = await listComplianceSourceRecords();

    expect(sources).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("compliance_sources");
    expect(query.calls).toContainEqual(["select", ["*"]]);
  });

  it("searches reviewed chunks with vector RPC when an embedding exists", async () => {
    rpc.mockResolvedValue({ data: [chunk], error: null } as never);

    const chunks = await searchComplianceChunkRecords({
      authority: "cdpr",
      embedding: [0.1, 0.2],
      limit: 4,
      workflow: "chemical_application",
    });

    expect(chunks).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("match_compliance_chunks", {
      authority_filter: "cdpr",
      match_count: 4,
      query_embedding: [0.1, 0.2],
      workflow_filter: "chemical_application",
    });
  });

  it("falls back to keyword search when embeddings are unavailable", async () => {
    const query = new MockQuery({ data: [chunk], error: null });
    from.mockReturnValue(query as never);

    await searchComplianceChunkRecords({
      limit: 3,
      query: "application time",
      workflow: "chemical_application",
    });

    expect(from).toHaveBeenCalledWith("compliance_chunks");
    expect(query.calls).toContainEqual(["limit", [3]]);
    expect(query.calls).toContainEqual([
      "textSearch",
      [
        "search_vector",
        "application time",
        { config: "english", type: "websearch" },
      ],
    ]);
    expect(query.calls).toContainEqual([
      "eq",
      ["source.workflow", "chemical_application"],
    ]);
  });

  it("records advisory audit responses without leaking provider secrets", async () => {
    const query = new MockQuery({
      data: {
        id: "audit-1",
        workflow: "chemical_application",
        request: { prompt: "Check" },
        response: {
          citations: [],
          findings: [],
          generated_at: now,
          required_fields: [],
          review_task: null,
          status: "rag_disabled",
          summary: "Disabled",
          workflow: "chemical_application",
        },
        citation_chunk_ids: [],
        status: "rag_disabled",
        created_by: "admin-1",
        created_at: now,
      },
      error: null,
    });
    from.mockReturnValue(query as never);

    await createComplianceAdvisoryAuditRecord({
      citation_chunk_ids: [],
      created_by: "admin-1",
      request: { prompt: "Check" },
      response: {
        citations: [],
        findings: [],
        generated_at: now,
        required_fields: [],
        review_task: null,
        status: "rag_disabled",
        summary: "Disabled",
        workflow: "chemical_application",
      },
      status: "rag_disabled",
      workflow: "chemical_application",
    });

    expect(from).toHaveBeenCalledWith("compliance_advisory_audits");
    expect(query.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          created_by: "admin-1",
          status: "rag_disabled",
        }),
      ],
    ]);
    expect(JSON.stringify(query.calls)).not.toContain("OPENAI_API_KEY");
  });

  it("upserts compliance sources by source hash", async () => {
    const query = new MockQuery({ data: source, error: null });
    from.mockReturnValue(query as never);

    const record = await upsertComplianceSourceRecord({
      authority: "cdpr",
      branch: "branch_2",
      effective_date: "2026-01-01",
      jurisdiction: "california",
      retrieved_at: now,
      review_status: "reviewed",
      source_hash: "hash-1",
      title: "DPR structural recordkeeping",
      url: "https://www.cdpr.ca.gov/",
      workflow: "chemical_application",
    });

    expect(record.id).toBe("source-1");
    expect(from).toHaveBeenCalledWith("compliance_sources");
    expect(query.calls[0]).toEqual([
      "upsert",
      [
        expect.objectContaining({ source_hash: "hash-1" }),
        { onConflict: "source_hash" },
      ],
    ]);
    expect(query.calls).toContainEqual(["select", ["*"]]);
    expect(query.calls).toContainEqual(["single", []]);
  });

  it("upserts compliance documents and chunks through typed helpers", async () => {
    const documentQuery = new MockQuery({
      data: {
        id: "document-1",
        source_id: "source-1",
        title: "Recordkeeping update",
        document_url: "https://www.cdpr.ca.gov/",
        content_type: "text/plain",
        retrieved_at: now,
        source_hash: "document-hash",
        review_status: "reviewed",
        raw_text: "Use record text",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const chunkQuery = new MockQuery({ data: [chunk], error: null });
    from.mockReturnValueOnce(documentQuery as never).mockReturnValueOnce(
      chunkQuery as never,
    );

    await upsertComplianceDocumentRecord({
      content_type: "text/plain",
      document_url: "https://www.cdpr.ca.gov/",
      raw_text: "Use record text",
      retrieved_at: now,
      review_status: "reviewed",
      source_hash: "document-hash",
      source_id: "source-1",
      title: "Recordkeeping update",
    });
    await upsertComplianceChunkRecords([
      {
        chunk_index: 0,
        content: "Use record text",
        document_id: "document-1",
        embedding: null,
        heading: null,
        metadata: { hash: "chunk-hash" },
        source_id: "source-1",
        tokens_estimate: 4,
      },
    ]);

    expect(from).toHaveBeenNthCalledWith(1, "compliance_documents");
    expect(documentQuery.calls[0]).toEqual([
      "upsert",
      [
        expect.objectContaining({
          source_hash: "document-hash",
          source_id: "source-1",
        }),
        { onConflict: "source_id,source_hash" },
      ],
    ]);
    expect(from).toHaveBeenNthCalledWith(2, "compliance_chunks");
    expect(chunkQuery.calls[0]).toEqual([
      "upsert",
      [
        [
          expect.objectContaining({
            document_id: "document-1",
            embedding: null,
          }),
        ],
        { onConflict: "document_id,chunk_index" },
      ],
    ]);
  });
});
