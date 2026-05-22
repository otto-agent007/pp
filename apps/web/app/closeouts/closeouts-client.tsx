"use client";

import {
  buildComplianceAdvisory,
  buildDispatchLocationEvidenceByJob,
  buildBillingPortalNextActions,
  buildBillingQueue,
  filterCloseoutJobs,
  formatMissingCaptureList,
  getAdminCloseoutProofReview,
  getBillingQueueCounts,
  getCloseoutProofHandoffSummary,
  getCloseoutCounts,
  getCloseoutReviewReadiness,
  getCloseoutReviewQueueFilters,
  getInvoiceBalanceCents,
  type BillingQueueGroup,
  type BillingQueueItem,
  type CloseoutReviewQueueFilterId,
  type CloseoutStatusFilter,
  type CloseoutProofHandoffSummary,
} from "@pest-patrol/domain";
import {
  Card,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
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
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";

type QueueFilter =
  | "all"
  | "invoiced"
  | "needsCaptures"
  | "ready"
  | CloseoutReviewQueueFilterId;
const emptyInvoices: Invoice[] = [];
const emptyJobs: Job[] = [];
const fieldClassName =
  "min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-normal text-theme-text-primary outline-none transition focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20";

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

function formatMissingCaptureMicroLine(items: string[]) {
  const lowered = items.map((item) => item.toLowerCase());

  if (lowered.length === 0) {
    return null;
  }

  if (lowered.length <= 3) {
    return `Missing: ${lowered.join(" · ")}`;
  }

  return `Missing: ${lowered.slice(0, 2).join(" · ")} · + ${
    lowered.length - 2
  } more`;
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
  if (filter === "proof_ready") {
    return { ...queue, needsCaptures: [] };
  }

  if (
    filter === "ready" ||
    filter === "gps_review" ||
    filter === "needs_invoice"
  ) {
    return { ...queue, invoiced: [], needsCaptures: [] };
  }

  if (filter === "needsCaptures" || filter === "missing_capture") {
    return { ...queue, invoiced: [], ready: [] };
  }

  if (filter === "invoiced" || filter === "billing_ready") {
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
    <Card
      className="border-dashed border-theme-border-default bg-theme-background-subtle text-sm text-theme-text-secondary shadow-none"
      padding="md"
    >
      <p>{children}</p>
      {description ? <p className="mt-2">{description}</p> : null}
    </Card>
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
      className={`rounded-lg border bg-theme-background-surface p-4 text-left shadow-sm transition hover:border-primary ${
        active ? "border-primary" : "border-theme-border-subtle"
      }`}
      onClick={onClick}
      type="button"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-neutralDark">{value}</p>
    </button>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <StatTile
      label={label}
      tone={value > 0 ? "success" : "neutral"}
      value={value}
    />
  );
}

const proofCardToneClasses: Record<StatusPillTone, string> = {
  danger: "border-status-alert-danger-border bg-status-alert-danger-bg shadow-none",
  info: "border-status-alert-info-border bg-status-alert-info-bg shadow-none",
  neutral: "border-theme-border-subtle bg-theme-background-surface shadow-none",
  success: "border-status-alert-success-border bg-status-alert-success-bg shadow-none",
  warning: "border-status-alert-warning-border bg-status-alert-warning-bg shadow-none",
};

function proofCompletionTone(label: string): StatusPillTone {
  if (label === "Ready") {
    return "success";
  }

  if (label === "Missing evidence") {
    return "danger";
  }

  return "warning";
}

function QueueRowBase({
  children,
  isSelected,
  onSelect,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`rounded-lg border bg-theme-background-surface p-4 text-left shadow-sm transition hover:border-primary ${
        isSelected ? "border-primary" : "border-theme-border-subtle"
      }`}
      onClick={onSelect}
      type="button"
    >
      {children}
    </button>
  );
}

