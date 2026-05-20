import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertComplianceSchemaReady,
  upsertComplianceChunkRecords,
  upsertComplianceDocumentRecord,
  upsertComplianceSourceRecord,
  type ComplianceChunkUpsertInput,
  type ComplianceClient,
  type ComplianceDocumentUpsertInput,
  type ComplianceSourceUpsertInput,
} from "../packages/api-client/compliance";
import {
  buildComplianceIngestionPlan,
  validateComplianceSourceManifestEntry,
  type ComplianceSourceManifestEntry,
} from "../packages/domain/compliance";
import type {
  ComplianceAuthority,
  ComplianceWorkflow,
} from "../packages/types";

const DEFAULT_MANIFEST_PATH =
  "packages/domain/fixtures/compliance/manifest.json";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export interface ComplianceIngestCliOptions {
  authority?: ComplianceAuthority;
  dryRun: boolean;
  manifestPath: string;
  noEmbed: boolean;
  workflow?: ComplianceWorkflow;
}

export interface ComplianceIngestionSummary {
  chunksPlanned: number;
  chunksUpserted: number;
  documentsProcessed: number;
  dryRun: boolean;
  embeddingsCreated: number;
  embeddingsSkipped: number;
  sourcesProcessed: number;
  sourcesSkipped: number;
}

interface ComplianceIngestionDependencies {
  assertSchemaReady?: (client: ComplianceClient) => Promise<void>;
  createEmbedding?: (input: string) => Promise<number[] | null>;
  readTextFile?: (filePath: string) => Promise<string>;
  upsertChunks?: (
    input: ComplianceChunkUpsertInput[],
    client?: ComplianceClient,
  ) => Promise<unknown[]>;
  upsertDocument?: (
    input: ComplianceDocumentUpsertInput,
    client?: ComplianceClient,
  ) => Promise<{ id: string }>;
  upsertSource?: (
    input: ComplianceSourceUpsertInput,
    client?: ComplianceClient,
  ) => Promise<{ id: string }>;
}

export interface ComplianceIngestionRunOptions {
  authority?: ComplianceAuthority;
  client?: ComplianceClient;
  dryRun?: boolean;
  env?: Record<string, string | undefined>;
  manifest?: readonly unknown[];
  manifestPath?: string;
  noEmbed?: boolean;
  workflow?: ComplianceWorkflow;
  wordsPerChunk?: number;
}

function usage() {
  return [
    "Usage:",
    "  corepack pnpm compliance:ingest -- --dry-run",
    "  corepack pnpm compliance:ingest -- --no-embed",
    "",
    "Optional:",
    "  --manifest packages/domain/fixtures/compliance/manifest.json",
    "  --workflow chemical_application|multi_unit_audit|recurring_route|wdo_branch3",
    "  --authority epa|cdpr|spcb",
    "",
    "This command does not apply migrations or fetch live web pages. It reads",
    "checked-in normalized source text and upserts through the API-client layer.",
  ].join("\n");
}

