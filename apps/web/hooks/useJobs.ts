"use client";

import {
  assignJobTechnician,
  cancelJob,
  changeJobStatus,
  createJob,
  listJobs,
  listTechnicians,
  updateJob,
} from "@pest-patrol/domain";
import type { Job, JobInput, JobStatus } from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const jobsQueryKey = ["jobs"] as const;
export const techniciansQueryKey = ["technicians"] as const;

function makeOptimisticJob(input: JobInput): Job {
  const now = new Date().toISOString();

  return {
    id: `optimistic-${crypto.randomUUID()}`,
    customer_id: input.customer_id,
    location_id: input.location_id,
    assigned_tech_id: input.assigned_tech_id ?? null,
    scheduled_start: input.scheduled_start,
    scheduled_end: input.scheduled_end ?? null,
    status: input.status ?? "scheduled",
    service_notes: input.service_notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function useJobs() {
  return useQuery({
    queryKey: jobsQueryKey,
    queryFn: listJobs,
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: techniciansQueryKey,
    queryFn: listTechnicians,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJob,
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
    mutationFn: ({ id, input }: { id: string; input: JobInput }) => updateJob(id, input),
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
    mutationFn: cancelJob,
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
      changeJobStatus(job, status),
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
    mutationFn: ({ job, technicianId }: { job: Job; technicianId?: string | null }) =>
      assignJobTechnician(job, technicianId),
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
