import {
  createComplianceAdvisoryAuditRecord,
  listComplianceAdvisoryAuditRecords,
  listComplianceChunkRecords,
  listComplianceDocumentRecords,
  listComplianceSourceRecords,
  searchComplianceChunkRecords,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
import type {
  ChemicalLog,
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryRequest,
  ComplianceAdvisoryStatus,
  ComplianceAuthority,
  ComplianceBranch,
  ComplianceChunk,
  ComplianceCitation,
  ComplianceDocument,
  ComplianceFinding,
  ComplianceJurisdiction,
  ComplianceRequiredField,
  ComplianceReviewStatus,
  ComplianceSetupReadiness,
  ComplianceSource,
  ComplianceWorkflow,
  Job,
  JobUnitAuditItem,
  LocationUnit,
} from "@pest-patrol/types";

export type { ComplianceSetupReadiness } from "@pest-patrol/types";

export interface ComplianceRuntimeEnv {
  OPENAI_API_KEY?: string;
}

export interface ComplianceRuntimeStatus {
  available: boolean;
  provider: "openai";
  reason: string | null;
  requiredEnvName: "OPENAI_API_KEY";
}

export interface ComplianceChunkSearchInput {
  authority?: ComplianceAuthority | "all";
  embedding?: number[] | null;
  limit?: number;
  query?: string | null;
  workflow?: ComplianceWorkflow | "all";
}

export interface ComplianceAdvisoryBuildInput {
  chemicalLog?: ChemicalLog | null;
  chunks: ComplianceChunk[];
  job?: Job | null;
  now?: string;
  prompt?: string | null;
  ragDisabled?: boolean;
  unitAuditItems?: JobUnitAuditItem[];
  units?: LocationUnit[];
  workflow: ComplianceWorkflow;
}

export interface ComplianceMultiUnitAuditSummary {
  blocked: number;
  complete: boolean;
  followUp: number;
  pending: number;
  skipped: number;
  totalUnits: number;
  treated: number;
}

export interface ComplianceSourceManifestEntry {
  authority: ComplianceAuthority;
  branch: ComplianceBranch;
  content_type: string;
  document_title?: string | null;
  document_url?: string | null;
  effective_date?: string | null;
  id: string;
  jurisdiction: ComplianceJurisdiction;
  retrieved_at: string;
  review_status: ComplianceReviewStatus;
  text_path: string;
  title: string;
  url: string;
  workflow: ComplianceWorkflow;
}

export type ComplianceSourceIngestionInput = Pick<
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

export type ComplianceDocumentIngestionInput = Pick<
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

export type ComplianceChunkIngestionInput = Pick<
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

export interface ComplianceIngestionPlan {
  chunks: ComplianceChunkIngestionInput[];
  document: ComplianceDocumentIngestionInput;
  source: ComplianceSourceIngestionInput;
}

export type ComplianceKnowledgeBaseReadinessStatus =
  | "draft_only"
  | "needs_sources"
  | "ready";

export interface ComplianceWorkflowKnowledgeBaseReadiness {
  archivedSources: number;
  chunks: number;
  documents: number;
  draftSources: number;
  lastRetrievedAt: string | null;
  reviewedSources: number;
  status: ComplianceKnowledgeBaseReadinessStatus;
  workflow: ComplianceWorkflow;
}

export interface ComplianceKnowledgeBaseReadiness {
  readyWorkflowCount: number;
  totals: {
    archivedSources: number;
    chunks: number;
    documents: number;
    draftSources: number;
    reviewedSources: number;
    sources: number;
  };
  workflows: ComplianceWorkflowKnowledgeBaseReadiness[];
}

const workflowLabels: Record<ComplianceWorkflow, string> = {
  chemical_application: "Chemical application",
  multi_unit_audit: "Multi-unit audit",
  recurring_route: "Recurring route",
  wdo_branch3: "WDO / Branch 3",
};

const complianceWorkflows = Object.keys(workflowLabels) as ComplianceWorkflow[];
const complianceAuthorities: ComplianceAuthority[] = [
  "cdpr",
  "epa",
  "spcb",
  "internal",
];
const complianceBranches: ComplianceBranch[] = [
  "branch_2",
  "branch_3",
  "general",
];
const complianceJurisdictions: ComplianceJurisdiction[] = [
  "california",
  "federal",
];
export const COMPLIANCE_RAG_MIGRATION_NAME =
  "20260516175724_california_compliance_rag_v1.sql" as const;
const complianceReviewStatuses: ComplianceReviewStatus[] = [
  "archived",
  "draft",
  "reviewed",
];

export const complianceSourceAnchors = [
  {
    authority: "epa",
    title: "EPA pesticide label guidance",
    url: "https://www.epa.gov/pesticide-labels/introduction-pesticide-labels",
    workflow: "chemical_application",
  },
  {
    authority: "epa",
    title: "EPA pesticide ingredient and label search",
    url: "https://www.epa.gov/ingredients-used-pesticide-products/how-search-information-about-pesticide-ingredients-and-labels",
    workflow: "chemical_application",
  },
  {
    authority: "cdpr",
    title: "California DPR structural pesticide use recordkeeping update",
    url: "https://www.cdpr.ca.gov/cac-letter/amendment-of-structural-fumigation-log-and-pesticide-use-record-keeping-requirements/",
    workflow: "chemical_application",
  },
  {
    authority: "cdpr",
    title: "California DPR 2026 regulatory updates",
    url: "https://www.cdpr.ca.gov/2025/12/30/new-regulations-effective-january-1-2026/",
    workflow: "recurring_route",
  },
  {
    authority: "spcb",
    title: "California Structural Pest Control Board license roles",
    url: "https://pestboard.ca.gov/howdoi/lic.shtml",
    workflow: "wdo_branch3",
  },
  {
    authority: "spcb",
    title: "California Structural Pest Control Board Act Book",
    url: "https://www.pestboard.ca.gov/pestlaw/pestact.pdf",
    workflow: "wdo_branch3",
  },
] satisfies Array<{
  authority: ComplianceAuthority;
  title: string;
  url: string;
  workflow: ComplianceWorkflow;
}>;

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function asWorkflow(value: ComplianceWorkflow) {
  if (!complianceWorkflows.includes(value)) {
    throw new Error("Compliance workflow is invalid");
  }

  return value;
}

function asAuthority(value: ComplianceAuthority) {
  if (!complianceAuthorities.includes(value)) {
    throw new Error("Compliance authority is invalid");
  }

  return value;
}

function asBranch(value: ComplianceBranch) {
  if (!complianceBranches.includes(value)) {
    throw new Error("Compliance branch is invalid");
  }

  return value;
}

function asJurisdiction(value: ComplianceJurisdiction) {
  if (!complianceJurisdictions.includes(value)) {
    throw new Error("Compliance jurisdiction is invalid");
  }

  return value;
}

function asReviewStatus(value: ComplianceReviewStatus) {
  if (!complianceReviewStatuses.includes(value)) {
    throw new Error("Compliance review status is invalid");
  }

  return value;
}

function requireIsoDateLike(value: string, fieldName: string) {
  const normalized = requireNonEmpty(value, fieldName);

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return normalized;
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.trim().split(/\s+/).length * 1.35));
}

