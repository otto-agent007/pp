"use client";

import {
  assignJobTechnician,
  cancelJob,
  changeJobStatus,
  createJob,
  listJobs,
  updateJob,
  validateJobInput,
} from "@pest-patrol/domain";
import type { Job, JobInput, JobStatus } from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignLocalDemoJobTechnician,
  cancelLocalDemoJob,
  createLocalDemoJob,
  getLocalDemoFixtures,
  updateLocalDemoJob,
  updateLocalDemoJobStatus,
} from "./localDemoData";
export { techniciansQueryKey, useTechnicians } from "./useTechnicians";

export const jobsQueryKey = ["jobs"] as const;

function makeOptimisticJob(input: JobInput): Job {
  const now = new Date().toISOString();
  const normalized = validateJobInput(input);

  return {
    id: `optimistic-${crypto.randomUUID()}`,
    customer_id: normalized.customer_id,
    location_id: normalized.location_id,
    assigned_tech_id: normalized.assigned_tech_id ?? null,
    scheduled_start: normalized.scheduled_start,
    scheduled_end: normalized.scheduled_end ?? null,
    status: normalized.status ?? "scheduled",
    service_notes: normalized.service_notes ?? null,
    job_purpose: normalized.job_purpose,
    service_offering_id: normalized.service_offering_id,
    service_family: normalized.service_family,
    billing_disposition: normalized.billing_disposition,
    service_cadence: normalized.service_cadence,
    estimate_status: normalized.estimate_status,
    parent_job_id: normalized.parent_job_id,
    created_at: now,
    updated_at: now,
  };
}

export function useJobs() {
  return useQuery({
    queryKey: jobsQueryKey,
    queryFn: () => getLocalDemoFixtures()?.jobs ?? listJobs(),
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: JobInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoJob(input))
        : createJob(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey) ?? [];

      queryClient.setQueryData<Job[]>(jobsQueryKey, [
        makeOptimisticJob(input),
        ...previous,
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(jobsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: JobInput }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(updateLocalDemoJob(id, input))
        : updateJob(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey) ?? [];
      const optimisticJob = makeOptimisticJob(input);

      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        previous.map((job) =>
          job.id === id
            ? {
                ...job,
                ...optimisticJob,
                id,
                created_at: job.created_at,
              }
            : job,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(jobsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(cancelLocalDemoJob(id))
        : cancelJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey) ?? [];

      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        previous.map((job) =>
          job.id === id
            ? {
                ...job,
                status: "canceled",
              }
            : job,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(jobsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useChangeJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ job, status }: { job: Job; status: JobStatus }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(updateLocalDemoJobStatus(job, status))
        : changeJobStatus(job, status),
    onMutate: async ({ job, status }) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey) ?? [];

      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        previous.map((currentJob) =>
          currentJob.id === job.id
            ? {
                ...currentJob,
                status,
              }
            : currentJob,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(jobsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useAssignJobTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      job,
      technicianId,
    }: {
      job: Job;
      technicianId?: string | null;
    }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(assignLocalDemoJobTechnician(job, technicianId))
        : assignJobTechnician(job, technicianId),
    onMutate: async ({ job, technicianId }) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey) ?? [];

      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        previous.map((currentJob) =>
          currentJob.id === job.id
            ? {
                ...currentJob,
                assigned_tech_id: technicianId || null,
              }
            : currentJob,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(jobsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}
