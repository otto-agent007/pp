import type {
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryStatus,
  ComplianceAuthority,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSource,
  ComplianceWorkflow,
} from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

export type ComplianceClient = SupabaseProviderClient;

interface ComplianceChunkSearchInput {
  authority?: ComplianceAuthority | "all";
  embedding?: number[] | null;
  limit?: number;
  query?: string | null;
  workflow?: ComplianceWorkflow | "all";
}

type ComplianceAdvisoryAuditInput = {
  citation_chunk_ids: string[];
  created_by?: string | null;
  request: Record<string, unknown>;
  response: ComplianceAdvisory;
  status: ComplianceAdvisoryStatus;
  workflow: ComplianceWorkflow;
};

export type ComplianceSourceUpsertInput = Pick<
  ComplianceSource,
  | "authority"
  | "branch"
  | "effective_date"
  | "jurisdiction"
  | "retrieved_at"
  | "review_status"
  | "source_hash"
  | "title"
  | "url"
  | "workflow"
>;

export type ComplianceDocumentUpsertInput = Pick<
  ComplianceDocument,
  | "content_type"
  | "document_url"
  | "raw_text"
  | "retrieved_at"
  | "review_status"
  | "source_hash"
  | "source_id"
  | "title"
>;

export type ComplianceChunkUpsertInput = Pick<
  ComplianceChunk,
  | "chunk_index"
  | "content"
  | "document_id"
  | "heading"
  | "metadata"
  | "source_id"
  | "tokens_estimate"
> & {
  embedding?: number[] | null;
};

const complianceSourceSelect = "*";
const complianceDocumentSelect = "*, source:compliance_sources(*)";
const complianceChunkSelect =
  "*, source:compliance_sources(*), document:compliance_documents(*)";
const complianceSchemaObjectNames = [
  "compliance_sources",
  "compliance_documents",
  "compliance_chunks",
  "compliance_advisory_audits",
  "location_units",
  "job_unit_audit_items",
  "match_compliance_chunks",
];
const complianceEmbeddingDimensions = 1536;

function getSupabaseErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const fields = ["message", "details", "hint"];

  return fields
    .map((field) => {
      const value = (error as Record<string, unknown>)[field];

      return typeof value === "string" ? value : "";
    })
    .filter(Boolean)
    .join(" ");
}

export function isComplianceSchemaUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  const text = getSupabaseErrorText(error).toLowerCase();
  const mentionsComplianceObject = complianceSchemaObjectNames.some((name) =>
    text.includes(name),
  );

  if (!mentionsComplianceObject) {
    return false;
  }

  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    text.includes("does not exist") ||
    text.includes("could not find the function") ||
    text.includes("schema cache")
  );
}

function toAuditRow(input: ComplianceAdvisoryAuditInput) {
  return {
    workflow: input.workflow,
    request: input.request,
    response: input.response,
    citation_chunk_ids: input.citation_chunk_ids,
    status: input.status,
    created_by: input.created_by ?? null,
  };
}

function toSourceRow(input: ComplianceSourceUpsertInput) {
  return {
    authority: input.authority,
    branch: input.branch,
    effective_date: input.effective_date,
    jurisdiction: input.jurisdiction,
    retrieved_at: input.retrieved_at,
    review_status: input.review_status,
    source_hash: input.source_hash,
    title: input.title,
    url: input.url,
    workflow: input.workflow,
  };
}

function toDocumentRow(input: ComplianceDocumentUpsertInput) {
  return {
    content_type: input.content_type,
    document_url: input.document_url,
    raw_text: input.raw_text,
    retrieved_at: input.retrieved_at,
    review_status: input.review_status,
    source_hash: input.source_hash,
    source_id: input.source_id,
    title: input.title,
  };
}

function toChunkRow(input: ComplianceChunkUpsertInput) {
  return {
    chunk_index: input.chunk_index,
    content: input.content,
    document_id: input.document_id,
    embedding: input.embedding ?? null,
    heading: input.heading,
    metadata: input.metadata,
    source_id: input.source_id,
    tokens_estimate: input.tokens_estimate,
  };
}

export async function listComplianceSourceRecords(
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_sources")
    .select(complianceSourceSelect)
    .order("retrieved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceSource[];
}

export async function assertComplianceSchemaReady(
  client: ComplianceClient,
) {
  const tableNames = [
    "compliance_sources",
    "compliance_documents",
    "compliance_chunks",
    "compliance_advisory_audits",
  ];

  for (const tableName of tableNames) {
    const { error } = await client.from(tableName).select("id").limit(1);

    if (error) {
      throw error;
    }
  }

  const { error } = await client.rpc("match_compliance_chunks", {
    authority_filter: null,
    match_count: 1,
    query_embedding: Array.from({ length: complianceEmbeddingDimensions }, () => 0),
    workflow_filter: null,
  });

  if (error) {
    throw error;
  }
}

export async function upsertComplianceSourceRecord(
  input: ComplianceSourceUpsertInput,
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_sources")
    .upsert(toSourceRow(input), { onConflict: "source_hash" })
    .select(complianceSourceSelect)
    .single();

  if (error) {
    throw error;
  }

  return data as ComplianceSource;
}

export async function listComplianceDocumentRecords(
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_documents")
    .select(complianceDocumentSelect)
    .order("retrieved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceDocument[];
}

export async function upsertComplianceDocumentRecord(
  input: ComplianceDocumentUpsertInput,
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_documents")
    .upsert(toDocumentRow(input), { onConflict: "source_id,source_hash" })
    .select(complianceDocumentSelect)
    .single();

  if (error) {
    throw error;
  }

  return data as ComplianceDocument;
}

export async function listComplianceChunkRecords(
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_chunks")
    .select(complianceChunkSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceChunk[];
}

export async function upsertComplianceChunkRecords(
  input: ComplianceChunkUpsertInput[],
  client: ComplianceClient,
) {
  if (input.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("compliance_chunks")
    .upsert(input.map(toChunkRow), { onConflict: "document_id,chunk_index" })
    .select(complianceChunkSelect);

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceChunk[];
}

export async function searchComplianceChunkRecords(
  input: ComplianceChunkSearchInput,
  client: ComplianceClient,
) {
  const matchCount = input.limit ?? 8;
  const workflowFilter =
    input.workflow && input.workflow !== "all" ? input.workflow : null;
  const authorityFilter =
    input.authority && input.authority !== "all" ? input.authority : null;

  if (input.embedding?.length) {
    const { data, error } = await client.rpc("match_compliance_chunks", {
      authority_filter: authorityFilter,
      match_count: matchCount,
      query_embedding: input.embedding,
      workflow_filter: workflowFilter,
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as ComplianceChunk[];
  }

  let query = client
    .from("compliance_chunks")
    .select(complianceChunkSelect)
    .limit(matchCount);

  if (input.query?.trim()) {
    query = query.textSearch("search_vector", input.query.trim(), {
      config: "english",
      type: "websearch",
    });
  }

  if (workflowFilter) {
    query = query.eq("source.workflow", workflowFilter);
  }

  if (authorityFilter) {
    query = query.eq("source.authority", authorityFilter);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceChunk[];
}

export async function listComplianceAdvisoryAuditRecords(
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_advisory_audits")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ComplianceAdvisoryAudit[];
}

export async function createComplianceAdvisoryAuditRecord(
  input: ComplianceAdvisoryAuditInput,
  client: ComplianceClient,
) {
  const { data, error } = await client
    .from("compliance_advisory_audits")
    .insert(toAuditRow(input))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ComplianceAdvisoryAudit;
}