function QueueRowContent({
  job,
  pill,
  summary,
}: {
  job: Job;
  pill?: React.ReactNode;
  summary?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-neutralDark">
          {jobTitle(job)}
        </p>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {job.location?.address ?? "No location saved"}
        </p>
        <p className="mt-2 text-xs font-medium text-theme-text-muted">
          {formatDateTime(job.scheduled_start)}
        </p>
        <p className="mt-2 line-clamp-2 text-xs text-theme-text-muted">
          {summary ?? job.service_notes}
        </p>
      </div>
      {pill}
    </div>
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
    <QueueRowBase isSelected={isSelected} onSelect={onSelect}>
      <QueueRowContent
        job={item.job}
        pill={pill}
        summary={
          item.state === "needsCaptures"
            ? formatMissingCaptureMicroLine(item.readiness.missing)
            : item.job.service_notes
        }
      />
    </QueueRowBase>
  );
}

function OtherJobRow({
  isSelected,
  job,
  onSelect,
}: {
  isSelected: boolean;
  job: Job;
  onSelect: () => void;
}) {
  return (
    <QueueRowBase isSelected={isSelected} onSelect={onSelect}>
      <QueueRowContent job={job} />
    </QueueRowBase>
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
          <span className="font-medium text-theme-text-muted">
            ({items.length})
          </span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-theme-border-subtle bg-theme-background-subtle p-3 text-sm text-theme-text-muted">
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
    <Card padding="md" role="article">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-neutralDark">
          {submission.template?.name ?? "Treatment form"}
        </h3>
        <p className="text-xs font-medium text-theme-text-muted">
          {formatDateTime(submission.submitted_at)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.length > 0
          ? fields.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-theme-text-primary">
                  {formatValue(submission.form_data[field.id])}
                </dd>
              </div>
            ))
          : Object.entries(submission.form_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  {key}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-theme-text-primary">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
      </dl>
    </Card>
  );
}

function MediaTile({ media }: { media: JobMedia }) {
  return (
    <Card padding="sm" role="article">
      {media.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.description ?? media.media_type}
          className="h-44 w-full rounded-md bg-primitive-slate-100 object-cover"
          src={media.signed_url}
        />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-md bg-primitive-slate-100 px-4 text-center text-sm text-theme-text-muted">
          Media preview unavailable
        </div>
      )}
      <div className="mt-3">
        <p className="text-sm font-semibold text-neutralDark">
          {media.description ?? media.storage_path}
        </p>
        <p className="mt-1 break-all text-xs text-theme-text-muted">
          {media.storage_path}
        </p>
        <p className="mt-1 text-xs text-theme-text-muted">
          Captured {formatDateTime(media.captured_at)}
        </p>
      </div>
    </Card>
  );
}

function NextActionCard({ item }: { item: BillingQueueItem | null }) {
  if (!item) {
    return null;
  }

  if (!item.invoice && item.readiness.billingReady) {
    const actions = buildBillingPortalNextActions({ job: item.job });

    return (
      <Card
        className="border-status-alert-success-border bg-status-alert-success-bg shadow-none"
        padding="md"
      >
        <p className="text-sm font-semibold text-neutralDark">Ready to bill</p>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {item.readiness.summary}
        </p>
        <p className="mt-2 text-xs font-medium text-theme-text-muted">
          Invoice will include GPS + form evidence.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <a
              className={buttonClassName({ size: "sm" })}
              href={action.href}
              key={action.id}
            >
              {action.label}
            </a>
          ))}
        </div>
      </Card>
    );
  }

  if (!item.invoice) {
    return (
      <Card
        className="border-status-alert-warning-border bg-status-alert-warning-bg shadow-none"
        padding="md"
      >
        <p className="text-sm font-semibold text-neutralDark">
          {item.readiness.label}
        </p>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {item.readiness.summary}
        </p>
        <p className="mt-2 text-xs font-medium text-theme-text-muted">
          Billing handoff is blocked until captures sync.
        </p>
      </Card>
    );
  }

  const invoice = item.invoice;
  const actions = buildBillingPortalNextActions({
    hasPortalLink: false,
    invoice,
    job: item.job,
  });
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
  const contextCueByStatus = {
    draft: "Review and finalize line items before sharing with the customer.",
    paid: "Job is closed. Archive or move to the next stop.",
    sent: "Awaiting customer payment. No action needed until paid or overdue.",
    void: "Reissue a new invoice if this job needs to be rebilled.",
  };

  return (
    <Card
      className="border-status-alert-info-border bg-status-alert-info-bg shadow-none"
      padding="md"
    >
      <p className="text-sm font-semibold text-neutralDark">
        {titleByStatus[invoice.status]}
      </p>
      <p className="mt-1 text-sm text-theme-text-secondary">
        {bodyByStatus[invoice.status]}
      </p>
      <p className="mt-2 text-xs font-medium text-theme-text-muted">
        {contextCueByStatus[invoice.status]}
      </p>
      <a
        className={buttonClassName({ className: "mt-4", size: "md" })}
        href={
          invoice.status === "sent" && invoice.payment_url
            ? invoice.payment_url
            : `/payments?invoice_id=${encodeURIComponent(invoice.id)}`
        }
        rel={
          invoice.status === "sent" && invoice.payment_url
            ? "noreferrer"
            : undefined
        }
        target={
          invoice.status === "sent" && invoice.payment_url
            ? "_blank"
            : undefined
        }
      >
        {invoice.status === "sent" && invoice.payment_url
          ? "Open payment link"
          : "Open invoice"}
      </a>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {actions
          .filter((action) => action.id !== "review_payment")
          .map((action) => (
            <a
              className={buttonClassName({
                className:
                  "border-status-alert-info-border bg-theme-background-surface text-primary hover:bg-status-alert-info-bg",
                fullWidth: true,
                variant: "ghost",
              })}
              href={action.href}
              key={action.id}
            >
              {action.label}
            </a>
          ))}
      </div>
    </Card>
  );
}

