import { describe, expect, it, vi } from "vitest";

import {
  parseComplianceIngestArgs,
  runComplianceIngestion,
} from "./compliance-ingest";

const manifest = [
  {
    authority: "epa",
    branch: "branch_2",
    content_type: "text/plain",
    document_title: "EPA label fixture",
    effective_date: null,
    id: "epa-label-guidance",
    jurisdiction: "federal",
    retrieved_at: "2026-05-16T12:00:00.000Z",
    review_status: "reviewed",
    text_path: "epa-label.txt",
    title: "EPA label guidance",
    url: "https://www.epa.gov/pesticide-labels/introduction-pesticide-labels",
    workflow: "chemical_application",
  },
] as const;

describe("compliance ingestion CLI", () => {
  it("parses dry-run, no-embed, workflow, and authority options", () => {
    expect(
      parseComplianceIngestArgs([
        "--dry-run",
        "--no-embed",
        "--workflow",
        "chemical_application",
        "--authority",
        "epa",
      ]),
    ).toEqual({
      authority: "epa",
      dryRun: true,
      manifestPath: "packages/domain/fixtures/compliance/manifest.json",
      noEmbed: true,
      workflow: "chemical_application",
    });
  });

  it("dry-runs local fixture ingestion without Supabase or OpenAI", async () => {
    const upsertSource = vi.fn();
    const createEmbedding = vi.fn();
    const assertSchemaReady = vi.fn();

    const result = await runComplianceIngestion(
      {
        dryRun: true,
        manifest,
        noEmbed: true,
      },
      {
        assertSchemaReady,
        createEmbedding,
        readTextFile: async () =>
          "Application time product identity registration number amount and site guidance.",
        upsertChunks: vi.fn(),
        upsertDocument: vi.fn(),
        upsertSource,
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        documentsProcessed: 1,
        dryRun: true,
        embeddingsCreated: 0,
        embeddingsSkipped: expect.any(Number),
        sourcesProcessed: 1,
      }),
    );
    expect(result.chunksPlanned).toBeGreaterThan(0);
    expect(assertSchemaReady).not.toHaveBeenCalled();
    expect(upsertSource).not.toHaveBeenCalled();
    expect(createEmbedding).not.toHaveBeenCalled();
  });

  it("checks schema readiness before live no-embed ingestion", async () => {
    const client = {} as never;
    const assertSchemaReady = vi.fn().mockResolvedValue(undefined);
    const createEmbedding = vi.fn();
    const upsertSource = vi.fn().mockResolvedValue({ id: "source-1" });
    const upsertDocument = vi.fn().mockResolvedValue({ id: "document-1" });
    const upsertChunks = vi.fn().mockImplementation((chunks) =>
      Promise.resolve(chunks),
    );

    const result = await runComplianceIngestion(
      {
        client,
        dryRun: false,
        manifest,
        noEmbed: true,
      },
      {
        assertSchemaReady,
        createEmbedding,
        readTextFile: async () =>
          "Application time product identity registration number amount and site guidance.",
        upsertChunks,
        upsertDocument,
        upsertSource,
      },
    );

    expect(result.chunksUpserted).toBeGreaterThan(0);
    expect(assertSchemaReady).toHaveBeenCalledWith(client);
    expect(assertSchemaReady.mock.invocationCallOrder[0]).toBeLessThan(
      upsertSource.mock.invocationCallOrder[0],
    );
    expect(createEmbedding).not.toHaveBeenCalled();
  });
});
