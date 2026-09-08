"use client";

import {
  listComplianceAdvisoryAudits,
  listComplianceChunks,
  listComplianceDocuments,
  listComplianceSources,
} from "@pest-patrol/application";
import { isComplianceSchemaUnavailableError } from "@pest-patrol/api-client";
import type {
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryRequest,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSetupReadiness,
  ComplianceSource,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../app/admin-auth-context";
import { getLocalDemoFixtures } from "./localDemoData";

export const complianceSourcesQueryKey = ["compliance-sources"] as const;
export const complianceDocumentsQueryKey = ["compliance-documents"] as const;
export const complianceChunksQueryKey = ["compliance-chunks"] as const;
export const complianceAdvisoryAuditsQueryKey = [
  "compliance-advisory-audits",
] as const;
export { isComplianceSchemaUnavailableError };

export interface ComplianceAdvisoryResponse {
  advisory: ComplianceAdvisory;
  runtime: {
    available: boolean;
    provider: "openai";
    reason: string | null;
    requiredEnvName: "OPENAI_API_KEY";
  };
  setup?: ComplianceSetupReadiness;
}

async function requestComplianceAdvisory(
  input: ComplianceAdvisoryRequest,
  accessToken?: string | null,
) {
  const response = await fetch("/api/compliance/advisories", {
    body: JSON.stringify(input),
    headers: {
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };

    throw new Error(body.error ?? "Unable to create compliance advisory");
  }

  return (await response.json()) as ComplianceAdvisoryResponse;
}

export function useComplianceSources() {
  return useQuery<ComplianceSource[]>({
    queryKey: complianceSourcesQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listComplianceSources()),
  });
}

export function useComplianceDocuments() {
  return useQuery<ComplianceDocument[]>({
    queryKey: complianceDocumentsQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listComplianceDocuments()),
  });
}

export function useComplianceChunks() {
  return useQuery<ComplianceChunk[]>({
    queryKey: complianceChunksQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listComplianceChunks()),
  });
}

export function useComplianceAdvisoryAudits() {
  return useQuery<ComplianceAdvisoryAudit[]>({
    queryKey: complianceAdvisoryAuditsQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listComplianceAdvisoryAudits()),
  });
}

export function useCreateComplianceAdvisory() {
  const { session } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ComplianceAdvisoryRequest) =>
      requestComplianceAdvisory(input, session?.access_token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: complianceAdvisoryAuditsQueryKey,
      });
    },
  });
}