function ProofHandoffCard({
  evidence,
  handoff,
  invoice,
  review,
}: {
  evidence?: ReturnType<typeof buildDispatchLocationEvidenceByJob>[string];
  handoff: CloseoutProofHandoffSummary;
  invoice?: Invoice | null;
  review: ReturnType<typeof getAdminCloseoutProofReview> | null;
}) {
  const arrivalLabel = evidence?.latest_arrival
    ? "Arrival GPS captured"
    : "Arrival GPS missing";
  const departureLabel = evidence?.latest_departure
    ? "Departure GPS captured"
    : "Departure GPS missing";
  const proof = review;
  const completionLabel = proof?.completion_label ?? "Needs review";
  const completionTone = proofCompletionTone(completionLabel);
  const arrivalTone: StatusPillTone = evidence?.latest_arrival
    ? "success"
    : "warning";
  const departureTone: StatusPillTone = evidence?.latest_departure
    ? "success"
    : "warning";
  const gpsLabel = proof?.gps_label ?? handoff.gps_label;
  const gpsTone: StatusPillTone =
    gpsLabel.includes("missing") || gpsLabel.includes("Partial")
      ? "warning"
      : "success";
  const billingTone: StatusPillTone =
    proof?.billing_label === "Billing captures ready" ? "success" : completionTone;
  const invoiceTone: StatusPillTone = invoice
    ? invoice.status === "paid"
      ? "success"
      : "info"
    : "neutral";
  const syncTone: StatusPillTone =
    proof?.sync_confidence_label === "High sync confidence" ? "success" : "warning";
  const locationEvidencePills: Array<{
    countsAsMissingEvidence?: boolean;
    label: string;
    tone: StatusPillTone;
  }> = [
    { label: arrivalLabel, tone: arrivalTone },
    { label: departureLabel, tone: departureTone },
    { label: handoff.gps_label, tone: gpsTone },
  ];
  const billingCapturePills: Array<{
    countsAsMissingEvidence?: boolean;
    label: string;
    tone: StatusPillTone;
  }> = [
    {
      label: proof?.billing_label ?? handoff.proof_label,
      tone: billingTone,
    },
    {
      countsAsMissingEvidence: Boolean(invoice),
      label:
        proof?.invoice_label ??
        (invoice ? `Invoice ${invoice.status}` : "No invoice yet"),
      tone: invoiceTone,
    },
    {
      label: proof?.sync_confidence_label ?? "Review synced field evidence",
      tone: syncTone,
    },
  ];
  const reviewItemCount = [
    ...locationEvidencePills,
    ...billingCapturePills,
  ].filter(
    (pill) =>
      pill.tone !== "success" && pill.countsAsMissingEvidence !== false,
  ).length;
  const proofUnblockCopy =
    completionLabel === "Ready"
      ? invoice
        ? invoice.status === "draft"
          ? "All proof captured. Review invoice draft before sharing."
          : invoice.status === "sent"
            ? "All proof captured. Watch payment status before closing."
            : invoice.status === "paid"
              ? "All proof captured and invoice paid."
              : "All proof captured. Reissue invoice if this job needs rebilling."
        : "All proof captured. Create invoice to close out."
      : completionLabel === "Missing evidence"
        ? `${reviewItemCount} item${reviewItemCount === 1 ? "" : "s"} ${
            reviewItemCount === 1 ? "needs" : "need"
          } review before billing handoff.`
        : "Review evidence before billing handoff.";

  return (
    <Card
      className={proofCardToneClasses[completionTone]}
      padding="md"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-neutralDark">
            Proof handoff readiness
          </p>
          <p className="mt-2 text-sm font-semibold text-neutralDark">
            {handoff.proof_label}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            {handoff.proof_summary}
          </p>
          <p className="mt-2 text-sm font-medium text-theme-text-secondary">
            {proofUnblockCopy}
          </p>
        </div>
        <StatusPill tone={completionTone}>{completionLabel}</StatusPill>
      </div>
      <div className="mt-4 grid gap-3">
        <div>
          <Eyebrow tone="muted">Location evidence</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {locationEvidencePills.map((pill) => (
              <StatusPill dot={false} key={pill.label} tone={pill.tone}>
                {pill.label}
              </StatusPill>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow tone="muted">Billing captures</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {billingCapturePills.map((pill) => (
              <StatusPill dot={false} key={pill.label} tone={pill.tone}>
                {pill.label}
              </StatusPill>
            ))}
          </div>
        </div>
      </div>
      <ul className="mt-3 grid gap-1 text-xs font-medium text-theme-text-secondary sm:grid-cols-2">
        {handoff.gps_items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {handoff.missing_capture_guidance ? (
        <p className="mt-3 text-sm text-theme-text-secondary">
          {handoff.missing_capture_guidance}
        </p>
      ) : null}
      <p className="mt-3 text-sm font-semibold text-neutralDark">
        {handoff.portal_handoff_label}
      </p>
      <p className="mt-3 text-xs font-medium text-theme-text-secondary">
        {handoff.portal_handoff_summary}
      </p>
    </Card>
  );
}

export function CloseoutsClient() {
  const jobsQuery = useJobs();
  const invoicesQuery = useInvoices();
  const geofenceEventsQuery = useJobGeofenceEvents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CloseoutStatusFilter>("completed");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(() => {
    if (typeof window === "undefined") {
      return "all";
    }

    const filter = new URLSearchParams(window.location.search).get("queue");

    return filter === "ready" ||
      filter === "needsCaptures" ||
      filter === "invoiced" ||
      filter === "proof_ready" ||
      filter === "missing_capture" ||
      filter === "gps_review" ||
      filter === "needs_invoice" ||
      filter === "billing_ready"
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
  const locationEvidenceByJob = useMemo(
    () =>
      buildDispatchLocationEvidenceByJob(
        completedJobIds,
        geofenceEventsQuery.data ?? [],
      ),
    [completedJobIds, geofenceEventsQuery.data],
  );
  const visibleJobs = useMemo(
    () => filterCloseoutJobs(jobs, search, status),
    [jobs, search, status],
  );
  const queue = useMemo(
    () => buildBillingQueue(visibleJobs, invoices, summariesQuery.data ?? []),
    [invoices, summariesQuery.data, visibleJobs],
  );
  const counts = useMemo(() => getBillingQueueCounts(queue), [queue]);
  const reviewFilters = useMemo(
    () => getCloseoutReviewQueueFilters(queue),
    [queue],
  );
  const filteredQueue = latestQueueItems(queue, queueFilter);
  const queueItems = [
    ...filteredQueue.ready,
    ...filteredQueue.needsCaptures,
    ...filteredQueue.invoiced,
  ];
  const otherJobs =
    status === "all"
      ? visibleJobs.filter((job) => job.status !== "completed")
      : [];
  const selectedQueueItem =
    queueItems.find((item) => item.job.id === selectedJobId) ??
    queueItems[0] ??
    null;
  const selectedJob =
    selectedQueueItem?.job ??
    otherJobs.find((job) => job.id === selectedJobId) ??
    otherJobs[0] ??
    null;
  const closeout = useJobCloseoutReview(
    selectedJob?.status === "completed" ? selectedJob : null,
  );
  const reviewCounts = closeout.review
    ? getCloseoutCounts(closeout.review)
    : null;
  const readiness = closeout.review
    ? getCloseoutReviewReadiness(closeout.review)
    : (selectedQueueItem?.readiness ?? null);
  const selectedEvidence = selectedJob
    ? locationEvidenceByJob[selectedJob.id]
    : undefined;
  const proofHandoff = readiness
    ? getCloseoutProofHandoffSummary({
        evidence: selectedEvidence,
        readiness,
      })
    : null;
  const adminProofReview = closeout.review
    ? getAdminCloseoutProofReview({
        evidence: selectedEvidence,
        invoice: selectedQueueItem?.invoice ?? null,
        review: closeout.review,
      })
    : null;
  const branchCompliancePreview = useMemo(
    () =>
      buildComplianceAdvisory({
        chunks: [],
        job: selectedJob ?? null,
        workflow: "wdo_branch3",
      }),
    [selectedJob],
  );
  const branchComplianceMissingFieldCount =
    branchCompliancePreview.required_fields.filter(
      (field) => field.status !== "present",
    ).length;
  const branchComplianceNeedsReview =
    branchCompliancePreview.status !== "advisory_ready" ||
    branchComplianceMissingFieldCount > 0;
  const branchComplianceSummary =
    branchComplianceMissingFieldCount > 0
      ? `${branchComplianceMissingFieldCount} WDO report fields need review before source-backed handoff.`
      : branchComplianceNeedsReview
        ? "Source chunks are not ingested yet; keep this as advisory review before billing handoff."
        : "WDO report fields are ready for cited review once source chunks are ingested.";
  const branchComplianceToneClasses = branchComplianceNeedsReview
    ? {
        action:
          "border-status-alert-warning-border text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg",
        eyebrow: "text-status-alert-warning-fg",
        root: "border-status-alert-warning-border bg-status-alert-warning-bg shadow-sm",
        text: "text-status-alert-warning-fgStrong",
      }
    : {
        action:
          "border-status-alert-success-border text-status-alert-success-fgStrong hover:bg-status-alert-success-bg",
        eyebrow: "text-status-alert-success-fg",
        root: "border-status-alert-success-border bg-status-alert-success-bg shadow-sm",
        text: "text-status-alert-success-fgStrong",
      };
  const noQueueAction = search.trim()
    ? "Clear the search, show all jobs, or wait for completed jobs to reach the queue."
    : "No completed jobs yet. As technicians finish jobs in dispatch, they will appear here.";
  const isLoading =
    jobsQuery.isLoading || invoicesQuery.isLoading || summariesQuery.isLoading;
  const hasError =
    jobsQuery.error || invoicesQuery.error || summariesQuery.error;

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
      window.history.pushState(
        null,
        "",
        query ? `?${query}` : window.location.pathname,
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="inverse">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-neutralDark">
            Billing work queue
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-theme-text-secondary">
            Completed jobs grouped by billing readiness. Open one to review
            captures or create an invoice.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Search closeouts"
            className={fieldClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Queue status"
            className={fieldClassName}
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {reviewFilters.map((filter) => (
          <CountTile
            active={queueFilter === filter.id}
            key={filter.id}
            label={filter.label}
            onClick={() => setFilter(filter.id)}
            value={filter.count}
          />
        ))}
        <CountTile
          active={queueFilter === "all"}
          label="Total completed"
          onClick={() => setFilter("all")}
          value={counts.totalCompleted}
        />
      </section>

      <Card
        className={branchComplianceToneClasses.root}
        padding="md"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <Eyebrow className={branchComplianceToneClasses.eyebrow}>
              Closeout compliance audit
            </Eyebrow>
            <p className={`mt-1 text-sm ${branchComplianceToneClasses.text}`}>
              Branch 3 and multi-unit evidence stays advisory in V1.{" "}
              {branchComplianceSummary}
            </p>
          </div>
          <a
            className={buttonClassName({
              className: branchComplianceToneClasses.action,
              variant: "ghost",
            })}
            href="/compliance"
          >
            Open compliance
          </a>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <aside className="flex flex-col gap-4">
          {isLoading ? (
            <EmptyState>Loading billing work</EmptyState>
          ) : hasError ? (
            <EmptyState description="Retry from the browser or refresh the page.">
              Could not load completed jobs.
            </EmptyState>
          ) : queueItems.length === 0 && otherJobs.length === 0 ? (
            <EmptyState description={noQueueAction}>
              No billing work found
            </EmptyState>
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
                    Other jobs{" "}
                    <span className="font-medium text-theme-text-muted">
                      ({otherJobs.length})
                    </span>
                  </h2>
                  {otherJobs.map((job) => (
                    <OtherJobRow
                      isSelected={selectedJob?.id === job.id}
                      key={job.id}
                      job={job}
                      onSelect={() => setSelectedJobId(job.id)}
                    />
                  ))}
                </section>
              ) : null}
            </>
          )}
        </aside>

        <section className="flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          {!selectedJob ? (
            <EmptyState>
              Select a completed job to review its closeout.
            </EmptyState>
          ) : (
            <>
              <section className="flex flex-col gap-4">
                <NextActionCard item={selectedQueueItem} />
                {proofHandoff ? (
                  <ProofHandoffCard
                    evidence={selectedEvidence}
                    handoff={proofHandoff}
                    invoice={selectedQueueItem?.invoice ?? null}
                    review={adminProofReview}
                  />
                ) : null}
                <div className="mt-5 flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                      {selectedJob.status}
                    </p>
                    <h2 className="mt-1 break-words text-2xl font-bold text-neutralDark">
                      {jobTitle(selectedJob)}
                    </h2>
                    <p className="mt-2 text-sm text-theme-text-secondary">
                      {selectedJob.location?.address ?? "No location saved"}
                    </p>
                    <p className="mt-1 text-sm text-theme-text-secondary">
                      Scheduled {formatDateTime(selectedJob.scheduled_start)}
                    </p>
                  </div>
                  {reviewCounts ? (
                    <div className="grid grid-cols-2 gap-3">
                      <ReviewMetric label="Forms" value={reviewCounts.forms} />
                      <ReviewMetric
                        label="Chemicals"
                        value={reviewCounts.chemicalLogs}
                      />
                      <ReviewMetric
                        label="Photos"
                        value={reviewCounts.photos}
                      />
                      <ReviewMetric
                        label="Signatures"
                        value={reviewCounts.signatures}
                      />
                    </div>
                  ) : null}
                </div>
                {selectedJob.service_notes ? (
                  <p className="mt-5 rounded-md bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
                    {selectedJob.service_notes}
                  </p>
                ) : null}
                {readiness && !selectedQueueItem ? (
                  <div
                    className={`mt-5 rounded-md border p-4 ${
                      readiness.billingReady
                        ? "border-status-alert-success-border bg-status-alert-success-bg"
                        : "border-status-alert-warning-border bg-status-alert-warning-bg"
                    }`}
                  >
                    <p className="text-sm font-semibold text-neutralDark">
                      {readiness.label}
                    </p>
                    <p className="mt-1 text-sm text-theme-text-secondary">
                      {readiness.summary}
                    </p>
                  </div>
                ) : null}
              </section>

              {selectedJob.status !== "completed" ? (
                <EmptyState>
                  Select a completed job to review its closeout.
                </EmptyState>
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
                      <EmptyState>
                        No treatment forms captured for this job.
                      </EmptyState>
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
                      <EmptyState>
                        No chemical logs captured for this job.
                      </EmptyState>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {closeout.review.chemical_logs.map((log) => (
                          <article
                            className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4"
                            key={log.id}
                          >
                            <p className="font-semibold text-neutralDark">
                              {log.chemical?.name ?? "Unknown chemical"}
                            </p>
                            <p className="mt-1 text-sm text-theme-text-secondary">
                              {log.amount_used} {log.chemical?.unit ?? ""}
                            </p>
                            {log.notes ? (
                              <p className="mt-2 text-sm text-theme-text-secondary">
                                {log.notes}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold text-neutralDark">
                      Photos
                    </h2>
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
                      <EmptyState>
                        No signatures captured for this job.
                      </EmptyState>
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
