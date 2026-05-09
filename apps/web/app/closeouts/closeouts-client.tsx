"use client";

import {
  buildBillingQueue,
  filterCloseoutJobs,
  formatMissingCaptureList,
  getBillingQueueCounts,
  getBillingQueueItemSummary,
  getCloseoutCounts,
  getCloseoutReviewReadiness,
  getInvoiceBalanceCents,
  getInvoiceHandoffHref,
  type BillingQueueGroup,
  type BillingQueueItem,
  type CloseoutStatusFilter,
} from "@pest-patrol/domain";
import type {
  FormValue,
  Invoice,
  Job,
  JobFormSubmission,
  JobMedia,
} from "@pest-patrol/types";
import { useMemo, useState } from "react";

import {
  useCloseoutCaptureSummaries,
  useJobCloseoutReview,
} from "../../hooks/useCloseouts";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";

type QueueFilter = "all" | "invoiced" | "needsCaptures" | "ready";
const emptyInvoices: Invoice[] = [];
const emptyJobs: Job[] = [];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not captured";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateMedium(value: string | null | undefined) {
  if (!value) {
    return "unknown date";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(cents / 100);
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

function invoiceStatusLabel(invoice: Invoice) {
  return invoice.status[0].toUpperCase() + invoice.status.slice(1);
}

function getPaidInvoiceDate(invoice: Invoice) {
  const paidAt = invoice.payments
    ?.filter((payment) => payment.status === "succeeded" && payment.paid_at)
    .map((payment) => payment.paid_at as string)
    .sort()
    .at(-1);

  return paidAt ?? invoice.updated_at;
}

function latestQueueItems(queue: BillingQueueGroup, filter: QueueFilter) {
  if (filter === "ready") {
    return { ...queue, invoiced: [], needsCaptures: [] };
  }

  if (filter === "needsCaptures") {
    return { ...queue, invoiced: [], ready: [] };
  }

  if (filter === "invoiced") {
    return { ...queue, needsCaptures: [], ready: [] };
  }

  return queue;
}

function EmptyState({
  children,
  description,
}: {
  children: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
      <p>{children}</p>
      {description ? <p className="mt-2">{description}</p> : null}
    </div>
  );
}

function CountTile({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: number;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary ${
        active ? "border-primary" : "border-gray-200"
      }`}
      onClick={onClick}
      type="button"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-neutralDark">{value}</p>
    </button>
  );
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

function StatusPill({
  tone,
  children,
}: {
  tone: "info" | "neutral" | "success" | "warning";
  children: string;
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-gray-200 bg-gray-50 text-gray-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs font-semibold uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function QueueRow({
  item,
  isSelected,
  onSelect,
}: {
  item: BillingQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pill =
    item.state === "ready" ? (
      <StatusPill tone="success">Ready</StatusPill>
    ) : item.state === "needsCaptures" ? (
      <StatusPill tone="warning">
        {`Needs ${formatMissingCaptureList(item.readiness.missing)}`}
      </StatusPill>
    ) : item.invoice ? (
      <StatusPill tone={item.invoice.status === "paid" ? "success" : "info"}>
        {invoiceStatusLabel(item.invoice)}
      </StatusPill>
    ) : null;

  return (
    <button
      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary ${
        isSelected ? "border-primary" : "border-gray-200"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutralDark">
            {jobTitle(item.job)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {item.job.location?.address ?? "No location saved"}
          </p>
          <p className="mt-2 text-xs font-medium text-gray-500">
            {formatDateTime(item.job.scheduled_start)}
          </p>
          <p className="mt-2 line-clamp-2 text-xs text-gray-500">
            {item.state === "needsCaptures"
              ? getBillingQueueItemSummary(item)
              : item.job.service_notes}
          </p>
        </div>
        {pill}
      </div>
    </button>
  );
}

function QueueSection({
  emptyCopy,
  items,
  onSelect,
  selectedJobId,
  title,
}: {
  emptyCopy: string;
  items: BillingQueueItem[];
  onSelect: (jobId: string) => void;
  selectedJobId: string | null;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutralDark">
          {title}{" "}
          <span className="font-medium text-gray-500">({items.length})</span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          {emptyCopy}
        </p>
      ) : (
        items.map((item) => (
          <QueueRow
            isSelected={selectedJobId === item.job.id}
            item={item}
            key={item.job.id}
            onSelect={() => onSelect(item.job.id)}
          />
        ))
      )}
    </section>
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

function NextActionCard({
  item,
}: {
  item: BillingQueueItem | null;
}) {
  if (!item) {
    return null;
  }

  if (!item.invoice && item.readiness.billingReady) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-neutralDark">Ready to bill</p>
        <p className="mt-1 text-sm text-gray-700">
          Forms, chemicals, photos, and signatures captured.
        </p>
        <a
          className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90"
          href={getInvoiceHandoffHref(item.job.id)}
        >
          Create invoice
        </a>
      </div>
    );
  }

  if (!item.invoice) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-neutralDark">
          {item.readiness.label}
        </p>
        <p className="mt-1 text-sm text-gray-700">{item.readiness.summary}</p>
      </div>
    );
  }

  const invoice = item.invoice;
  const balance = getInvoiceBalanceCents(invoice);
  const titleByStatus = {
    draft: "Invoice in draft",
    paid: "Paid",
    sent: "Invoice sent",
    void: "Voided",
  };
  const bodyByStatus = {
    draft: "Review line items and create a payment link.",
    paid: `${formatMoney(invoice.total_cents, invoice.currency)} received ${formatDateMedium(
      getPaidInvoiceDate(invoice),
    )}.`,
    sent: `Awaiting payment. Balance ${formatMoney(balance, invoice.currency)}.`,
    void: "Invoice was voided. Reissue if needed.",
  };

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-neutralDark">
        {titleByStatus[invoice.status]}
      </p>
      <p className="mt-1 text-sm text-gray-700">{bodyByStatus[invoice.status]}</p>
      <a
        className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90"
        href={
          invoice.status === "sent" && invoice.payment_url
            ? invoice.payment_url
            : `/payments?invoice_id=${encodeURIComponent(invoice.id)}`
        }
        rel={invoice.status === "sent" && invoice.payment_url ? "noreferrer" : undefined}
        target={invoice.status === "sent" && invoice.payment_url ? "_blank" : undefined}
      >
        {invoice.status === "sent" && invoice.payment_url
          ? "Open payment link"
          : "Open invoice"}
      </a>
    </div>
  );
}

export function CloseoutsClient() {
  const jobsQuery = useJobs();
  const invoicesQuery = useInvoices();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CloseoutStatusFilter>("completed");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(() => {
    if (typeof window === "undefined") {
      return "all";
    }

    const filter = new URLSearchParams(window.location.search).get("queue");

    return filter === "ready" || filter === "needsCaptures" || filter === "invoiced"
      ? filter
      : "all";
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const jobs = jobsQuery.data ?? emptyJobs;
  const invoices = invoicesQuery.data ?? emptyInvoices;
  const completedJobIds = useMemo(
    () => jobs.filter((job) => job.status === "completed").map((job) => job.id),
    [jobs],
  );
  const summariesQuery = useCloseoutCaptureSummaries(completedJobIds);
  const visibleJobs = useMemo(
    () => filterCloseoutJobs(jobs, search, status),
    [jobs, search, status],
  );
  const queue = useMemo(
    () =>
      buildBillingQueue(
        visibleJobs,
        invoices,
        summariesQuery.data ?? [],
      ),
    [invoices, summariesQuery.data, visibleJobs],
  );
  const counts = useMemo(() => getBillingQueueCounts(queue), [queue]);
  const filteredQueue = latestQueueItems(queue, queueFilter);
  const queueItems = [
    ...filteredQueue.ready,
    ...filteredQueue.needsCaptures,
    ...filteredQueue.invoiced,
  ];
  const otherJobs = status === "all"
    ? visibleJobs.filter((job) => job.status !== "completed")
    : [];
  const selectedQueueItem =
    queueItems.find((item) => item.job.id === selectedJobId) ?? queueItems[0] ?? null;
  const selectedJob =
    selectedQueueItem?.job ??
    otherJobs.find((job) => job.id === selectedJobId) ??
    otherJobs[0] ??
    null;
  const closeout = useJobCloseoutReview(selectedJob?.status === "completed" ? selectedJob : null);
  const reviewCounts = closeout.review ? getCloseoutCounts(closeout.review) : null;
  const readiness = closeout.review
    ? getCloseoutReviewReadiness(closeout.review)
    : selectedQueueItem?.readiness ?? null;
  const noQueueAction = search.trim()
    ? "Clear the search, show all jobs, or wait for completed jobs to reach the queue."
    : "No completed jobs yet. As technicians finish jobs in dispatch, they will appear here.";
  const isLoading = jobsQuery.isLoading || invoicesQuery.isLoading || summariesQuery.isLoading;
  const hasError = jobsQuery.error || invoicesQuery.error || summariesQuery.error;

  function setFilter(filter: QueueFilter) {
    setQueueFilter(filter);
    setSelectedJobId(null);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      if (filter === "all") {
        params.delete("queue");
      } else {
        params.set("queue", filter);
      }

      const query = params.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">
            Billing work queue
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            Completed jobs grouped by billing readiness. Open one to review captures
            or create an invoice.
          </p>
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
            aria-label="Queue status"
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

      <section className="grid gap-3 sm:grid-cols-4">
        <CountTile
          active={queueFilter === "ready"}
          label="Ready to bill"
          onClick={() => setFilter("ready")}
          value={counts.ready}
        />
        <CountTile
          active={queueFilter === "needsCaptures"}
          label="Needs captures"
          onClick={() => setFilter("needsCaptures")}
          value={counts.needsCaptures}
        />
        <CountTile
          active={queueFilter === "invoiced"}
          label="Invoiced"
          onClick={() => setFilter("invoiced")}
          value={counts.invoiced}
        />
        <CountTile
          active={queueFilter === "all"}
          label="Total completed"
          onClick={() => setFilter("all")}
          value={counts.totalCompleted}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          {isLoading ? (
            <EmptyState>Loading billing work</EmptyState>
          ) : hasError ? (
            <EmptyState description="Retry from the browser or refresh the page.">
              Could not load completed jobs.
            </EmptyState>
          ) : queueItems.length === 0 && otherJobs.length === 0 ? (
            <EmptyState description={noQueueAction}>No billing work found</EmptyState>
          ) : (
            <>
              <QueueSection
                emptyCopy="Nothing ready to bill — check Needs captures."
                items={filteredQueue.ready}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Ready to bill"
              />
              <QueueSection
                emptyCopy="No completed jobs are missing captures."
                items={filteredQueue.needsCaptures}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Needs captures"
              />
              <QueueSection
                emptyCopy="No completed jobs have invoices yet."
                items={filteredQueue.invoiced}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Invoiced"
              />
              {otherJobs.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-neutralDark">
                    Other jobs <span className="font-medium text-gray-500">({otherJobs.length})</span>
                  </h2>
                  {otherJobs.map((job) => (
                    <button
                      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary ${
                        selectedJob?.id === job.id ? "border-primary" : "border-gray-200"
                      }`}
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-neutralDark">
                        {jobTitle(job)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {job.location?.address ?? "No location saved"}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {job.service_notes}
                      </p>
                    </button>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </aside>

        <section className="flex flex-col gap-6">
          {!selectedJob ? (
            <EmptyState>Select a completed job to review its closeout.</EmptyState>
          ) : (
            <>
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <NextActionCard item={selectedQueueItem} />
                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                  {reviewCounts ? (
                    <div className="grid min-w-72 grid-cols-2 gap-3">
                      <ReviewMetric label="Forms" value={reviewCounts.forms} />
                      <ReviewMetric
                        label="Chemicals"
                        value={reviewCounts.chemicalLogs}
                      />
                      <ReviewMetric label="Photos" value={reviewCounts.photos} />
                      <ReviewMetric
                        label="Signatures"
                        value={reviewCounts.signatures}
                      />
                    </div>
                  ) : null}
                </div>
                {selectedJob.service_notes ? (
                  <p className="mt-5 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
                    {selectedJob.service_notes}
                  </p>
                ) : null}
                {readiness && !selectedQueueItem ? (
                  <div
                    className={`mt-5 rounded-md border p-4 ${
                      readiness.billingReady
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-neutralDark">
                      {readiness.label}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {readiness.summary}
                    </p>
                  </div>
                ) : null}
              </section>

              {selectedJob.status !== "completed" ? (
                <EmptyState>Select a completed job to review its closeout.</EmptyState>
              ) : closeout.isLoading ? (
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
