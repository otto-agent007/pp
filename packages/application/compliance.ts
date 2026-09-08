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
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryStatus,
  ComplianceWorkflow,
} from "@pest-patrol/types";
import { ComplianceChunkSearchInput } from "@pest-patrol/domain";

export async function listComplianceSources() {
  return listComplianceSourceRecords();
}

export async function listComplianceDocuments() {
  return listComplianceDocumentRecords();
}

export async function listComplianceChunks() {
  return listComplianceChunkRecords();
}

export async function searchComplianceChunks(
  input: ComplianceChunkSearchInput,
) {
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
