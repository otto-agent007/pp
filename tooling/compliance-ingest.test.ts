import { describe, expect, it, vi } from "vitest";

import {
  formatComplianceIngestionPreflight,
  formatComplianceIngestionResult,
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

  it("formats a secret-safe preflight report for dry-run no-embed mode", () => {
    const report = formatComplianceIngestionPreflight(
      {
        dryRun: true,
        manifestPath: "packages/domain/fixtures/compliance/manifest.json",
        noEmbed: true,
      },
      {},
    );

    expect(report).toContain("Compliance ingest preflight");
    expect(report).toContain("Target: dry run (no Supabase target required)");
    expect(report).toContain("Mode: dry run");
    expect(report).toContain("Supabase writes: disabled");
    expect(report).toContain("Embeddings: disabled");
    expect(report).toContain("Required envs for this mode: none");
    expect(report).toContain(
      "Live-run envs currently unset: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
    );
    expect(report).not.toContain("sk-test-123");
    expect(report).not.toContain("super-secret");
  });

  it("dry-runs local fixture ingestion without Supabase or OpenAI", async () => {
    const upsertSource = vi.fn();
    const createEmbedding = vi.fn();
    const assertSchemaReady = vi.fn();

    const result = await runComplianceIngestion(
      {
        dryRun: true,
        // `env` is an ingestion *option*, not a dependency. It used to sit in
        // the dependencies object below, where it was silently dropped and the
        // run read the real process.env instead of an isolated one.
        env: {},
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

  it("rejects manifest traversal text paths before reading source files", async () => {
    const readTextFile = vi.fn(async () => "Should not be read");

    await expect(
      runComplianceIngestion(
        {
          dryRun: true,
          manifest: [{ ...manifest[0], text_path: "../secrets.txt" }],
          noEmbed: true,
        },
        {
          readTextFile,
          upsertSource: vi.fn(),
        },
      ),
    ).rejects.toThrow(
      "Compliance source text path cannot contain parent traversal for epa-label-guidance: ../secrets.txt",
    );
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it("rejects absolute manifest text paths before reading source files", async () => {
    const readTextFile = vi.fn(async () => "Should not be read");

    await expect(
      runComplianceIngestion(
        {
          dryRun: true,
          manifest: [{ ...manifest[0], text_path: "C:/Users/bckup/secret.txt" }],
          noEmbed: true,
        },
        {
          readTextFile,
          upsertSource: vi.fn(),
        },
      ),
    ).rejects.toThrow(
      "Compliance source text path must be relative for epa-label-guidance: C:/Users/bckup/secret.txt",
    );
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it("rejects manifest source paths resolved outside the compliance source root", async () => {
    const readTextFile = vi.fn(async () => "Should not be read");

    await expect(
      runComplianceIngestion(
        {
          dryRun: true,
          manifest,
          manifestPath: "outside/manifest.json",
          noEmbed: true,
        },
        {
          readTextFile,
          upsertSource: vi.fn(),
        },
      ),
    ).rejects.toThrow(
      "Compliance source text path must stay inside packages/domain/fixtures/compliance for epa-label-guidance: epa-label.txt",
    );
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it("reports live-run env gaps without exposing secret values", () => {
    const report = formatComplianceIngestionPreflight(
      {
        dryRun: false,
        noEmbed: true,
      },
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://preview.example.com",
        OPENAI_API_KEY: "sk-test-123",
        SUPABASE_SERVICE_ROLE_KEY: "super-secret",
      },
    );

    expect(report).toContain("Target: approved preview Supabase target");
    expect(report).toContain(
      "Required envs for this mode: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(report).toContain("Missing required envs: none");
    expect(report).toContain("Live-run envs currently unset: none");
    expect(report).not.toContain("sk-test-123");
    expect(report).not.toContain("super-secret");
    expect(report).not.toContain("https://preview.example.com");
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

  it("fails with a descriptive error when a source text file is missing", async () => {
    const upsertSource = vi.fn();

    await expect(
      runComplianceIngestion(
        {
          dryRun: true,
          manifest,
          noEmbed: true,
        },
        {
          readTextFile: async () => {
            throw new Error(
              "ENOENT: no such file or directory, open 'missing-source.txt'",
            );
          },
          upsertSource,
        },
      ),
    ).rejects.toThrow(
      "Compliance source text file is missing for epa-label-guidance: epa-label.txt",
    );
    expect(upsertSource).not.toHaveBeenCalled();
  });

  it("formats the result summary with planned counts", () => {
    const report = formatComplianceIngestionResult(
      {
        chunksPlanned: 6,
        chunksUpserted: 0,
        documentsProcessed: 6,
        dryRun: true,
        embeddingsCreated: 0,
        embeddingsSkipped: 6,
        sourcesProcessed: 6,
        sourcesSkipped: 0,
      },
      {
        dryRun: true,
        noEmbed: true,
      },
    );

    expect(report).toContain("Compliance ingest result");
    expect(report).toContain("Sources: 6 processed, 0 skipped");
    expect(report).toContain("Documents: 6 processed");
    expect(report).toContain("Chunks: 6 planned, 0 upserted");
    expect(report).toContain("Embeddings: 0 created, 6 skipped");
    expect(report).toContain("Dry run: yes");
    expect(report).toContain("Supabase writes: disabled");
    expect(report).toContain("Embedding mode: disabled");
  });
});
