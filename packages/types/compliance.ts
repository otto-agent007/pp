export type ComplianceJurisdiction = "california" | "federal";

export type ComplianceAuthority = "cdpr" | "epa" | "spcb" | "internal";

export type ComplianceWorkflow =
  | "chemical_application"
  | "multi_unit_audit"
  | "recurring_route"
  | "wdo_branch3";

export type ComplianceBranch = "branch_2" | "branch_3" | "general";

export type ComplianceReviewStatus = "draft" | "reviewed" | "archived";

export type ComplianceFindingSeverity = "info" | "warning" | "critical";

export type ComplianceAdvisoryStatus =
  | "advisory_ready"
  | "insufficient_sources"
  | "rag_disabled";

export type ComplianceSetupStatus = "ready" | "schema_unavailable";

export type ComplianceRequiredFieldStatus = "missing" | "present" | "unknown";

export interface ComplianceSource {
  id: string;
  title: string;
  url: string;
  jurisdiction: ComplianceJurisdiction;
  authority: ComplianceAuthority;
  workflow: ComplianceWorkflow;
  branch: ComplianceBranch;
  effective_date: string | null;
  retrieved_at: string;
  source_hash: string;
  review_status: ComplianceReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocument {
  id: string;
  source_id: string;
  title: string;
  document_url: string;
  content_type: string;
  retrieved_at: string;
  source_hash: string;
  review_status: ComplianceReviewStatus;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
  source?: ComplianceSource;
}

export interface ComplianceChunk {
  id: string;
  source_id: string;
  document_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  tokens_estimate: number | null;
  metadata: Record<string, unknown>;
  similarity?: number | null;
  created_at: string;
  updated_at: string;
  document?: ComplianceDocument;
  source?: ComplianceSource;
}

export interface ComplianceCitation {
  authority: ComplianceAuthority;
  chunk_id: string;
  document_title: string;
  excerpt: string;
  source_title: string;
  url: string;
}

export interface ComplianceRequiredField {
  field: string;
  label: string;
  reason: string;
  status: ComplianceRequiredFieldStatus;
}

export interface ComplianceFinding {
  citation_chunk_ids: string[];
  message: string;
  severity: ComplianceFindingSeverity;
  title: string;
  workflow: ComplianceWorkflow;
}

export interface ComplianceAdvisory {
  citations: ComplianceCitation[];
  findings: ComplianceFinding[];
  generated_at: string;
  required_fields: ComplianceRequiredField[];
  review_task: string | null;
  status: ComplianceAdvisoryStatus;
  summary: string;
  workflow: ComplianceWorkflow;
}

export interface ComplianceSetupReadiness {
  available: boolean;
  migrationName: "20260516175724_california_compliance_rag_v1.sql";
  reason: string | null;
  status: ComplianceSetupStatus;
}

export interface ComplianceAdvisoryAudit {
  id: string;
  workflow: ComplianceWorkflow;
  request: Record<string, unknown>;
  response: ComplianceAdvisory;
  citation_chunk_ids: string[];
  status: ComplianceAdvisoryStatus;
  created_by: string | null;
  created_at: string;
}

export interface ComplianceAdvisoryRequest {
  context?: {
    chemical_log_id?: string | null;
    job_id?: string | null;
    location_id?: string | null;
    unit_ids?: string[];
  };
  prompt?: string | null;
  workflow: ComplianceWorkflow;
}
