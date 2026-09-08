import type { CompliancePort } from "./ports";
import type {
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryStatus,
  ComplianceWorkflow,
} from "@pest-patrol/types";
import { ComplianceChunkSearchInput } from "@pest-patrol/domain";

export async function listComplianceSources(port: CompliancePort) {
  return port.listComplianceSourceRecords();
}

export async function listComplianceDocuments(port: CompliancePort) {
  return port.listComplianceDocumentRecords();
}

export async function listComplianceChunks(port: CompliancePort) {
  return port.listComplianceChunkRecords();
}

export async function searchComplianceChunks(
  port: CompliancePort, input: ComplianceChunkSearchInput,
) {
  return port.searchComplianceChunkRecords(input);
}

export async function listComplianceAdvisoryAudits(port: CompliancePort) {
  return port.listComplianceAdvisoryAuditRecords();
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
  port: CompliancePort,
): Promise<ComplianceAdvisoryAudit> {
  return port.createComplianceAdvisoryAuditRecord(input);
}