function sourceHash(value: string) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function latestDate(values: string[]) {
  return (
    values
      .filter((value) => !Number.isNaN(Date.parse(value)))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function toCitation(chunk: ComplianceChunk): ComplianceCitation {
  const source = chunk.source;
  const document = chunk.document;

  return {
    authority: source?.authority ?? "internal",
    chunk_id: chunk.id,
    document_title: document?.title ?? "Compliance source document",
    excerpt: chunk.content.slice(0, 260),
    source_title: source?.title ?? chunk.heading ?? "Compliance source",
    url: document?.document_url ?? source?.url ?? "",
  };
}

function requiredField(
  field: string,
  label: string,
  reason: string,
  present: boolean | null,
): ComplianceRequiredField {
  return {
    field,
    label,
    reason,
    status: present === null ? "unknown" : present ? "present" : "missing",
  };
}

function finding(
  workflow: ComplianceWorkflow,
  title: string,
  message: string,
  severity: ComplianceFinding["severity"],
  citations: ComplianceCitation[],
): ComplianceFinding {
  return {
    citation_chunk_ids: citations.map((citation) => citation.chunk_id),
    message,
    severity,
    title,
    workflow,
  };
}

function contextJob(input: ComplianceAdvisoryBuildInput) {
  return input.job ?? input.chemicalLog?.job ?? null;
}

function chemicalRequiredFields(input: ComplianceAdvisoryBuildInput) {
  const log = input.chemicalLog ?? null;
  const job = contextJob(input);

  return [
    requiredField(
      "application_time",
      "Application time",
      "California structural-use records should preserve when the application happened.",
      Boolean(log?.created_at),
    ),
    requiredField(
      "product_name",
      "Product name",
      "EPA and DPR review depends on the actual pesticide product used.",
      Boolean(log?.chemical?.name),
    ),
    requiredField(
      "registration_number",
      "EPA or California registration number",
      "Label and state-record checks need the product registration number.",
      Boolean(log?.chemical?.epa_number),
    ),
    requiredField(
      "amount_unit",
      "Amount and unit",
      "Chemical-use records need the amount and unit applied.",
      Boolean(log && log.amount_used > 0 && log.chemical?.unit),
    ),
    requiredField(
      "target_site",
      "Target site or treated area",
      "Compliance review needs the service location or treatment site.",
      Boolean(job?.location?.address || job?.service_notes),
    ),
    requiredField(
      "license_or_supervision",
      "License or supervision detail",
      "Current job records do not model license number or supervision detail yet.",
      null,
    ),
  ];
}

function recurringRouteRequiredFields(input: ComplianceAdvisoryBuildInput) {
  const job = contextJob(input);

  return [
    requiredField(
      "service_date",
      "Service date",
      "Recurring prompts must be tied to a prior or scheduled service date.",
      Boolean(job?.scheduled_start),
    ),
    requiredField(
      "customer",
      "Customer",
      "Recurring-route review should identify the responsible account.",
      Boolean(job?.customer?.name),
    ),
    requiredField(
      "service_location",
      "Service location",
      "Site-specific pesticide and access guidance depends on the service location.",
      Boolean(job?.location?.address),
    ),
  ];
}

function wdoRequiredFields() {
  return [
    requiredField(
      "inspection_report",
      "Inspection report",
      "Branch 3/WDO workflows need a written inspection report or report draft.",
      null,
    ),
    requiredField(
      "damaged_members",
      "Damaged members and findings",
      "WDO review should identify damaged members, infestation evidence, or inaccessible areas.",
      null,
    ),
    requiredField(
      "recommendations",
      "Corrective recommendations",
      "WDO reports need clear recommendations when findings require follow-up.",
      null,
    ),
  ];
}

function multiUnitRequiredFields(input: ComplianceAdvisoryBuildInput) {
  const summary = getComplianceMultiUnitAuditSummary(
    input.units ?? [],
    input.unitAuditItems ?? [],
  );

  return [
    requiredField(
      "unit_roster",
      "Unit roster",
      "Multi-unit audit review needs the expected units or common areas.",
      summary.totalUnits > 0,
    ),
    requiredField(
      "unit_outcomes",
      "Unit outcomes",
      "Each unit or common area should have treated, skipped, inaccessible, or follow-up status.",
      summary.totalUnits > 0 && summary.pending === 0,
    ),
    requiredField(
      "follow_up_items",
      "Follow-up items",
      "Skipped, inaccessible, and follow-up units should remain visible for office review.",
      summary.blocked + summary.skipped + summary.followUp === 0,
    ),
  ];
}

function requiredFieldsFor(input: ComplianceAdvisoryBuildInput) {
  if (input.workflow === "chemical_application") {
    return chemicalRequiredFields(input);
  }

  if (input.workflow === "recurring_route") {
    return recurringRouteRequiredFields(input);
  }

  if (input.workflow === "multi_unit_audit") {
    return multiUnitRequiredFields(input);
  }

  return wdoRequiredFields();
}

function workflowFindings(
  input: ComplianceAdvisoryBuildInput,
  citations: ComplianceCitation[],
  requiredFields: ComplianceRequiredField[],
) {
  const findings: ComplianceFinding[] = [];
  const missing = requiredFields.filter((field) => field.status === "missing");
  const unknown = requiredFields.filter((field) => field.status === "unknown");

  if (missing.length > 0) {
    findings.push(
      finding(
        input.workflow,
        "Missing compliance evidence",
        `${missing.map((field) => field.label).join(", ")} should be captured or reviewed before relying on this workflow.`,
        "warning",
        citations,
      ),
    );
  }

  if (unknown.length > 0) {
    findings.push(
      finding(
        input.workflow,
        "Manual review required",
        `${unknown.map((field) => field.label).join(", ")} is not modeled in current Pest Patrol records, so an operator should verify it against the cited source.`,
        "info",
        citations,
      ),
    );
  }

  if (input.workflow === "multi_unit_audit") {
    const summary = getComplianceMultiUnitAuditSummary(
      input.units ?? [],
      input.unitAuditItems ?? [],
    );

    if (!summary.complete) {
      findings.push(
        finding(
          input.workflow,
          "Unit audit incomplete",
          `${summary.pending} units are pending and ${summary.blocked + summary.skipped + summary.followUp} units need office-visible resolution.`,
          "warning",
          citations,
        ),
      );
    }
  }

  if (input.workflow === "chemical_application" && input.chemicalLog?.chemical?.epa_number) {
    findings.push(
      finding(
        input.workflow,
        "Label citation check",
        `EPA ${input.chemicalLog.chemical.epa_number} is present; compare the application site, amount, and customer instructions against the retrieved label source before closeout.`,
        "info",
        citations,
      ),
    );
  }

  return findings;
}

export function getComplianceRuntimeStatus(
  env: ComplianceRuntimeEnv = {},
): ComplianceRuntimeStatus {
  const hasKey = Boolean(env.OPENAI_API_KEY?.trim());

  return {
    available: hasKey,
    provider: "openai",
    reason: hasKey ? null : "OPENAI_API_KEY is not configured for server-side RAG.",
    requiredEnvName: "OPENAI_API_KEY",
  };
}

export function getComplianceSchemaReadyReadiness(): ComplianceSetupReadiness {
  return {
    available: true,
    migrationName: COMPLIANCE_RAG_MIGRATION_NAME,
    reason: null,
    status: "ready",
  };
}

export function getComplianceSchemaUnavailableReadiness(): ComplianceSetupReadiness {
  return {
    available: false,
    migrationName: COMPLIANCE_RAG_MIGRATION_NAME,
    reason:
      "Compliance schema is unavailable. Apply 20260516175724_california_compliance_rag_v1.sql in an approved Supabase environment before relying on source-backed advisories.",
    status: "schema_unavailable",
  };
}

export function validateComplianceAdvisoryRequest(
  input: ComplianceAdvisoryRequest,
): ComplianceAdvisoryRequest {
  return {
    context: input.context ?? {},
    prompt: normalizeOptional(input.prompt),
    workflow: asWorkflow(input.workflow),
  };
}

export function getComplianceSourceFilters(workflow: ComplianceWorkflow) {
  if (workflow === "chemical_application") {
    return { authorities: ["cdpr", "epa"] as ComplianceAuthority[], workflow };
  }

  if (workflow === "wdo_branch3") {
    return { authorities: ["spcb"] as ComplianceAuthority[], workflow };
  }

  return { authorities: ["cdpr", "spcb"] as ComplianceAuthority[], workflow };
}

export function buildComplianceQueryText(input: ComplianceAdvisoryRequest) {
  const request = validateComplianceAdvisoryRequest(input);
  const context = request.context ?? {};

  return [
    workflowLabels[request.workflow],
    request.prompt,
    context.job_id ? `job:${context.job_id}` : null,
    context.chemical_log_id ? `chemical_log:${context.chemical_log_id}` : null,
    context.location_id ? `location:${context.location_id}` : null,
    context.unit_ids?.length ? `units:${context.unit_ids.join(",")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildComplianceAdvisory(
  input: ComplianceAdvisoryBuildInput,
): ComplianceAdvisory {
  const generatedAt = input.now ?? new Date().toISOString();
  const citations = input.chunks.map(toCitation);
  const requiredFields = requiredFieldsFor(input);

  if (input.ragDisabled) {
    return {
      citations: [],
      findings: [],
      generated_at: generatedAt,
      required_fields: requiredFields,
      review_task: "Configure OPENAI_API_KEY and ingest reviewed compliance sources.",
      status: "rag_disabled",
      summary: "Compliance RAG is disabled because the server-side model key is not configured.",
      workflow: input.workflow,
    };
  }

  if (citations.length === 0) {
    return {
      citations: [],
      findings: [],
      generated_at: generatedAt,
      required_fields: requiredFields,
      review_task: "Ingest and review official EPA, DPR, or SPCB source chunks before relying on this advisory.",
      status: "insufficient_sources",
      summary: `No reviewed source citations were retrieved for ${workflowLabels[input.workflow]}.`,
      workflow: input.workflow,
    };
  }

  const findings = workflowFindings(input, citations, requiredFields);

  return {
    citations,
    findings,
    generated_at: generatedAt,
    required_fields: requiredFields,
    review_task: findings.some((item) => item.severity !== "info")
      ? "Resolve warnings or attach missing evidence before closeout."
      : null,
    status: "advisory_ready",
    summary: `${workflowLabels[input.workflow]} advisory is ready with ${citations.length} cited source${citations.length === 1 ? "" : "s"}.`,
    workflow: input.workflow,
  };
}

export function getComplianceMultiUnitAuditSummary(
  units: LocationUnit[],
  auditItems: JobUnitAuditItem[],
): ComplianceMultiUnitAuditSummary {
  const activeUnits = units.filter((unit) => unit.status === "active");
  const auditsByUnit = new Map(
    auditItems.map((item) => [item.location_unit_id, item]),
  );
  const statuses = activeUnits.map(
    (unit) => auditsByUnit.get(unit.id)?.status ?? "pending",
  );
  const pending = statuses.filter((status) => status === "pending").length;
  const blocked = statuses.filter((status) => status === "inaccessible").length;
  const followUp = statuses.filter(
    (status) => status === "requires_follow_up",
  ).length;
  const skipped = statuses.filter((status) => status === "skipped").length;
  const treated = statuses.filter((status) => status === "treated").length;

  return {
    blocked,
    complete: activeUnits.length > 0 && pending === 0 && blocked + followUp + skipped === 0,
    followUp,
    pending,
    skipped,
    totalUnits: activeUnits.length,
    treated,
  };
}

export function chunkComplianceDocumentText(input: {
  documentId: string;
  sourceId: string;
  text: string;
  wordsPerChunk?: number;
}) {
  const words = input.text.trim().split(/\s+/).filter(Boolean);
  const wordsPerChunk = input.wordsPerChunk ?? 180;
  const chunks: Array<
    Pick<
      ComplianceChunk,
      | "chunk_index"
      | "content"
      | "document_id"
      | "heading"
      | "metadata"
      | "source_id"
      | "tokens_estimate"
    >
  > = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    const content = words.slice(index, index + wordsPerChunk).join(" ");

    chunks.push({
      chunk_index: chunks.length,
      content,
      document_id: input.documentId,
      heading: null,
      metadata: { hash: sourceHash(content) },
      source_id: input.sourceId,
      tokens_estimate: estimateTokens(content),
    });
  }

  return chunks;
}

export function validateComplianceSourceManifestEntry(
  input: ComplianceSourceManifestEntry,
): ComplianceSourceManifestEntry {
  return {
    authority: asAuthority(input.authority),
    branch: asBranch(input.branch),
    content_type: requireNonEmpty(input.content_type, "Content type"),
    document_title: normalizeOptional(input.document_title),
    document_url: normalizeOptional(input.document_url),
    effective_date: normalizeOptional(input.effective_date),
    id: requireNonEmpty(input.id, "Source manifest id"),
    jurisdiction: asJurisdiction(input.jurisdiction),
    retrieved_at: requireIsoDateLike(input.retrieved_at, "Retrieved at"),
    review_status: asReviewStatus(input.review_status),
    text_path: requireNonEmpty(input.text_path, "Text path"),
    title: requireNonEmpty(input.title, "Source title"),
    url: requireNonEmpty(input.url, "Source URL"),
    workflow: asWorkflow(input.workflow),
  };
}

export function buildComplianceIngestionPlan(input: {
  documentId: string;
  embeddings?: Array<number[] | null>;
  entry: ComplianceSourceManifestEntry;
  sourceId: string;
  text: string;
  wordsPerChunk?: number;
}): ComplianceIngestionPlan {
  const entry = validateComplianceSourceManifestEntry(input.entry);
  const rawText = requireNonEmpty(input.text, "Source text");
  const documentUrl = entry.document_url ?? entry.url;
  const documentTitle = entry.document_title ?? entry.title;
  const source_hash = buildComplianceSourceHash({
    retrievedAt: entry.retrieved_at,
    title: entry.title,
    url: entry.url,
  });
  const documentHash = sourceHash(
    `${documentTitle}|${documentUrl}|${entry.retrieved_at}|${rawText}`,
  );
  const chunks = chunkComplianceDocumentText({
    documentId: input.documentId,
    sourceId: input.sourceId,
    text: rawText,
    wordsPerChunk: input.wordsPerChunk,
  }).map((chunk, index) => ({
    ...chunk,
    embedding: input.embeddings?.[index] ?? null,
  }));

  return {
    chunks,
    document: {
      content_type: entry.content_type,
      document_url: documentUrl,
      raw_text: rawText,
      retrieved_at: entry.retrieved_at,
      review_status: entry.review_status,
      source_hash: documentHash,
      source_id: input.sourceId,
      title: documentTitle,
    },
    source: {
      authority: entry.authority,
      branch: entry.branch,
      effective_date: entry.effective_date ?? null,
      jurisdiction: entry.jurisdiction,
      retrieved_at: entry.retrieved_at,
      review_status: entry.review_status,
      source_hash,
      title: entry.title,
      url: entry.url,
      workflow: entry.workflow,
    },
  };
}

export function buildComplianceSourceHash(input: {
  retrievedAt: string;
  title: string;
  url: string;
}) {
  return sourceHash(`${input.title}|${input.url}|${input.retrievedAt}`);
}

export function getComplianceKnowledgeBaseReadiness(input: {
  chunks: ComplianceChunk[];
  documents: ComplianceDocument[];
  sources: ComplianceSource[];
}): ComplianceKnowledgeBaseReadiness {
  const workflows = complianceWorkflows.map((workflow) => {
    const workflowSources = input.sources.filter(
      (source) => source.workflow === workflow,
    );
    const sourceIds = new Set(workflowSources.map((source) => source.id));
    const documents = input.documents.filter((document) =>
      sourceIds.has(document.source_id),
    );
    const chunks = input.chunks.filter((chunk) => sourceIds.has(chunk.source_id));
    const reviewedSources = workflowSources.filter(
      (source) => source.review_status === "reviewed",
    ).length;
    const draftSources = workflowSources.filter(
      (source) => source.review_status === "draft",
    ).length;
    const archivedSources = workflowSources.filter(
      (source) => source.review_status === "archived",
    ).length;
    const status: ComplianceKnowledgeBaseReadinessStatus =
      reviewedSources > 0 && chunks.length > 0
        ? "ready"
        : draftSources > 0
          ? "draft_only"
          : "needs_sources";

    return {
      archivedSources,
      chunks: chunks.length,
      documents: documents.length,
      draftSources,
      lastRetrievedAt: latestDate(
        workflowSources.map((source) => source.retrieved_at),
      ),
      reviewedSources,
      status,
      workflow,
    };
  });

  return {
    readyWorkflowCount: workflows.filter((workflow) => workflow.status === "ready")
      .length,
    totals: {
      archivedSources: input.sources.filter(
        (source) => source.review_status === "archived",
      ).length,
      chunks: input.chunks.length,
      documents: input.documents.length,
      draftSources: input.sources.filter((source) => source.review_status === "draft")
        .length,
      reviewedSources: input.sources.filter(
        (source) => source.review_status === "reviewed",
      ).length,
      sources: input.sources.length,
    },
    workflows,
  };
}

export async function listComplianceSources() {
  return listComplianceSourceRecords();
}

export async function listComplianceDocuments() {
  return listComplianceDocumentRecords();
}

export async function listComplianceChunks() {
  return listComplianceChunkRecords();
}

export async function searchComplianceChunks(input: ComplianceChunkSearchInput) {
  return searchComplianceChunkRecords(input);
}

export async function listComplianceAdvisoryAudits() {
  return listComplianceAdvisoryAuditRecords();
}

export async function createComplianceAdvisoryAudit(
  input: {
    citation_chunk_ids: string[];
    created_by?: string | null;
    request: Record<string, unknown>;
    response: ComplianceAdvisory;
    status: ComplianceAdvisoryStatus;
    workflow: ComplianceWorkflow;
  },
  client?: AuthSupabaseClient,
): Promise<ComplianceAdvisoryAudit> {
  return createComplianceAdvisoryAuditRecord(input, client);
}

export function validateComplianceChunkSearchInput(
  input: ComplianceChunkSearchInput,
): ComplianceChunkSearchInput {
  return {
    authority: input.authority ?? "all",
    embedding: input.embedding ?? null,
    limit:
      input.limit === undefined
        ? 8
        : Math.max(1, Math.min(Math.trunc(input.limit), 20)),
    query: normalizeOptional(input.query),
    workflow: input.workflow ?? "all",
  };
}

export function validateLocationUnitLabel(label: string) {
  return requireNonEmpty(label, "Unit label");
}