function requireNextValue(args: string[], index: number, label: string) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${label} requires a value.\n\n${usage()}`);
  }

  return value;
}

export function parseComplianceIngestArgs(
  args: string[],
): ComplianceIngestCliOptions {
  const options: ComplianceIngestCliOptions = {
    dryRun: false,
    manifestPath: DEFAULT_MANIFEST_PATH,
    noEmbed: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--no-embed") {
      options.noEmbed = true;
      continue;
    }

    if (arg === "--manifest") {
      options.manifestPath = requireNextValue(args, index, "--manifest");
      index += 1;
      continue;
    }

    if (arg === "--workflow") {
      options.workflow = requireNextValue(
        args,
        index,
        "--workflow",
      ) as ComplianceWorkflow;
      index += 1;
      continue;
    }

    if (arg === "--authority") {
      options.authority = requireNextValue(
        args,
        index,
        "--authority",
      ) as ComplianceAuthority;
      index += 1;
      continue;
    }

    throw new Error(`Unknown compliance ingest argument: ${arg}\n\n${usage()}`);
  }

  return options;
}

function getEnv(name: string, env: Record<string, string | undefined>) {
  return env[name]?.trim() || undefined;
}

async function defaultReadTextFile(filePath: string) {
  return readFile(filePath, "utf8");
}

async function loadManifest(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown[];
}

async function createOpenAIEmbedding(input: string, env = process.env) {
  const apiKey = getEnv("OPENAI_API_KEY", env);

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    body: JSON.stringify({
      input,
      model:
        getEnv("OPENAI_COMPLIANCE_EMBEDDING_MODEL", env) ??
        DEFAULT_EMBEDDING_MODEL,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create compliance chunk embedding");
  }

  const body = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  return body.data?.[0]?.embedding ?? null;
}

function createServiceRoleClient(env: Record<string, string | undefined>) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL", env);
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", env);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run is used.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  }) as unknown as ComplianceClient;
}

function filterEntry(
  entry: ComplianceSourceManifestEntry,
  options: ComplianceIngestionRunOptions,
) {
  if (options.workflow && entry.workflow !== options.workflow) {
    return false;
  }

  if (options.authority && entry.authority !== options.authority) {
    return false;
  }

  return true;
}

export async function runComplianceIngestion(
  options: ComplianceIngestionRunOptions = {},
  dependencies: ComplianceIngestionDependencies = {},
): Promise<ComplianceIngestionSummary> {
  const manifestPath = path.resolve(options.manifestPath ?? DEFAULT_MANIFEST_PATH);
  const manifestBaseDir = path.dirname(manifestPath);
  const manifest = options.manifest ?? (await loadManifest(manifestPath));
  const readTextFile = dependencies.readTextFile ?? defaultReadTextFile;
  const env = options.env ?? process.env;
  const dryRun = Boolean(options.dryRun);
  const noEmbed = Boolean(options.noEmbed);
  const client = dryRun ? undefined : options.client ?? createServiceRoleClient(env);
  const assertSchemaReady =
    dependencies.assertSchemaReady ?? assertComplianceSchemaReady;
  const createEmbedding =
    dependencies.createEmbedding ??
    ((input: string) => createOpenAIEmbedding(input, env));
  const upsertSource = dependencies.upsertSource ?? upsertComplianceSourceRecord;
  const upsertDocument =
    dependencies.upsertDocument ?? upsertComplianceDocumentRecord;
  const upsertChunks = dependencies.upsertChunks ?? upsertComplianceChunkRecords;
  const selectedEntries = manifest
    .map((entry) =>
      validateComplianceSourceManifestEntry(
        entry as ComplianceSourceManifestEntry,
      ),
    )
    .filter((entry) => filterEntry(entry, options));
  const summary: ComplianceIngestionSummary = {
    chunksPlanned: 0,
    chunksUpserted: 0,
    documentsProcessed: 0,
    dryRun,
    embeddingsCreated: 0,
    embeddingsSkipped: 0,
    sourcesProcessed: 0,
    sourcesSkipped: manifest.length - selectedEntries.length,
  };

  if (client) {
    await assertSchemaReady(client);
  }

  for (const entry of selectedEntries) {
    const sourceText = await readTextFile(path.resolve(manifestBaseDir, entry.text_path));
    const previewPlan = buildComplianceIngestionPlan({
      documentId: `${entry.id}-document`,
      entry,
      sourceId: `${entry.id}-source`,
      text: sourceText,
      wordsPerChunk: options.wordsPerChunk,
    });

    summary.sourcesProcessed += 1;
    summary.documentsProcessed += 1;
    summary.chunksPlanned += previewPlan.chunks.length;

    if (dryRun) {
      summary.embeddingsSkipped += previewPlan.chunks.length;
      continue;
    }

    const source = await upsertSource(previewPlan.source, client);
    const documentPlan = buildComplianceIngestionPlan({
      documentId: `${entry.id}-document`,
      entry,
      sourceId: source.id,
      text: sourceText,
      wordsPerChunk: options.wordsPerChunk,
    });
    const document = await upsertDocument(documentPlan.document, client);
    const chunkPlan = buildComplianceIngestionPlan({
      documentId: document.id,
      entry,
      sourceId: source.id,
      text: sourceText,
      wordsPerChunk: options.wordsPerChunk,
    });
    const embeddings =
      noEmbed || !getEnv("OPENAI_API_KEY", env)
        ? []
        : await Promise.all(
            chunkPlan.chunks.map((chunk) => createEmbedding(chunk.content)),
          );
    const chunks = chunkPlan.chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index] ?? null,
    }));

    summary.embeddingsCreated += embeddings.filter(Boolean).length;
    summary.embeddingsSkipped += chunks.length - embeddings.filter(Boolean).length;
    summary.chunksUpserted += (await upsertChunks(chunks, client)).length;
  }

  return summary;
}

function printSummary(summary: ComplianceIngestionSummary) {
  console.log(
    `Compliance ingest ${summary.dryRun ? "dry run" : "complete"}: ${summary.sourcesProcessed} sources, ${summary.documentsProcessed} documents, ${summary.chunksPlanned} chunks planned, ${summary.chunksUpserted} chunks upserted.`,
  );
  console.log(
    `Embeddings: ${summary.embeddingsCreated} created, ${summary.embeddingsSkipped} skipped. Sources skipped by filters: ${summary.sourcesSkipped}.`,
  );
}

async function main() {
  const options = parseComplianceIngestArgs(process.argv.slice(2));
  const summary = await runComplianceIngestion(options);
  printSummary(summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Compliance ingest failed";
    console.error(message);
    process.exitCode = 1;
  });
}
