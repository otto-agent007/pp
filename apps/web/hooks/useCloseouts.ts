"use client";

import { buildJobCloseoutReview } from "@pest-patrol/domain";
import {
  listCloseoutCaptureSummaries,
  listJobChemicalLogs,
  listJobFormSubmissions,
  listJobMedia,
} from "@pest-patrol/application";
import type { Job } from "@pest-patrol/types";
import { useQuery } from "@tanstack/react-query";
import { getLocalDemoFixtures } from "./localDemoData";
import {
  createCloseoutsAdapter,
  createFormsAdapter,
  createInventoryAdapter,
  createMediaAdapter,
} from "@pest-patrol/api-client";

import { browserSupabase } from "../lib/supabase-browser";

const closeoutsPort = createCloseoutsAdapter(browserSupabase);
const formsPort = createFormsAdapter(browserSupabase);
const inventoryPort = createInventoryAdapter(browserSupabase);
const mediaPort = createMediaAdapter(browserSupabase);


export const closeoutFormsQueryKey = (jobId: string) =>
  ["closeout-forms", jobId] as const;
export const closeoutLogsQueryKey = (jobId: string) =>
  ["closeout-chemical-logs", jobId] as const;
export const closeoutMediaQueryKey = (jobId: string) =>
  ["closeout-media", jobId] as const;
export const closeoutCaptureSummariesQueryKey = (jobIds: string[]) =>
  ["closeout-capture-summaries", [...jobIds].sort().join("|")] as const;

export function useCloseoutCaptureSummaries(jobIds: string[]) {
  const uniqueJobIds = Array.from(new Set(jobIds.filter(Boolean)));

  return useQuery({
    enabled: uniqueJobIds.length > 0,
    queryKey: closeoutCaptureSummariesQueryKey(uniqueJobIds),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? fixtures.closeoutSummaries.filter((summary) =>
            uniqueJobIds.includes(summary.jobId),
          )
        : listCloseoutCaptureSummaries(closeoutsPort, uniqueJobIds);
    },
  });
}

export function useJobCloseoutReview(job: Job | null) {
  const jobId = job?.id ?? "";
  const formsQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutFormsQueryKey(jobId),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? fixtures.formSubmissions.filter(
            (submission) => submission.job_id === jobId,
          )
        : listJobFormSubmissions(formsPort, jobId);
    },
  });
  const logsQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutLogsQueryKey(jobId),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? fixtures.chemicalLogs.filter((log) => log.job_id === jobId)
        : listJobChemicalLogs(inventoryPort, jobId);
    },
  });
  const mediaQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutMediaQueryKey(jobId),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? fixtures.media.filter((item) => item.job_id === jobId)
        : listJobMedia(mediaPort, jobId);
    },
  });

  return {
    error: formsQuery.error ?? logsQuery.error ?? mediaQuery.error,
    isLoading:
      formsQuery.isLoading || logsQuery.isLoading || mediaQuery.isLoading,
    review: job
      ? buildJobCloseoutReview({
          job,
          formSubmissions: formsQuery.data ?? [],
          chemicalLogs: logsQuery.data ?? [],
          media: mediaQuery.data ?? [],
        })
      : null,
  };
}
