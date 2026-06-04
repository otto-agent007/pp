"use client";

import {
  buildComplianceGuardrailForJob,
  buildComplianceReviewItems,
  getComplianceGuardrailSummary,
  getComplianceNeedsReviewSummary,
  getComplianceSchemaUnavailableReadiness,
  type ComplianceGuardrail,
  type ComplianceGuardrailSummary,
  type ComplianceNeedsReviewSummary,
  type ComplianceReviewItem,
  type ComplianceSetupReadiness,
} from "@pest-patrol/domain";
import type {
  ChemicalLog,
  ComplianceAdvisoryAudit,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSource,
  Job,
} from "@pest-patrol/types";
import { useCallback, useMemo } from "react";

import {
  isComplianceSchemaUnavailableError,
  useComplianceAdvisoryAudits,
  useComplianceChunks,
  useComplianceDocuments,
  useComplianceSources,
} from "./useCompliance";
import { useChemicalLogs } from "./useInventory";
import { useJobs } from "./useJobs";

const emptyAudits: ComplianceAdvisoryAudit[] = [];
const emptyChemicalLogs: ChemicalLog[] = [];
const emptyChunks: ComplianceChunk[] = [];
const emptyDocuments: ComplianceDocument[] = [];
const emptyJobs: Job[] = [];
const emptySources: ComplianceSource[] = [];
const emptySummary: ComplianceNeedsReviewSummary = {
  advisoryItems: 0,
  chemicalItems: 0,
  criticalItems: 0,
  openItems: 0,
  sourceItems: 0,
  warningItems: 0,
  wdoItems: 0,
};
const emptyGuardrailSummary: ComplianceGuardrailSummary = {
  clearJobs: 0,
  criticalJobs: 0,
  totalJobs: 0,
  warningJobs: 0,
};
const complianceReviewSetupWarning =
  "Compliance advisory review data is unavailable. Continue the workflow, then review compliance setup from the Compliance page.";

export interface ComplianceReviewItemsHookInput {
  jobs?: Job[];
}

export interface ComplianceReviewItemsHookResult {
  buildGuardrailForJob: (jobId: string) => ComplianceGuardrail;
  guardrailByJobId: (jobIds: string[]) => Map<string, ComplianceGuardrail>;
  guardrailSummaryForJobs: (jobIds: string[]) => ComplianceGuardrailSummary;
  isError: boolean;
  isLoading: boolean;
  items: ComplianceReviewItem[];
  schemaUnavailable: boolean;
  setupReadiness: ComplianceSetupReadiness | null;
  setupWarning: string | null;
  summary: ComplianceNeedsReviewSummary;
}

function hasError(values: unknown[]) {
  return values.some(Boolean);
}

export function useComplianceReviewItems(
  input: ComplianceReviewItemsHookInput = {},
): ComplianceReviewItemsHookResult {
  const jobsQuery = useJobs();
  const chemicalLogsQuery = useChemicalLogs();
  const sourcesQuery = useComplianceSources();
  const documentsQuery = useComplianceDocuments();
  const chunksQuery = useComplianceChunks();
  const auditsQuery = useComplianceAdvisoryAudits();
  const usesProvidedJobs = input.jobs !== undefined;
  const complianceErrors = [
    sourcesQuery.error,
    documentsQuery.error,
    chunksQuery.error,
    auditsQuery.error,
  ];
  const dataErrors = [
    ...complianceErrors,
    chemicalLogsQuery.error,
    usesProvidedJobs ? null : jobsQuery.error,
  ];
  const schemaUnavailable = complianceErrors.some(
    isComplianceSchemaUnavailableError,
  );
  const hasReviewDataError = hasError(dataErrors);
  const setupReadiness = schemaUnavailable
    ? getComplianceSchemaUnavailableReadiness()
    : null;
  const setupWarning =
    schemaUnavailable || hasReviewDataError ? complianceReviewSetupWarning : null;
  const jobs = usesProvidedJobs ? (input.jobs ?? emptyJobs) : (jobsQuery.data ?? emptyJobs);
  const shouldBuildItems = !schemaUnavailable && !hasReviewDataError;
  const items = useMemo(
    () =>
      shouldBuildItems
        ? buildComplianceReviewItems({
            audits: auditsQuery.data ?? emptyAudits,
            chemicalLogs: chemicalLogsQuery.data ?? emptyChemicalLogs,
            chunks: chunksQuery.data ?? emptyChunks,
            documents: documentsQuery.data ?? emptyDocuments,
            jobs,
            sources: sourcesQuery.data ?? emptySources,
          })
        : [],
    [
      auditsQuery.data,
      chemicalLogsQuery.data,
      chunksQuery.data,
      documentsQuery.data,
      jobs,
      shouldBuildItems,
      sourcesQuery.data,
    ],
  );
  const summary = useMemo(
    () =>
      shouldBuildItems ? getComplianceNeedsReviewSummary(items) : emptySummary,
    [items, shouldBuildItems],
  );
  const buildGuardrailForJob = useCallback(
    (jobId: string) => buildComplianceGuardrailForJob({ items, jobId }),
    [items],
  );
  const guardrailByJobId = useCallback(
    (jobIds: string[]) =>
      new Map(
        Array.from(new Set(jobIds)).map((jobId) => [
          jobId,
          buildComplianceGuardrailForJob({ items, jobId }),
        ]),
      ),
    [items],
  );
  const guardrailSummaryForJobs = useCallback(
    (jobIds: string[]) =>
      jobIds.length > 0
        ? getComplianceGuardrailSummary({ items, jobIds })
        : emptyGuardrailSummary,
    [items],
  );

  return {
    buildGuardrailForJob,
    guardrailByJobId,
    guardrailSummaryForJobs,
    isError: hasReviewDataError && !schemaUnavailable,
    isLoading:
      sourcesQuery.isLoading ||
      documentsQuery.isLoading ||
      chunksQuery.isLoading ||
      auditsQuery.isLoading ||
      chemicalLogsQuery.isLoading ||
      (!usesProvidedJobs && jobsQuery.isLoading),
    items,
    schemaUnavailable,
    setupReadiness,
    setupWarning,
    summary,
  };
}
