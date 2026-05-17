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

    const result = await runComplianceIngestion(
      {
        dryRun: true,
        manifest,
        noEmbed: true,
      },
      {
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
    expect(upsertSource).not.toHaveBeenCalled();
    expect(createEmbedding).not.toHaveBeenCalled();
  });
});
