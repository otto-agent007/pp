import {
  CHEMICAL_LOG_MISSING_TECHNICIAN_CREDENTIAL_COPY,
  getChemicalLogCredentialReview,
  getWdoCredentialReview,
} from "./technicianLicenses";
import type {
  ChemicalInventoryItem,
  ChemicalLog,
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryRequest,
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
  TechnicianLicense,
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

export type ComplianceReviewItemSeverity = "info" | "warning" | "critical";

export type ComplianceReviewItemStatus = "open" | "review";

export type ComplianceReviewItemCategory =
  | "advisory"
  | "chemical"
  | "source"
  | "wdo";

export type ComplianceReviewItemFilter =
  | "advisory"
  | "all"
  | "chemical"
  | "critical"
  | "source"
  | "wdo";

export interface ComplianceReviewItem {
  auditId?: string;
  category: ComplianceReviewItemCategory;
  chemicalLogId?: string;
  customerName?: string;
  description: string;
  id: string;
  jobHref?: string;
  jobId?: string;
  missingEvidence: string[];
  nextAction: string;
  severity: ComplianceReviewItemSeverity;
  sourceId?: string;
  status: ComplianceReviewItemStatus;
  title: string;
  workflow: ComplianceWorkflow;
}

export interface ComplianceNeedsReviewQueueInput {
  advisoryAuditLimit?: number;
  audits: ComplianceAdvisoryAudit[];
  chemicalLogs: ChemicalLog[];
  chunks: ComplianceChunk[];
  documents: ComplianceDocument[];
  jobs: Job[];
  now?: string;
  sources: ComplianceSource[];
  technicianLicenses?: TechnicianLicense[];
}

export interface ComplianceNeedsReviewSummary {
  advisoryItems: number;
  chemicalItems: number;
  criticalItems: number;
  openItems: number;
  sourceItems: number;
  warningItems: number;
  wdoItems: number;
}

export type ComplianceGuardrailStatus = "clear" | "warning" | "critical";

export interface ComplianceGuardrail {
  items: ComplianceReviewItem[];
  jobId: string;
  label: string;
  nextStep: string;
  status: ComplianceGuardrailStatus;
  summary: string;
}

export interface ComplianceGuardrailSummary {
  clearJobs: number;
  criticalJobs: number;
  totalJobs: number;
  warningJobs: number;
}

export type ChemicalProductBinderStatus =
  | "clear"
  | "review_recommended"
  | "critical_review";

export type ChemicalProductBinderFilter =
  | "all"
  | "needs_review"
  | "missing_epa"
  | "license_review"
  | "low_stock";

export interface ChemicalProductBinderRecentLog {
  amountUsed: number;
  createdAt: string;
  customerName: string | null;
  id: string;
  jobHref?: string;
  jobId: string;
  targetSiteLabel: string | null;
  unit: string | null;
}

export interface ChemicalProductBinderItem {
  chemicalId: string;
  currentStock: number | null;
  epaRegistrationNumber: string | null;
  lowStock: boolean;
  logsMissingAmountUnit: number;
  logsMissingTargetSite: number;
  missingEvidenceCount: number;
  missingLabels: string[];
  nextStep: string;
  productName: string;
  recentLogs: ChemicalProductBinderRecentLog[];
  recentUsageCount: number;
  sourceReadinessLabel: string;
  status: ChemicalProductBinderStatus;
  unit: string | null;
  unknownLicenseReviewCount: number;
}

export interface ChemicalProductBinderSummary {
  logsMissingAmountUnit: number;
  logsMissingTargetSite: number;
  logsNeedingLicenseReview: number;
  productsMissingEpa: number;
  productsWithReviewItems: number;
  totalProducts: number;
}

export interface ChemicalProductBinderInput {
  chemicalLogs: ChemicalLog[];
  chunks: ComplianceChunk[];
  documents: ComplianceDocument[];
  inventory: ChemicalInventoryItem[];
  now?: string;
  sources: ComplianceSource[];
  technicianLicenses?: TechnicianLicense[];
}

export type ComplianceAdvisoryEvaluationStatus =
  | "blocked"
  | "operator_review_required"
  | "ready";

export type ComplianceAdvisoryEvaluationCheckState =
  | "blocked"
  | "pass"
  | "review";

export interface ComplianceAdvisoryEvaluationCheck {
  detail: string;
  id: "advisory-scope" | "required-evidence" | "source-citations";
  label: string;
  state: ComplianceAdvisoryEvaluationCheckState;
}

export interface ComplianceAdvisoryEvaluation {
  checks: ComplianceAdvisoryEvaluationCheck[];
  label: string;
  status: ComplianceAdvisoryEvaluationStatus;
  summary: string;
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

function plural(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function severityRank(severity: ComplianceReviewItemSeverity) {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function sortComplianceReviewItems(items: ComplianceReviewItem[]) {
  return [...items].sort((left, right) => {
    const severityDelta =
      severityRank(right.severity) - severityRank(left.severity);

    if (severityDelta !== 0) return severityDelta;

    return left.title.localeCompare(right.title);
  });
}

function itemJobHref(job: Job) {
  const route = job.status === "completed" ? "/closeouts" : "/jobs";

  return `${route}?job_id=${encodeURIComponent(job.id)}`;
}

function itemCustomerName(job: Job | null | undefined) {
  return job?.customer?.name ?? undefined;
}

function itemJobContext(log: ChemicalLog) {
  return log.job ?? null;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
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

  if (
    input.workflow === "chemical_application" &&
    input.chemicalLog?.chemical?.epa_number
  ) {
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
    reason: hasKey
      ? null
      : "OPENAI_API_KEY is not configured for server-side RAG.",
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
      review_task:
        "Configure OPENAI_API_KEY and ingest reviewed compliance sources.",
      status: "rag_disabled",
      summary:
        "Compliance RAG is disabled because the server-side model key is not configured.",
      workflow: input.workflow,
    };
  }

  if (citations.length === 0) {
    return {
      citations: [],
      findings: [],
      generated_at: generatedAt,
      required_fields: requiredFields,
      review_task:
        "Ingest and review official EPA, DPR, or SPCB source chunks before relying on this advisory.",
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

export function evaluateComplianceAdvisory(
  advisory: ComplianceAdvisory,
): ComplianceAdvisoryEvaluation {
  const citationCount = advisory.citations.length;
  const missingEvidenceCount = advisory.required_fields.filter(
    (field) => field.status === "missing",
  ).length;
  const unknownEvidenceCount = advisory.required_fields.filter(
    (field) => field.status === "unknown",
  ).length;
  const warningFindingCount = advisory.findings.filter(
    (finding) => finding.severity !== "info",
  ).length;
  const operatorReviewCount =
    unknownEvidenceCount + warningFindingCount + (advisory.review_task ? 1 : 0);
  const blocked =
    advisory.status === "rag_disabled" ||
    advisory.status === "insufficient_sources" ||
    citationCount === 0;
  const status: ComplianceAdvisoryEvaluationStatus = blocked
    ? "blocked"
    : missingEvidenceCount > 0 || operatorReviewCount > 0
      ? "operator_review_required"
      : "ready";
  const label =
    status === "blocked"
      ? "Blocked until sources are ready"
      : status === "operator_review_required"
        ? "Operator review required"
        : "Advisory ready for operator review";
  const summary = blocked
    ? "Advisory is blocked until reviewed citations are available."
    : `Cited advisory has ${plural(citationCount, "source")}, ${plural(
        missingEvidenceCount,
        "missing evidence field",
      )}, and ${plural(operatorReviewCount, "operator review item")}.`;

  return {
    checks: [
      {
        detail: blocked
          ? "No reviewed citations are attached to this advisory response."
          : `${plural(citationCount, "reviewed citation")} attached.`,
        id: "source-citations",
        label: "Source citations",
        state: blocked ? "blocked" : "pass",
      },
      {
        detail:
          missingEvidenceCount > 0
            ? `${plural(missingEvidenceCount, "required field")} missing from the workflow context.`
            : "Required evidence is present or explicitly marked for operator review.",
        id: "required-evidence",
        label: "Required evidence",
        state: missingEvidenceCount > 0 ? "review" : "pass",
      },
      {
        detail:
          "Advisories are operator aids only and must be verified against cited source material before closeout.",
        id: "advisory-scope",
        label: "Advisory scope",
        state: "review",
      },
    ],
    label,
    status,
    summary,
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
    complete:
      activeUnits.length > 0 &&
      pending === 0 &&
      blocked + followUp + skipped === 0,
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
    const chunks = input.chunks.filter((chunk) =>
      sourceIds.has(chunk.source_id),
    );
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
    readyWorkflowCount: workflows.filter(
      (workflow) => workflow.status === "ready",
    ).length,
    totals: {
      archivedSources: input.sources.filter(
        (source) => source.review_status === "archived",
      ).length,
      chunks: input.chunks.length,
      documents: input.documents.length,
      draftSources: input.sources.filter(
        (source) => source.review_status === "draft",
      ).length,
      reviewedSources: input.sources.filter(
        (source) => source.review_status === "reviewed",
      ).length,
      sources: input.sources.length,
    },
    workflows,
  };
}

type ChemicalProductBinderProduct = {
  current_stock: number | null;
  epa_number: string | null;
  id: string;
  name: string;
  reorder_level: number | null;
  unit: string | null;
};

function hasValidRegistrationNumber(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  return Boolean(normalized && normalized !== "n/a");
}

function hasLicenseOrSupervisionEvidence(log: ChemicalLog) {
  return /\b(license|licensed|operator|supervised|supervision)\b/i.test(
    log.notes ?? "",
  );
}

function chemicalLogTargetSite(log: ChemicalLog) {
  const job = itemJobContext(log);

  return (
    job?.location?.address?.trim() ||
    job?.location?.nickname?.trim() ||
    job?.service_notes?.trim() ||
    null
  );
}

function binderSourceReadiness(input: ChemicalProductBinderInput) {
  const readiness = getComplianceKnowledgeBaseReadiness({
    chunks: input.chunks,
    documents: input.documents,
    sources: input.sources,
  });
  const chemicalReadiness = readiness.workflows.find(
    (workflow) => workflow.workflow === "chemical_application",
  );

  if (chemicalReadiness?.status === "ready") {
    return {
      label: "Reviewed chemical source chunks ready",
      ready: true,
    };
  }

  if (chemicalReadiness?.status === "draft_only") {
    return {
      label: "Chemical source review recommended",
      ready: false,
    };
  }

  return {
    label: "Chemical source missing evidence",
    ready: false,
  };
}

function productNextStep(input: {
  hasCriticalReview: boolean;
  lowStock: boolean;
  sourceReady: boolean;
  structuredCredentialReview: boolean;
  unknownLicenseReviewCount: number;
}) {
  if (input.hasCriticalReview) {
    return "Review recommended: resolve missing evidence in inventory or job records before relying on this binder.";
  }

  if (input.unknownLicenseReviewCount > 0) {
    return input.structuredCredentialReview
      ? "operator credential review required: capture or confirm structured technician license evidence before relying on this binder."
      : "operator review required: capture license or supervision detail in chemical log notes before relying on this binder.";
  }

  if (input.lowStock) {
    return "Review recommended: reconcile stock and reorder before field use.";
  }

  if (!input.sourceReady) {
    return "Review recommended: review chemical source readiness before source-backed advisory use.";
  }

  return "Product record is clear for office binder review.";
}

function productStatusRank(status: ChemicalProductBinderStatus) {
  if (status === "critical_review") return 3;
  if (status === "review_recommended") return 2;
  return 1;
}

function sortChemicalProductBinderItems(items: ChemicalProductBinderItem[]) {
  return [...items].sort((left, right) => {
    const statusDelta =
      productStatusRank(right.status) - productStatusRank(left.status);

    if (statusDelta !== 0) return statusDelta;

    return left.productName.localeCompare(right.productName);
  });
}

export function buildChemicalProductBinder(
  input: ChemicalProductBinderInput,
): ChemicalProductBinderItem[] {
  const productsById = new Map<string, ChemicalProductBinderProduct>();
  const logsByChemicalId = new Map<string, ChemicalLog[]>();
  const sourceReadiness = binderSourceReadiness(input);

  for (const item of input.inventory) {
    productsById.set(item.id, {
      current_stock: item.current_stock,
      epa_number: item.epa_number,
      id: item.id,
      name: item.name,
      reorder_level: item.reorder_level,
      unit: item.unit,
    });
  }

  for (const log of input.chemicalLogs) {
    const chemicalLogs = logsByChemicalId.get(log.chemical_id) ?? [];
    chemicalLogs.push(log);
    logsByChemicalId.set(log.chemical_id, chemicalLogs);

    if (!productsById.has(log.chemical_id)) {
      productsById.set(log.chemical_id, {
        current_stock: log.chemical?.current_stock ?? null,
        epa_number: log.chemical?.epa_number ?? null,
        id: log.chemical_id,
        name: log.chemical?.name ?? "Unknown product",
        reorder_level: log.chemical?.reorder_level ?? null,
        unit: log.chemical?.unit ?? null,
      });
    }
  }

  for (const chemicalLogs of logsByChemicalId.values()) {
    chemicalLogs.sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    );
  }

  const items = Array.from(productsById.values()).map((product) => {
    const logs = logsByChemicalId.get(product.id) ?? [];
    const missingLabels = new Set<string>();
    const structuredCredentialReview = input.technicianLicenses !== undefined;
    const missingEpa = !hasValidRegistrationNumber(product.epa_number);
    const lowStock =
      product.current_stock !== null &&
      (product.current_stock < 0 ||
        (product.reorder_level !== null &&
          product.current_stock <= product.reorder_level));
    const logsMissingAmountUnit = logs.filter(
      (log) => !(log.amount_used > 0) || !hasText(product.unit),
    ).length;
    const logsMissingTargetSite = logs.filter(
      (log) => !hasText(chemicalLogTargetSite(log)),
    ).length;
    const credentialReviews = structuredCredentialReview
      ? logs.map((log) =>
          getChemicalLogCredentialReview(
            log,
            input.technicianLicenses ?? [],
            input.now,
          ),
        )
      : [];
    const unknownLicenseReviewCount = structuredCredentialReview
      ? credentialReviews.filter((review) => review.status !== "ready").length
      : logs.filter((log) => !hasLicenseOrSupervisionEvidence(log)).length;

    if (missingEpa) {
      missingLabels.add("EPA/California registration number");
    }

    if (logsMissingAmountUnit > 0) {
      missingLabels.add("Amount and unit");
    }

    if (logsMissingTargetSite > 0) {
      missingLabels.add("Target site or treated area");
    }

    if (unknownLicenseReviewCount > 0) {
      const credentialGap = credentialReviews.find(
        (review) => review.status !== "ready",
      );

      if (
        structuredCredentialReview &&
        credentialGap?.summary ===
          CHEMICAL_LOG_MISSING_TECHNICIAN_CREDENTIAL_COPY
      ) {
        missingLabels.add(CHEMICAL_LOG_MISSING_TECHNICIAN_CREDENTIAL_COPY);
      } else if (
        structuredCredentialReview &&
        credentialGap?.status === "expiring_soon"
      ) {
        missingLabels.add("Expiration review");
      } else if (structuredCredentialReview) {
        missingLabels.add("License evidence missing");
      } else {
        missingLabels.add("License or supervision detail");
      }
    }

    if (lowStock) {
      missingLabels.add(
        product.current_stock !== null && product.current_stock < 0
          ? "Negative stock balance"
          : "Low stock review",
      );
    }

    if (!sourceReadiness.ready) {
      missingLabels.add("Reviewed chemical source chunks");
    }

    const hasCriticalReview =
      missingEpa ||
      logsMissingAmountUnit > 0 ||
      logsMissingTargetSite > 0 ||
      (product.current_stock !== null && product.current_stock < 0);
    const status: ChemicalProductBinderStatus = hasCriticalReview
      ? "critical_review"
      : unknownLicenseReviewCount > 0 || lowStock || !sourceReadiness.ready
        ? "review_recommended"
        : "clear";

    return {
      chemicalId: product.id,
      currentStock: product.current_stock,
      epaRegistrationNumber: product.epa_number,
      lowStock,
      logsMissingAmountUnit,
      logsMissingTargetSite,
      missingEvidenceCount: logsMissingAmountUnit + logsMissingTargetSite,
      missingLabels: Array.from(missingLabels),
      nextStep: productNextStep({
        hasCriticalReview,
        lowStock,
        sourceReady: sourceReadiness.ready,
        structuredCredentialReview,
        unknownLicenseReviewCount,
      }),
      productName: product.name,
      recentLogs: logs.slice(0, 3).map((log) => {
        const job = itemJobContext(log);

        return {
          amountUsed: log.amount_used,
          createdAt: log.created_at,
          customerName: job?.customer?.name ?? null,
          id: log.id,
          jobHref: job ? itemJobHref(job) : undefined,
          jobId: log.job_id,
          targetSiteLabel: chemicalLogTargetSite(log),
          unit: product.unit,
        };
      }),
      recentUsageCount: logs.length,
      sourceReadinessLabel: sourceReadiness.label,
      status,
      unit: product.unit,
      unknownLicenseReviewCount,
    };
  });

  return sortChemicalProductBinderItems(items);
}

export function getChemicalProductBinderSummary(
  items: ChemicalProductBinderItem[],
): ChemicalProductBinderSummary {
  return {
    logsMissingAmountUnit: items.reduce(
      (total, item) => total + item.logsMissingAmountUnit,
      0,
    ),
    logsMissingTargetSite: items.reduce(
      (total, item) => total + item.logsMissingTargetSite,
      0,
    ),
    logsNeedingLicenseReview: items.reduce(
      (total, item) => total + item.unknownLicenseReviewCount,
      0,
    ),
    productsMissingEpa: items.filter(
      (item) => !hasValidRegistrationNumber(item.epaRegistrationNumber),
    ).length,
    productsWithReviewItems: items.filter((item) => item.status !== "clear")
      .length,
    totalProducts: items.length,
  };
}

export function filterChemicalProductBinderItems(
  items: ChemicalProductBinderItem[],
  filter: ChemicalProductBinderFilter,
) {
  if (filter === "all") return sortChemicalProductBinderItems(items);
  if (filter === "needs_review") {
    return sortChemicalProductBinderItems(
      items.filter((item) => item.status !== "clear"),
    );
  }
  if (filter === "missing_epa") {
    return sortChemicalProductBinderItems(
      items.filter(
        (item) => !hasValidRegistrationNumber(item.epaRegistrationNumber),
      ),
    );
  }
  if (filter === "license_review") {
    return sortChemicalProductBinderItems(
      items.filter((item) => item.unknownLicenseReviewCount > 0),
    );
  }

  return sortChemicalProductBinderItems(items.filter((item) => item.lowStock));
}

function buildChemicalReviewItems(input: {
  logs: ChemicalLog[];
  now?: string;
  technicianLicenses?: TechnicianLicense[];
}) {
  const structuredCredentialReview = input.technicianLicenses !== undefined;

  return input.logs.flatMap((log): ComplianceReviewItem[] => {
    const job = itemJobContext(log);
    const missingEvidence: string[] = [];
    let hasCriticalMissingEvidence = false;

    function addMissing(label: string, critical = true) {
      missingEvidence.push(label);
      hasCriticalMissingEvidence ||= critical;
    }

    if (!hasText(log.created_at)) {
      addMissing("Application time");
    }

    if (!hasText(log.chemical?.name)) {
      addMissing("Product name");
    }

    if (!hasText(log.chemical?.epa_number)) {
      addMissing("EPA/California registration number");
    }

    if (!(log.amount_used > 0) || !hasText(log.chemical?.unit)) {
      addMissing("Amount and unit");
    }

    if (!hasText(job?.location?.address) && !hasText(job?.service_notes)) {
      addMissing("Target site or treated area");
    }

    if (structuredCredentialReview) {
      const credentialReview = getChemicalLogCredentialReview(
        log,
        input.technicianLicenses ?? [],
        input.now,
      );

      if (credentialReview.status === "expiring_soon") {
        addMissing("Expiration review", false);
      } else if (credentialReview.status !== "ready") {
        addMissing(credentialReview.summary, false);
      }
    } else {
      addMissing("License or supervision detail", false);
    }

    if (missingEvidence.length === 0) return [];

    return [
      {
        category: "chemical",
        chemicalLogId: log.id,
        customerName: itemCustomerName(job),
        description:
          "Chemical application record has missing evidence; operator review required before relying on this advisory workflow.",
        id: `chemical:${log.id}`,
        jobHref: job ? itemJobHref(job) : undefined,
        jobId: job?.id ?? log.job_id,
        missingEvidence,
        nextAction:
          "Open the job or closeout and capture the missing chemical-use evidence; advisory only; verify against cited source.",
        severity: hasCriticalMissingEvidence ? "critical" : "warning",
        status: "open",
        title: log.chemical?.name
          ? `${log.chemical.name} chemical review`
          : "Chemical application review",
        workflow: "chemical_application",
      },
    ];
  });
}

const wdoSignalPattern =
  /\b(termite|wdo|wood[- ]destroying|branch 3|branch three|drywood|subterranean|fungus|beetle|escrow)\b/i;

function jobWdoText(job: Job) {
  return [
    job.service_notes,
    job.customer?.service_notes,
    job.location?.service_notes,
    job.location?.nickname,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildWdoReviewItems(input: {
  jobs: Job[];
  now?: string;
  technicianLicenses?: TechnicianLicense[];
}) {
  const structuredCredentialReview = input.technicianLicenses !== undefined;

  return input.jobs
    .filter((job) => wdoSignalPattern.test(jobWdoText(job)))
    .map((job): ComplianceReviewItem => {
      const credentialReview = structuredCredentialReview
        ? getWdoCredentialReview(job, input.technicianLicenses ?? [], input.now)
        : null;
      const missingEvidence = [
        "WDO report or inspection draft",
        "Findings, damaged members, or inaccessible-area evidence",
        "Corrective recommendations or follow-up disposition",
      ];

      if (credentialReview && credentialReview.status !== "ready") {
        missingEvidence.push("Missing Branch 3 reviewer");
      }

      return {
        category: "wdo",
        customerName: itemCustomerName(job),
        description:
          "WDO/Branch 3-like job signal found, but current records cannot prove the report, findings, and recommendation evidence.",
        id: `wdo:${job.id}`,
        jobHref: itemJobHref(job),
        jobId: job.id,
        missingEvidence,
        nextAction:
          "Review the job closeout and attach WDO/Branch 3 evidence where applicable; advisory only; verify against cited source.",
        severity: "warning",
        status: "open",
        title: "WDO / Branch 3 operator review required",
        workflow: "wdo_branch3",
      };
    });
}

function reviewedChunkCountForWorkflow(input: {
  chunks: ComplianceChunk[];
  sources: ComplianceSource[];
  workflow: ComplianceWorkflow;
}) {
  const reviewedSourceIds = new Set(
    input.sources
      .filter(
        (source) =>
          source.workflow === input.workflow &&
          source.review_status === "reviewed",
      )
      .map((source) => source.id),
  );

  return input.chunks.filter((chunk) => reviewedSourceIds.has(chunk.source_id))
    .length;
}

function buildSourceReadinessReviewItems(input: {
  chunks: ComplianceChunk[];
  documents: ComplianceDocument[];
  sources: ComplianceSource[];
}) {
  const readiness = getComplianceKnowledgeBaseReadiness(input);

  return readiness.workflows.flatMap((workflow): ComplianceReviewItem[] => {
    const reviewedChunkCount = reviewedChunkCountForWorkflow({
      chunks: input.chunks,
      sources: input.sources,
      workflow: workflow.workflow,
    });

    if (reviewedChunkCount > 0) return [];

    const draftOnly = workflow.draftSources > 0;
    const hasReviewedSourceWithoutChunks = workflow.reviewedSources > 0;
    const title = draftOnly
      ? `${workflowLabels[workflow.workflow]} draft source review`
      : `${workflowLabels[workflow.workflow]} source readiness`;
    const missingEvidence = draftOnly
      ? ["Reviewed source chunks for advisory citations"]
      : hasReviewedSourceWithoutChunks
        ? ["Reviewed source chunks are not available for this source lane"]
        : ["Reviewed source lane"];

    return [
      {
        category: "source",
        description: draftOnly
          ? "Source lane has draft material only; operator review required before source-backed advisories rely on it."
          : "Source readiness needs reviewed chunks before source-backed advisories can cite this workflow.",
        id: `source:${workflow.workflow}`,
        missingEvidence,
        nextAction: draftOnly
          ? "Review and promote source material, then ingest reviewed chunks."
          : "Ingest and review official source chunks for this workflow.",
        severity: draftOnly ? "warning" : "critical",
        status: "open",
        title,
        workflow: workflow.workflow,
      },
    ];
  });
}

function advisoryAuditContext(input: {
  audit: ComplianceAdvisoryAudit;
  chemicalLogJobIdById: Map<string, string>;
}) {
  const request = input.audit.request as unknown as ComplianceAdvisoryRequest;
  const context = request.context ?? {};
  const chemicalLogId =
    typeof context.chemical_log_id === "string" &&
    hasText(context.chemical_log_id)
      ? context.chemical_log_id
      : undefined;
  const jobId =
    typeof context.job_id === "string" && hasText(context.job_id)
      ? context.job_id
      : chemicalLogId
        ? input.chemicalLogJobIdById.get(chemicalLogId)
        : undefined;

  return { chemicalLogId, jobId };
}

function buildAdvisoryAuditReviewItems(input: {
  audits: ComplianceAdvisoryAudit[];
  chemicalLogs: ChemicalLog[];
  limit: number;
}) {
  const chemicalLogJobIdById = new Map(
    input.chemicalLogs.map((log) => [log.id, log.job_id]),
  );

  return [...input.audits]
    .sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    )
    .slice(0, input.limit)
    .flatMap((audit): ComplianceReviewItem[] => {
      const context = advisoryAuditContext({ audit, chemicalLogJobIdById });
      if (
        audit.status === "rag_disabled" ||
        audit.status === "insufficient_sources"
      ) {
        return [
          {
            auditId: audit.id,
            category: audit.status === "rag_disabled" ? "source" : "advisory",
            chemicalLogId: context.chemicalLogId,
            description:
              audit.status === "rag_disabled"
                ? "Recent advisory audit shows RAG disabled; setup/source review required before source-backed advisory use."
                : "Recent advisory audit has insufficient sources; operator review required before relying on this workflow.",
            id: `audit:${audit.id}:status`,
            jobId: context.jobId,
            missingEvidence:
              audit.status === "rag_disabled"
                ? ["RAG runtime setup and reviewed source chunks"]
                : ["Reviewed source citations"],
            nextAction:
              "Check setup readiness and reviewed source coverage; advisory only; verify against cited source.",
            severity: audit.status === "rag_disabled" ? "warning" : "critical",
            status: "open",
            title: `${workflowLabels[audit.workflow]} advisory setup review`,
            workflow: audit.workflow,
          },
        ];
      }

      const findings = audit.response.findings.filter(
        (finding) => finding.severity !== "info",
      );
      const hasReviewTask = hasText(audit.response.review_task);

      if (findings.length === 0 && !hasReviewTask) return [];

      return [
        {
          auditId: audit.id,
          category: "advisory",
          chemicalLogId: context.chemicalLogId,
          description:
            "Recent advisory audit includes findings or a review task; operator review required before closeout reliance.",
          id: `audit:${audit.id}:review`,
          jobId: context.jobId,
          missingEvidence: [
            ...findings.map((finding) => finding.title),
            ...(hasReviewTask ? ["Advisory review task"] : []),
          ],
          nextAction:
            "Resolve advisory findings or attach missing evidence; advisory only; verify against cited source.",
          severity: findings.some((finding) => finding.severity === "critical")
            ? "critical"
            : "warning",
          status: "review",
          title: `${workflowLabels[audit.workflow]} advisory operator review`,
          workflow: audit.workflow,
        },
      ];
    });
}

export function buildComplianceNeedsReviewQueue(
  input: ComplianceNeedsReviewQueueInput,
) {
  return sortComplianceReviewItems([
    ...buildChemicalReviewItems({
      logs: input.chemicalLogs,
      now: input.now,
      technicianLicenses: input.technicianLicenses,
    }),
    ...buildWdoReviewItems({
      jobs: input.jobs,
      now: input.now,
      technicianLicenses: input.technicianLicenses,
    }),
    ...buildSourceReadinessReviewItems(input),
    ...buildAdvisoryAuditReviewItems({
      audits: input.audits,
      chemicalLogs: input.chemicalLogs,
      limit: input.advisoryAuditLimit ?? 6,
    }),
  ]);
}

export function buildComplianceReviewItems(
  input: ComplianceNeedsReviewQueueInput,
) {
  return buildComplianceNeedsReviewQueue(input);
}

export function getComplianceNeedsReviewSummary(
  items: ComplianceReviewItem[],
): ComplianceNeedsReviewSummary {
  return {
    advisoryItems: items.filter((item) => item.category === "advisory").length,
    chemicalItems: items.filter((item) => item.category === "chemical").length,
    criticalItems: items.filter((item) => item.severity === "critical").length,
    openItems: items.length,
    sourceItems: items.filter((item) => item.category === "source").length,
    warningItems: items.filter((item) => item.severity === "warning").length,
    wdoItems: items.filter((item) => item.category === "wdo").length,
  };
}

export function filterComplianceReviewItemsForJob(input: {
  items: ComplianceReviewItem[];
  jobId: string;
}) {
  return sortComplianceReviewItems(
    input.items.filter((item) => item.jobId === input.jobId),
  );
}

export function buildComplianceGuardrailForJob(input: {
  items: ComplianceReviewItem[];
  jobId: string;
}): ComplianceGuardrail {
  const items = filterComplianceReviewItemsForJob(input);
  const criticalItems = items.filter((item) => item.severity === "critical");

  if (items.length === 0) {
    return {
      items,
      jobId: input.jobId,
      label: "Compliance clear",
      nextStep:
        "Continue normal closeout or billing handoff after office review.",
      status: "clear",
      summary: "No missing evidence review items are linked to this job.",
    };
  }

  if (criticalItems.length > 0) {
    return {
      items,
      jobId: input.jobId,
      label: "Critical compliance review",
      nextStep:
        "Resolve or document missing evidence before customer handoff; advisory only.",
      status: "critical",
      summary: `operator review required for ${plural(
        criticalItems.length,
        "critical item",
      )} with missing evidence.`,
    };
  }

  return {
    items,
    jobId: input.jobId,
    label: "Compliance review recommended",
    nextStep:
      "Review missing evidence before closeout, invoice, or portal handoff; advisory only.",
    status: "warning",
    summary: `Compliance review recommended for ${plural(
      items.length,
      "item",
    )} with missing evidence.`,
  };
}

export function getComplianceGuardrailSummary(input: {
  items: ComplianceReviewItem[];
  jobIds: string[];
}): ComplianceGuardrailSummary {
  const counts: ComplianceGuardrailSummary = {
    clearJobs: 0,
    criticalJobs: 0,
    totalJobs: 0,
    warningJobs: 0,
  };

  for (const jobId of new Set(input.jobIds)) {
    const guardrail = buildComplianceGuardrailForJob({
      items: input.items,
      jobId,
    });

    counts.totalJobs += 1;

    if (guardrail.status === "critical") {
      counts.criticalJobs += 1;
    } else if (guardrail.status === "warning") {
      counts.warningJobs += 1;
    } else {
      counts.clearJobs += 1;
    }
  }

  return counts;
}

export function filterComplianceReviewItems(
  items: ComplianceReviewItem[],
  filter: ComplianceReviewItemFilter,
) {
  if (filter === "all") return sortComplianceReviewItems(items);
  if (filter === "critical") {
    return sortComplianceReviewItems(
      items.filter((item) => item.severity === "critical"),
    );
  }

  return sortComplianceReviewItems(
    items.filter((item) => item.category === filter),
  );
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
