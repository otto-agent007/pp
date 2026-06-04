"use client";

import {
  filterJobs,
  getTechnicianLabel,
  parseJobScheduleWallTime,
  validateJobInput,
} from "@pest-patrol/domain";
import type { Customer, Job, JobInput, JobStatus } from "@pest-patrol/types";
import {
  Button,
  Card,
  Eyebrow,
  SearchableSelect,
  StatTile,
  StatusPill,
  buttonClassName,
  formControlClassName,
  formLabelClassName,
  formTextareaClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useCancelJob,
  useCreateJob,
  useJobs,
  useTechnicians,
  useUpdateJob,
} from "../../hooks/useJobs";
import { adminWorkspaceClassName } from "../admin-workspace";

type JobStatusFilter = JobStatus | "all";
type JobPanelMode = "closed" | "create" | "edit";

const INITIAL_VISIBLE_JOBS = 24;

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

function jobStatusTone(status: JobStatus): StatusPillTone {
  if (status === "completed") {
    return "success";
  }

  if (status === "canceled") {
    return "danger";
  }

  if (status === "en_route" || status === "in_progress") {
    return "warning";
  }

  return "info";
}

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
  const customer =
    job.customer ?? customers.find((item) => item.id === job.customer_id);
  const location =
    job.location ??
    customer?.locations?.find((item) => item.id === job.location_id);

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
  }).format(parseJobScheduleWallTime(value));
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
  const [jobPanelMode, setJobPanelMode] = useState<JobPanelMode>("closed");
  const [visibleJobCount, setVisibleJobCount] = useState(INITIAL_VISIBLE_JOBS);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const activeCustomers = useMemo(
    () =>
      (customersQuery.data ?? []).filter(
        (customer) => customer.status === "active",
      ),
    [customersQuery.data],
  );
  const selectedCustomer = useMemo(
    () => activeCustomers.find((customer) => customer.id === form.customer_id),
    [activeCustomers, form.customer_id],
  );
  const availableLocations = useMemo(
    () =>
      selectedCustomer?.locations?.filter(
        (location) => location.status === "active",
      ) ?? [],
    [selectedCustomer],
  );
  const customerOptions = useMemo(
    () => [
      { label: "Select customer", value: "" },
      ...activeCustomers.map((customer) => ({
        keywords: [
          customer.phone,
          customer.email,
          customer.service_notes,
          ...(customer.locations?.map((location) => location.address) ?? []),
        ].filter((item): item is string => Boolean(item)),
        label: customer.name,
        value: customer.id,
      })),
    ],
    [activeCustomers],
  );
  const locationOptions = useMemo(
    () => [
      { label: "Select location", value: "" },
      ...availableLocations.map((location) => ({
        keywords: [location.nickname, location.service_notes].filter(
          (item): item is string => Boolean(item),
        ),
        label: `${location.nickname ? `${location.nickname}: ` : ""}${location.address}`,
        value: location.id,
      })),
    ],
    [availableLocations],
  );
  const technicianOptions = useMemo(
    () => [
      { label: "Unassigned", value: "" },
      ...(techniciansQuery.data ?? []).map((technician) => ({
        keywords: [technician.email, technician.display_name].filter(
          (item): item is string => Boolean(item),
        ),
        label: getTechnicianLabel(technician),
        value: technician.id,
      })),
    ],
    [techniciansQuery.data],
  );
  const decoratedJobs = useMemo(
    () =>
      (jobsQuery.data ?? []).map((job) =>
        decorateJob(job, customersQuery.data ?? []),
      ),
    [customersQuery.data, jobsQuery.data],
  );
  const jobCounts = useMemo(
    () => ({
      canceled: decoratedJobs.filter((job) => job.status === "canceled").length,
      completed: decoratedJobs.filter((job) => job.status === "completed")
        .length,
      enRoute: decoratedJobs.filter(
        (job) => job.status === "en_route" || job.status === "in_progress",
      ).length,
      scheduled: decoratedJobs.filter((job) => job.status === "scheduled")
        .length,
    }),
    [decoratedJobs],
  );
  const assignmentCounts = useMemo(() => {
    const activeJobs = decoratedJobs.filter((job) => job.status !== "canceled");
    const unassigned = activeJobs.filter((job) => !job.assigned_tech_id).length;

    return {
      assigned: activeJobs.length - unassigned,
      unassigned,
    };
  }, [decoratedJobs]);
  const technicianById = useMemo(
    () =>
      new Map(
        (techniciansQuery.data ?? []).map((technician) => [
          technician.id,
          technician,
        ]),
      ),
    [techniciansQuery.data],
  );
  const visibleJobs = useMemo(
    () => filterJobs(decoratedJobs, search, status, dateFrom, dateTo),
    [dateFrom, dateTo, decoratedJobs, search, status],
  );
  const displayedJobs = visibleJobs.slice(0, visibleJobCount);
  const hiddenJobCount = Math.max(visibleJobs.length - displayedJobs.length, 0);
  const isJobPanelOpen = jobPanelMode !== "closed";
  const isSaving = createJob.isPending || updateJob.isPending;

  useEffect(() => {
    setVisibleJobCount(INITIAL_VISIBLE_JOBS);
  }, [dateFrom, dateTo, search, status]);

  function resetForm() {
    setEditingJob(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function closeJobPanel() {
    resetForm();
    setJobPanelMode("closed");
  }

  function openCreateJob() {
    resetForm();
    setSaveMessage(null);
    setJobPanelMode("create");
  }

  function updateForm(update: Partial<JobInput>) {
    setForm((current) => ({
      ...current,
      ...update,
    }));
  }

  function selectCustomer(customerId: string) {
    const nextCustomer = activeCustomers.find(
      (customer) => customer.id === customerId,
    );
    const nextLocation =
      nextCustomer?.locations?.find(
        (location) => location.status === "active" && location.is_primary,
      ) ??
      nextCustomer?.locations?.find((location) => location.status === "active");

    updateForm({
      customer_id: customerId,
      location_id: nextLocation?.id ?? "",
    });
  }

  function editJob(job: Job) {
    setEditingJob(job);
    setForm(jobToInput(job));
    setFormError(null);
    setSaveMessage(null);
    setJobPanelMode("edit");
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaveMessage(null);

    try {
      const input = validateJobInput(form);
      const nextMessage = editingJob
        ? "Job updated. Review dispatch to confirm assignment and route handoff."
        : "Job created. Review dispatch to confirm assignment and route handoff.";

      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, input });
      } else {
        await createJob.mutateAsync(input);
      }

      setSaveMessage(nextMessage);
      closeJobPanel();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save job",
      );
    }
  }

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="accent">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">Jobs</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr] lg:grid-cols-[minmax(14rem,1fr)_9rem_8rem_8rem_auto]">
          <input
            aria-label="Search jobs"
            className={formControlClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers, addresses, notes…"
            value={search}
          />
          <select
            aria-label="Job status"
            className={formControlClassName}
            onChange={(event) =>
              setStatus(event.target.value as JobStatusFilter)
            }
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
            className={formControlClassName}
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
          <input
            aria-label="Date to"
            className={formControlClassName}
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
          <Button onClick={openCreateJob}>New job</Button>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <Eyebrow tone="accent">Job queue</Eyebrow>
          <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
            Ready for dispatch
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile
            detail="Awaiting assignment or route review"
            label="Scheduled jobs"
            tone="info"
            value={jobCounts.scheduled}
          />
          <StatTile
            detail="Technician is moving through the route"
            label="En route"
            tone="warning"
            value={jobCounts.enRoute}
          />
          <StatTile
            detail="Ready for closeout handoff"
            label="Completed"
            tone="success"
            value={jobCounts.completed}
          />
          <StatTile
            detail="Removed from dispatch"
            label="Canceled"
            tone="danger"
            value={jobCounts.canceled}
          />
        </div>
        <div
          className={`rounded-md border p-3 ${statusSurfaceClassName(
            assignmentCounts.unassigned > 0 ? "warning" : "success",
          )}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-theme-text-primary">
                Assignment handoff
              </p>
              <p className="mt-1 text-sm text-theme-text-secondary">
                {assignmentCounts.unassigned > 0
                  ? "Assign technicians before dispatch route review, or leave a job intentionally unassigned for triage."
                  : "All active jobs have a technician handoff for dispatch review."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                dot={false}
                tone={assignmentCounts.unassigned > 0 ? "warning" : "success"}
              >
                {assignmentCounts.unassigned} unassigned
              </StatusPill>
              <StatusPill dot={false} tone="neutral">
                {assignmentCounts.assigned} assigned
              </StatusPill>
            </div>
          </div>
        </div>
      </section>

      {saveMessage ? (
        <div
          className={`rounded-md border p-3 text-sm text-status-alert-success-fg ${statusSurfaceClassName(
            "success",
          )}`}
          role="status"
        >
          <p>{saveMessage}</p>
          <Link
            className={buttonClassName({
              className:
                "mt-3 border-status-alert-success-border text-status-alert-success-fgStrong hover:bg-status-alert-success-bg",
              variant: "ghost",
            })}
            href="/dispatch"
          >
            Open dispatch review
          </Link>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {jobsQuery.isLoading ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              Loading jobs
            </Card>
          ) : visibleJobs.length === 0 ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              <h2 className="text-lg font-bold text-theme-text-primary">
                No jobs found
              </h2>
              <p className="mt-2">
                Adjust the filters or start a new service visit from the job
                form.
              </p>
              <button
                className={buttonClassName({
                  className: "mt-4",
                  size: "sm",
                  variant: "ghost",
                })}
                onClick={openCreateJob}
                type="button"
              >
                Create first job
              </button>
            </Card>
          ) : (
            <>
              {displayedJobs.map((job) => {
              const assignedTechnician = job.assigned_tech_id
                ? technicianById.get(job.assigned_tech_id)
                : null;
              const assignmentTone: StatusPillTone = job.assigned_tech_id
                ? assignedTechnician
                  ? "success"
                  : "info"
                : "warning";
              const assignmentLabel = job.assigned_tech_id
                ? `Assigned to ${
                    assignedTechnician
                      ? getTechnicianLabel(assignedTechnician)
                      : "technician"
                  }`
                : "Unassigned";
              const assignmentDetail = job.assigned_tech_id
                ? assignedTechnician
                  ? "Dispatch handoff ready"
                  : "Technician details pending"
                : "Needs dispatch assignment";

              return (
                <article key={job.id}>
                  <Card padding="lg">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-theme-text-primary">
                            {job.customer?.name ?? "Unknown customer"}
                          </h2>
                          <StatusPill tone={jobStatusTone(job.status)}>
                            {statusLabels[job.status]}
                          </StatusPill>
                        </div>
                        <p className="mt-2 text-sm text-theme-text-secondary">
                          {formatSchedule(job.scheduled_start)}
                        </p>
                        <p className="mt-1 text-sm text-theme-text-secondary">
                          {job.location?.address ?? "No location saved"}
                        </p>
                        <div
                          className={`mt-3 flex flex-wrap items-center gap-2 rounded-md border p-2 ${statusSurfaceClassName(
                            assignmentTone,
                          )}`}
                        >
                          <StatusPill dot={false} tone={assignmentTone}>
                            {assignmentLabel}
                          </StatusPill>
                          <span className="text-xs font-semibold text-theme-text-secondary">
                            {assignmentDetail}
                          </span>
                        </div>
                        {job.service_notes ? (
                          <p className="mt-3 text-sm text-theme-text-secondary">
                            {job.service_notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => editJob(job)} variant="ghost">
                          Edit
                        </Button>
                        {job.status !== "canceled" ? (
                          <Button
                            disabled={cancelJob.isPending}
                            onClick={() => cancelJob.mutate(job.id)}
                            variant="danger"
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </article>
              );
              })}
              {hiddenJobCount > 0 ? (
                <Button
                  onClick={() =>
                    setVisibleJobCount((count) => count + INITIAL_VISIBLE_JOBS)
                  }
                  variant="ghost"
                >
                  Show 24 more
                </Button>
              ) : null}
            </>
          )}
        </div>

        {isJobPanelOpen ? (
          <form
          className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
          id="job-form"
          onSubmit={submitJob}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-theme-text-primary">
              {editingJob ? "Edit job" : "Create job"}
            </h2>
            <Button onClick={closeJobPanel} variant="ghost">
              Close
            </Button>
            {editingJob ? (
              <Button onClick={openCreateJob} variant="ghost">
                New job
              </Button>
            ) : null}
          </div>

          <details
            className={`group rounded-md border ${statusSurfaceClassName(
              "warning",
            )}`}
            open
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-status-alert-warning-fg outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
              Job setup notes
            </summary>
            <div className="hidden border-t border-status-alert-warning-border p-3 group-open:block">
              <p className="text-sm text-status-alert-warning-fg">
                Select a customer first so the location list only shows that
                customer active service addresses.
              </p>
              <p className="mt-1 text-sm text-status-alert-warning-fg">
                Technician assignment is optional; unassigned jobs can still
                move to dispatch review.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className={buttonClassName({
                    className:
                      "border-status-alert-warning-border text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg",
                    variant: "ghost",
                  })}
                  href="/customers"
                >
                  Add customer
                </Link>
                <Link
                  className={buttonClassName({
                    className:
                      "border-status-alert-warning-border text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg",
                    variant: "ghost",
                  })}
                  href="/dispatch"
                >
                  Review dispatch
                </Link>
              </div>
            </div>
          </details>

          {formError ? (
            <p
              className={`rounded-md border p-3 text-sm text-status-alert-danger-fg ${statusSurfaceClassName(
                "danger",
              )}`}
            >
              {formError}
            </p>
          ) : null}

          <SearchableSelect
            ariaLabel="Customer"
            emptyMessage="No customers found"
            label="Customer"
            onChange={selectCustomer}
            options={customerOptions}
            value={form.customer_id}
          />

          <SearchableSelect
            ariaLabel="Location"
            emptyMessage="No locations found"
            label="Location"
            onChange={(locationId) => updateForm({ location_id: locationId })}
            options={locationOptions}
            value={form.location_id}
          />

          <SearchableSelect
            ariaLabel="Technician"
            emptyMessage="No technicians found"
            label="Technician"
            onChange={(technicianId) =>
              updateForm({ assigned_tech_id: technicianId })
            }
            options={technicianOptions}
            value={form.assigned_tech_id ?? ""}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={formLabelClassName}>
              Start
              <input
                className={formControlClassName}
                onChange={(event) =>
                  updateForm({ scheduled_start: event.target.value })
                }
                type="datetime-local"
                value={form.scheduled_start}
              />
            </label>
            <label className={formLabelClassName}>
              End
              <input
                className={formControlClassName}
                onChange={(event) =>
                  updateForm({ scheduled_end: event.target.value })
                }
                type="datetime-local"
                value={form.scheduled_end ?? ""}
              />
            </label>
          </div>

          <label className={formLabelClassName}>
            Status
            <select
              className={formControlClassName}
              onChange={(event) =>
                updateForm({ status: event.target.value as JobStatus })
              }
              value={form.status ?? "scheduled"}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={formLabelClassName}>
            Service notes
            <textarea
              className={formTextareaClassName}
              onChange={(event) =>
                updateForm({ service_notes: event.target.value })
              }
              value={form.service_notes ?? ""}
            />
          </label>

          <Button disabled={isSaving} type="submit">
            Save job
          </Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
