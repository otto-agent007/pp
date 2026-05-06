"use client";

import {
  buildDispatchWeek,
  getDispatchWeekStart,
  getRelativeDispatchWeek,
} from "@pest-patrol/domain";
import type { Customer, Job, JobStatus } from "@pest-patrol/types";
import { useMemo, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useAssignJobTechnician,
  useChangeJobStatus,
  useJobs,
  useTechnicians,
} from "../../hooks/useJobs";

type StatusFilter = JobStatus | "all";
type TechnicianFilter = "all" | "unassigned" | string;

const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function technicianLabel(id: string) {
  return `Technician ${id.slice(0, 8)}`;
}

export function DispatchClient() {
  const jobsQuery = useJobs();
  const customersQuery = useCustomers();
  const techniciansQuery = useTechnicians();
  const changeStatus = useChangeJobStatus();
  const assignTechnician = useAssignJobTechnician();
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [technician, setTechnician] = useState<TechnicianFilter>("all");

  const decoratedJobs = useMemo(
    () => (jobsQuery.data ?? []).map((job) => decorateJob(job, customersQuery.data ?? [])),
    [customersQuery.data, jobsQuery.data],
  );
  const weekStart = getDispatchWeekStart(anchorDate);
  const calendarDays = useMemo(
    () => buildDispatchWeek(decoratedJobs, anchorDate, status, technician),
    [anchorDate, decoratedJobs, status, technician],
  );
  const isUpdating = changeStatus.isPending || assignTechnician.isPending;

  function moveWeek(offset: number) {
    setAnchorDate(getRelativeDispatchWeek(anchorDate, offset));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Admin
            </p>
            <h1 className="text-3xl font-bold text-neutralDark">Dispatch Calendar</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => moveWeek(-1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => setAnchorDate(todayKey())}
              type="button"
            >
              Today
            </button>
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => moveWeek(1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Week of
            <input
              aria-label="Week of"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setAnchorDate(event.target.value)}
              type="date"
              value={anchorDate}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Status
            <select
              aria-label="Dispatch status"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              value={status}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Technician
            <select
              aria-label="Dispatch technician"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setTechnician(event.target.value)}
              value={technician}
            >
              <option value="all">All technicians</option>
              <option value="unassigned">Unassigned</option>
              {(techniciansQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {technicianLabel(item.id)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-sm text-gray-600">Week starting {weekStart}</p>
      </header>

      {jobsQuery.isLoading ? (
        <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Loading dispatch calendar
        </p>
      ) : (
        <section className="grid gap-3 lg:grid-cols-7">
          {calendarDays.map((day) => (
            <section
              className="flex min-h-64 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              key={day.date}
            >
              <header className="border-b border-gray-100 pb-2">
                <h2 className="text-sm font-semibold text-neutralDark">{day.label}</h2>
                <p className="text-xs text-gray-500">{day.jobs.length} jobs</p>
              </header>

              {day.jobs.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs scheduled</p>
              ) : (
                day.jobs.map((job) => (
                  <article
                    className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
                    key={job.id}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                        {formatTime(job.scheduled_start)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-neutralDark">
                        {job.customer?.name ?? "Unknown customer"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">
                        {job.location?.address ?? "No location saved"}
                      </p>
                    </div>

                    <label className="flex flex-col gap-1 text-xs font-medium text-neutralDark">
                      Status
                      <select
                        aria-label={`Status for ${job.id}`}
                        className="min-h-9 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-primary"
                        disabled={isUpdating}
                        onChange={(event) =>
                          changeStatus.mutate({
                            job,
                            status: event.target.value as JobStatus,
                          })
                        }
                        value={job.status}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium text-neutralDark">
                      Technician
                      <select
                        aria-label={`Technician for ${job.id}`}
                        className="min-h-9 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-primary"
                        disabled={isUpdating}
                        onChange={(event) =>
                          assignTechnician.mutate({
                            job,
                            technicianId: event.target.value || null,
                          })
                        }
                        value={job.assigned_tech_id ?? ""}
                      >
                        <option value="">Unassigned</option>
                        {(techniciansQuery.data ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {technicianLabel(item.id)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))
              )}
            </section>
          ))}
        </section>
      )}
    </main>
  );
}
