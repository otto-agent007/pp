"use client";

import {
  buildJobCloseoutReview,
  listJobChemicalLogs,
  listJobFormSubmissions,
  listJobMedia,
} from "@pest-patrol/domain";
import type { Job } from "@pest-patrol/types";
import { useQuery } from "@tanstack/react-query";

export const closeoutFormsQueryKey = (jobId: string) =>
  ["closeout-forms", jobId] as const;
export const closeoutLogsQueryKey = (jobId: string) =>
  ["closeout-chemical-logs", jobId] as const;
export const closeoutMediaQueryKey = (jobId: string) =>
  ["closeout-media", jobId] as const;

export function useJobCloseoutReview(job: Job | null) {
  const jobId = job?.id ?? "";
  const formsQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutFormsQueryKey(jobId),
    queryFn: () => listJobFormSubmissions(jobId),
  });
  const logsQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutLogsQueryKey(jobId),
    queryFn: () => listJobChemicalLogs(jobId),
  });
  const mediaQuery = useQuery({
    enabled: Boolean(job),
    queryKey: closeoutMediaQueryKey(jobId),
    queryFn: () => listJobMedia(jobId),
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
