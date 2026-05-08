import type { CloseoutCaptureSummary, JobMediaType } from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type CloseoutsClient = typeof supabase | AuthSupabaseClient;

interface JobIdRow {
  job_id: string;
}

interface MediaSummaryRow extends JobIdRow {
  media_type: JobMediaType;
}

function emptySummary(jobId: string): CloseoutCaptureSummary {
  return {
    chemicalLogs: 0,
    forms: 0,
    jobId,
    photos: 0,
    signatures: 0,
  };
}

function incrementSummary(
  summaries: Map<string, CloseoutCaptureSummary>,
  jobId: string,
  field: Exclude<keyof CloseoutCaptureSummary, "jobId">,
) {
  const summary = summaries.get(jobId);

  if (summary) {
    summary[field] += 1;
  }
}

export async function listCloseoutCaptureSummaryRecords(
  jobIds: string[],
  client: CloseoutsClient = supabase,
) {
  const uniqueJobIds = Array.from(new Set(jobIds.filter(Boolean)));

  if (uniqueJobIds.length === 0) {
    return [];
  }

  const summaries = new Map(
    uniqueJobIds.map((jobId) => [jobId, emptySummary(jobId)]),
  );
  const [formsResult, logsResult, mediaResult] = await Promise.all([
    client
      .from("job_form_submissions")
      .select("job_id")
      .in("job_id", uniqueJobIds),
    client.from("chemical_logs").select("job_id").in("job_id", uniqueJobIds),
    client
      .from("job_media")
      .select("job_id, media_type")
      .in("job_id", uniqueJobIds),
  ]);

  if (formsResult.error) {
    throw formsResult.error;
  }

  if (logsResult.error) {
    throw logsResult.error;
  }

  if (mediaResult.error) {
    throw mediaResult.error;
  }

  ((formsResult.data ?? []) as JobIdRow[]).forEach((row) =>
    incrementSummary(summaries, row.job_id, "forms"),
  );
  ((logsResult.data ?? []) as JobIdRow[]).forEach((row) =>
    incrementSummary(summaries, row.job_id, "chemicalLogs"),
  );
  ((mediaResult.data ?? []) as MediaSummaryRow[]).forEach((row) => {
    incrementSummary(
      summaries,
      row.job_id,
      row.media_type === "signature" ? "signatures" : "photos",
    );
  });

  return uniqueJobIds.map((jobId) => summaries.get(jobId) ?? emptySummary(jobId));
}
