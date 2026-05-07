"use client";

import {
  filterJobs,
  getTechnicianLabel,
  validateJobInput,
} from "@pest-patrol/domain";
import type { Customer, Job, JobInput, JobStatus } from "@pest-patrol/types";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useCancelJob,
  useCreateJob,
  useJobs,
  useTechnicians,
  useUpdateJob,
} from "../../hooks/useJobs";

type JobStatusFilter = JobStatus | "all";

const emptyForm: JobInput = {
  customer_id: "",
  location_id: "",
  assigned_tech_id: "",
  scheduled_start: "",
  scheduled_end: "",
  status: "scheduled",
  service_notes: "",
};

const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function jobToInput(job: Job): JobInput {
  return {
    customer_id: job.customer_id,
    location_id: job.location_id,
    assigned_tech_id: job.assigned_tech_id ?? "",
    scheduled_start: toDateTimeInput(job.scheduled_start),
    scheduled_end: toDateTimeInput(job.scheduled_end),
    status: job.status,
    service_notes: job.service_notes ?? "",
  };
}

function decorateJob(job: Job, customers: Customer[]) {
  const customer = job.customer ?? customers.find((item) => item.id === job.customer_id);
  const location =
    job.location ?? customer?.locations?.find((item) => item.id === job.location_id);

  return {
    ...job,
    customer,
    location,
  };
}

function formatSchedule(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function JobsClient() {
  const jobsQuery = useJobs();
  const customersQuery = useCustomers();
  const techniciansQuery = useTechnicians();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const cancelJob = useCancelJob();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCustomers = useMemo(
    () => (customersQuery.data ?? []).filter((customer) => customer.status === "active"),
    [customersQuery.data],
  );
  const selectedCustomer = activeCustomers.find((customer) => customer.id === form.customer_id);
  const availableLocations =
    selectedCustomer?.locations?.filter((location) => location.status === "active") ?? [];
  const decoratedJobs = useMemo(
    () => (jobsQuery.data ?? []).map((job) => decorateJob(job, customersQuery.data ?? [])),
    [customersQuery.data, jobsQuery.data],
  );
  const visibleJobs = useMemo(
    () => filterJobs(decoratedJobs, search, status, dateFrom, dateTo),
    [dateFrom, dateTo, decoratedJobs, search, status],
  );
  const isSaving = createJob.isPending || updateJob.isPending;

  function resetForm() {
    setEditingJob(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateForm(update: Partial<JobInput>) {
    setForm((current) => ({
      ...current,
      ...update,
    }));
  }

  function selectCustomer(customerId: string) {
    const nextCustomer = activeCustomers.find((customer) => customer.id === customerId);
    const nextLocation = nextCustomer?.locations?.find(
      (location) => location.status === "active" && location.is_primary,
    ) ?? nextCustomer?.locations?.find((location) => location.status === "active");

    updateForm({
      customer_id: customerId,
      location_id: nextLocation?.id ?? "",
    });
  }

  function editJob(job: Job) {
    setEditingJob(job);
    setForm(jobToInput(job));
    setFormError(null);
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      const input = validateJobInput(form);

      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, input });
      } else {
        await createJob.mutateAsync(input);
      }

      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save job");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Jobs</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            aria-label="Search jobs"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Job status"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setStatus(event.target.value as JobStatusFilter)}
            value={status}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Date from"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
          <input
            aria-label="Date to"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {jobsQuery.isLoading ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              Loading jobs
            </p>
          ) : visibleJobs.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              No jobs found
            </p>
          ) : (
            visibleJobs.map((job) => (
              <article
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                key={job.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-neutralDark">
                        {job.customer?.name ?? "Unknown customer"}
                      </h2>
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {statusLabels[job.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {formatSchedule(job.scheduled_start)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {job.location?.address ?? "No location saved"}
                    </p>
                    {job.service_notes ? (
                      <p className="mt-3 text-sm text-gray-700">{job.service_notes}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                      onClick={() => editJob(job)}
                      type="button"
                    >
                      Edit
                    </button>
                    {job.status !== "canceled" ? (
                      <button
                        className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                        disabled={cancelJob.isPending}
                        onClick={() => cancelJob.mutate(job.id)}
                        type="button"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <form
          className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={submitJob}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-neutralDark">
              {editingJob ? "Edit job" : "Create job"}
            </h2>
            {editingJob ? (
              <button
                className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                onClick={resetForm}
                type="button"
              >
                New
              </button>
            ) : null}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800">
              Job scheduling demo tip
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Pick the customer, confirm the active location, then review the
              dispatch board.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-10 items-center rounded-md border border-amber-300 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                href="/customers"
              >
                Add customer
              </Link>
              <Link
                className="inline-flex min-h-10 items-center rounded-md border border-amber-300 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                href="/dispatch"
              >
                Review dispatch
              </Link>
            </div>
          </div>

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Customer
            <select
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => selectCustomer(event.target.value)}
              value={form.customer_id}
            >
              <option value="">Select customer</option>
              {activeCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Location
            <select
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ location_id: event.target.value })}
              value={form.location_id}
            >
              <option value="">Select location</option>
              {availableLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.nickname ? `${location.nickname}: ` : ""}
                  {location.address}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Technician
            <select
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ assigned_tech_id: event.target.value })}
              value={form.assigned_tech_id ?? ""}
            >
              <option value="">Unassigned</option>
              {(techniciansQuery.data ?? []).map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {getTechnicianLabel(technician)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Start
              <input
                className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                onChange={(event) => updateForm({ scheduled_start: event.target.value })}
                type="datetime-local"
                value={form.scheduled_start}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              End
              <input
                className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                onChange={(event) => updateForm({ scheduled_end: event.target.value })}
                type="datetime-local"
                value={form.scheduled_end ?? ""}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Status
            <select
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ status: event.target.value as JobStatus })}
              value={form.status ?? "scheduled"}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Service notes
            <textarea
              className="min-h-28 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) => updateForm({ service_notes: event.target.value })}
              value={form.service_notes ?? ""}
            />
          </label>

          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            Save job
          </button>
        </form>
      </section>
    </main>
  );
}
