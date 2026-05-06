"use client";

import {
  filterCloseoutJobs,
  getCloseoutCounts,
  type CloseoutStatusFilter,
} from "@pest-patrol/domain";
import type { FormValue, Job, JobFormSubmission, JobMedia } from "@pest-patrol/types";
import { useMemo, useState } from "react";

import { useJobCloseoutReview } from "../../hooks/useCloseouts";
import { useJobs } from "../../hooks/useJobs";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not captured";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatValue(value: FormValue) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (value === null || value === "") {
    return "Not answered";
  }

  return String(value);
}

function jobTitle(job: Job) {
  return job.customer?.name ?? "Unknown customer";
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold text-neutralDark">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
      {children}
    </p>
  );
}

function FormSubmissionCard({ submission }: { submission: JobFormSubmission }) {
  const fields = submission.template?.schema.fields ?? [];

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-neutralDark">
          {submission.template?.name ?? "Treatment form"}
        </h3>
        <p className="text-xs font-medium text-gray-500">
          {formatDateTime(submission.submitted_at)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.length > 0
          ? fields.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {formatValue(submission.form_data[field.id])}
                </dd>
              </div>
            ))
          : Object.entries(submission.form_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {key}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
      </dl>
    </article>
  );
}

function MediaTile({ media }: { media: JobMedia }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3">
      {media.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.description ?? media.media_type}
          className="h-44 w-full rounded-md bg-gray-100 object-cover"
          src={media.signed_url}
        />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-md bg-gray-100 px-4 text-center text-sm text-gray-500">
          Media preview unavailable
        </div>
      )}
      <div className="mt-3">
        <p className="text-sm font-semibold text-neutralDark">
          {media.description ?? media.storage_path}
        </p>
        <p className="mt-1 break-all text-xs text-gray-500">{media.storage_path}</p>
        <p className="mt-1 text-xs text-gray-500">
          Captured {formatDateTime(media.captured_at)}
        </p>
      </div>
    </article>
  );
}

export function CloseoutsClient() {
  const jobsQuery = useJobs();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CloseoutStatusFilter>("completed");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const visibleJobs = useMemo(
    () => filterCloseoutJobs(jobsQuery.data ?? [], search, status),
    [jobsQuery.data, search, status],
  );
  const selectedJob =
    visibleJobs.find((job) => job.id === selectedJobId) ?? visibleJobs[0] ?? null;
  const closeout = useJobCloseoutReview(selectedJob);
  const counts = closeout.review ? getCloseoutCounts(closeout.review) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Job closeouts</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Search closeouts"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Closeout status"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) =>
              setStatus(event.target.value as CloseoutStatusFilter)
            }
            value={status}
          >
            <option value="completed">Completed jobs</option>
            <option value="all">All jobs</option>
          </select>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          {jobsQuery.isLoading ? (
            <EmptyState>Loading closeouts</EmptyState>
          ) : visibleJobs.length === 0 ? (
            <EmptyState>No closeouts found</EmptyState>
          ) : (
            visibleJobs.map((job) => (
              <button
                className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary ${
                  selectedJob?.id === job.id ? "border-primary" : "border-gray-200"
                }`}
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                type="button"
              >
                <p className="text-sm font-semibold text-neutralDark">{jobTitle(job)}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {job.location?.address ?? "No location saved"}
                </p>
                <p className="mt-2 text-xs font-medium text-gray-500">
                  {formatDateTime(job.scheduled_start)}
                </p>
                {job.service_notes ? (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                    {job.service_notes}
                  </p>
                ) : null}
              </button>
            ))
          )}
        </aside>

        <section className="flex flex-col gap-6">
          {!selectedJob ? (
            <EmptyState>Select a completed job to review its closeout.</EmptyState>
          ) : (
            <>
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                      {selectedJob.status}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-neutralDark">
                      {jobTitle(selectedJob)}
                    </h2>
                    <p className="mt-2 text-sm text-gray-700">
                      {selectedJob.location?.address ?? "No location saved"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Scheduled {formatDateTime(selectedJob.scheduled_start)}
                    </p>
                  </div>
                  {counts ? (
                    <div className="grid min-w-72 grid-cols-2 gap-3">
                      <ReviewMetric label="Forms" value={counts.forms} />
                      <ReviewMetric label="Chemicals" value={counts.chemicalLogs} />
                      <ReviewMetric label="Photos" value={counts.photos} />
                      <ReviewMetric label="Signatures" value={counts.signatures} />
                    </div>
                  ) : null}
                </div>
                {selectedJob.service_notes ? (
                  <p className="mt-5 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
                    {selectedJob.service_notes}
                  </p>
                ) : null}
              </section>

              {closeout.isLoading ? (
                <EmptyState>Loading field captures</EmptyState>
              ) : closeout.error ? (
                <EmptyState>Unable to load closeout details</EmptyState>
              ) : closeout.review ? (
                <>
                  <section className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold text-neutralDark">
                      Treatment forms
                    </h2>
                    {closeout.review.form_submissions.length === 0 ? (
                      <EmptyState>No treatment forms captured for this job.</EmptyState>
                    ) : (
                      closeout.review.form_submissions.map((submission) => (
                        <FormSubmissionCard
                          key={submission.id}
                          submission={submission}
                        />
                      ))
                    )}
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold text-neutralDark">
                      Chemical logs
                    </h2>
                    {closeout.review.chemical_logs.length === 0 ? (
                      <EmptyState>No chemical logs captured for this job.</EmptyState>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {closeout.review.chemical_logs.map((log) => (
                          <article
                            className="rounded-lg border border-gray-200 bg-white p-4"
                            key={log.id}
                          >
                            <p className="font-semibold text-neutralDark">
                              {log.chemical?.name ?? "Unknown chemical"}
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              {log.amount_used} {log.chemical?.unit ?? ""}
                            </p>
                            {log.notes ? (
                              <p className="mt-2 text-sm text-gray-600">{log.notes}</p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold text-neutralDark">Photos</h2>
                    {closeout.review.photos.length === 0 ? (
                      <EmptyState>No photos captured for this job.</EmptyState>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {closeout.review.photos.map((media) => (
                          <MediaTile key={media.id} media={media} />
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold text-neutralDark">
                      Signatures
                    </h2>
                    {closeout.review.signatures.length === 0 ? (
                      <EmptyState>No signatures captured for this job.</EmptyState>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {closeout.review.signatures.map((media) => (
                          <MediaTile key={media.id} media={media} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
