"use client";

import {
  buildDispatchLocationEvidenceByJob,
  buildBillingPortalNextActions,
  buildBillingQueue,
  filterCloseoutJobs,
  formatJobScheduleDateTime,
  getAdminCloseoutProofReview,
  getBillingQueueCounts,
  getClassificationAwareCloseoutGuidance,
  getCloseoutProofHandoffSummary,
  getCloseoutCounts,
  getCloseoutReviewReadiness,
  getCloseoutReviewQueueFilters,
  getInvoiceBalanceCents,
  buildWdoEscrowReadinessForJob,
  buildWorkOrderInputFromEstimate,
  getEstimateConversionGuidance,
  getEstimateConversionSuccessCopy,
  getExistingWorkOrderForEstimate,
  isWdoEscrowLikeJob,
  type CloseoutBillingRule,
  type ComplianceGuardrail,
  type BillingQueueGroup,
  type BillingQueueItem,
  type CloseoutReviewQueueFilterId,
  type CloseoutStatusFilter,
  type CloseoutProofHandoffSummary,
  type WdoEscrowClearanceQueueItem,
} from "@pest-patrol/domain";
import {
  Card,
  CountTile,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  formControlClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import type {
  FormValue,
  Invoice,
  Job,
  JobFormSubmission,
  JobMedia,
  TechnicianLicense,
  EstimateConversionInput,
  EstimateConversionResult,
  JobBillingDisposition,
  ServiceBillingOfferingId,
  TechnicianProfile,
} from "@pest-patrol/types";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  useCloseoutCaptureSummaries,
  useJobCloseoutReview,
} from "../../hooks/useCloseouts";
import { useComplianceReviewItems } from "../../hooks/useComplianceReviewItems";
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import { useConvertEstimateToWorkOrder, useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";
import {
  useTechnicianLicenses,
  useTechnicians,
} from "../../hooks/useTechnicians";
import { adminWorkspaceClassName } from "../admin-workspace";

type QueueFilter =
  | "all"
  | "invoiced"
  | "needsCaptures"
  | "ready"
  | CloseoutReviewQueueFilterId;
const emptyInvoices: Invoice[] = [];
const emptyJobs: Job[] = [];
const emptyTechnicianLicenses: TechnicianLicense[] = [];
const emptyTechnicians: TechnicianProfile[] = [];

const serviceOfferingOptions: Array<{
  label: string;
  value: ServiceBillingOfferingId;
}> = [
  { label: "General pest initial", value: "general_pest_initial" },
  { label: "Rodent exclusion", value: "rodent_exclusion" },
  { label: "Bird exclusion", value: "bird_exclusion" },
  {
    label: "Attic cleanup / sanitation",
    value: "attic_cleanup_sanitation",
  },
  { label: "Termite repair", value: "termite_repair" },
  { label: "WDO / escrow inspection", value: "wdo_escrow_inspection" },
];

const billingDispositionOptions: Array<{
  label: string;
  value: JobBillingDisposition;
}> = [
  { label: "Billable", value: "billable" },
  { label: "Deposit required", value: "deposit_required" },
  { label: "No charge", value: "no_charge" },
];

interface ConversionFormState {
  assigned_tech_id: string;
  billing_disposition: JobBillingDisposition;
  scheduled_end: string;
  scheduled_start: string;
  service_notes: string;
  service_offering_id: ServiceBillingOfferingId;
}

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

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <StatTile
      label={label}
      tone={value > 0 ? "success" : "neutral"}
      value={value}
    />
  );
}

function proofCompletionTone(label: string): StatusPillTone {
  if (label === "Ready") {
    return "success";
  }

  if (label === "Missing evidence") {
    return "danger";
  }

  return "warning";
}

function guardrailTone(status: ComplianceGuardrail["status"]): StatusPillTone {
  if (status === "critical") return "danger";
  if (status === "warning") return "warning";
  return "success";
}

function formatGuardrailSummary(summary: {
  clearJobs: number;
  criticalJobs: number;
  warningJobs: number;
}) {
  return `${summary.clearJobs} clear, ${summary.warningJobs} review recommended, ${summary.criticalJobs} critical review.`;
}

function ComplianceGuardrailBadge({
  guardrail,
}: {
  guardrail?: ComplianceGuardrail | null;
}) {
  if (!guardrail || guardrail.status === "clear") {
    return null;
  }

  return (
    <StatusPill dot={false} tone={guardrailTone(guardrail.status)}>
      {guardrail.label}
    </StatusPill>
  );
}

function ComplianceGuardrailPanel({
  guardrail,
}: {
  guardrail: ComplianceGuardrail;
}) {
  const tone = guardrailTone(guardrail.status);

  return (
    <Card padding="md" statusTone={tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Compliance review</Eyebrow>
          <h3 className="mt-1 text-base font-semibold text-theme-text-primary">
            {guardrail.label}
          </h3>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {guardrail.summary}
          </p>
          <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
            {guardrail.nextStep}
          </p>
        </div>
        <a
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href="/compliance"
        >
          Open compliance
        </a>
      </div>
      {guardrail.items.length > 0 ? (
        <ul className="mt-4 grid gap-2 text-sm text-theme-text-secondary">
          {guardrail.items.slice(0, 3).map((item) => (
            <li
              className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-3"
              key={item.id}
            >
              <p className="font-semibold text-theme-text-primary">
                {item.title}
              </p>
              <p className="mt-1 text-xs">{item.description}</p>
              {item.missingEvidence.length > 0 ? (
                <ul className="mt-2 grid gap-1 text-xs">
                  {item.missingEvidence.slice(0, 3).map((evidence) => (
                    <li key={evidence}>{evidence}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function JobClassificationCloseoutGuidance({
  guidance,
}: {
  guidance: CloseoutBillingRule | null;
}) {
  if (!guidance) {
    return null;
  }

  const tone =
    guidance.severity === "critical"
      ? "danger"
      : guidance.severity === "warning"
        ? "warning"
        : "info";

  return (
    <Card padding="md" statusTone={tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Job type / billing review</Eyebrow>
          <h3 className="mt-1 text-base font-semibold text-theme-text-primary">
            {guidance.label}
          </h3>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {guidance.summary}
          </p>
          {guidance.guidanceItems.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-sm text-theme-text-secondary">
              {guidance.guidanceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <StatusPill dot={false} tone={tone}>
          {guidance.label}
        </StatusPill>
      </div>
    </Card>
  );
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
      className={`rounded-lg border bg-theme-background-surface p-4 text-left shadow-sm transition hover:border-theme-action-primary ${
        isSelected
          ? "border-theme-action-primary"
          : "border-theme-border-subtle"
      }`}
      onClick={onSelect}
      type="button"
    >
      {children}
    </button>
  );
}

function QueueRowContent({
  guardrail,
  job,
  pill,
  summary,
}: {
  guardrail?: ComplianceGuardrail | null;
  job: Job;
  pill?: React.ReactNode;
  summary?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-theme-text-primary">
          {jobTitle(job)}
        </p>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {job.location?.address ?? "No location saved"}
        </p>
        <p className="mt-2 text-xs font-medium text-theme-text-muted">
          {formatJobScheduleDateTime(job.scheduled_start)}
        </p>
        <p className="mt-2 line-clamp-2 text-xs text-theme-text-muted">
          {summary ?? job.service_notes}
        </p>
      </div>
      {pill || guardrail ? (
        <div className="flex shrink-0 flex-col items-end gap-2">
          {pill}
          <ComplianceGuardrailBadge guardrail={guardrail} />
        </div>
      ) : null}
    </div>
  );
}

function QueueRow({
  guardrail,
  item,
  isSelected,
  onSelect,
}: {
  guardrail?: ComplianceGuardrail | null;
  item: BillingQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pill =
    item.state === "ready" ? (
      <StatusPill tone="success">Ready</StatusPill>
    ) : item.state === "needsCaptures" ? (
      <StatusPill tone="warning">Needs captures</StatusPill>
    ) : item.invoice ? (
      <StatusPill tone={item.invoice.status === "paid" ? "success" : "info"}>
        {invoiceStatusLabel(item.invoice)}
      </StatusPill>
    ) : null;

  return (
    <QueueRowBase isSelected={isSelected} onSelect={onSelect}>
      <QueueRowContent
        guardrail={guardrail}
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
  guardrail,
  isSelected,
  job,
  onSelect,
}: {
  guardrail?: ComplianceGuardrail | null;
  isSelected: boolean;
  job: Job;
  onSelect: () => void;
}) {
  return (
    <QueueRowBase isSelected={isSelected} onSelect={onSelect}>
      <QueueRowContent guardrail={guardrail} job={job} />
    </QueueRowBase>
  );
}

function QueueSection({
  defaultOpen,
  emptyCopy,
  guardrailByJobId,
  items,
  onSelect,
  selectedJobId,
  title,
}: {
  defaultOpen?: boolean;
  emptyCopy: string;
  guardrailByJobId: Map<string, ComplianceGuardrail>;
  items: BillingQueueItem[];
  onSelect: (jobId: string) => void;
  selectedJobId: string | null;
  title: string;
}) {
  return (
    <details
      aria-label={`Queue section ${title}`}
      className="rounded-md border border-theme-border-subtle bg-theme-background-surface"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold uppercase tracking-wide text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
        <span>
          {title} ({items.length})
        </span>
      </summary>
      {items.length === 0 ? (
        <p className="border-t border-theme-border-subtle bg-theme-background-subtle p-3 text-sm text-theme-text-muted">
          {emptyCopy}
        </p>
      ) : (
        <div className="grid gap-2 border-t border-theme-border-subtle p-2">
          {items.map((item) => (
            <QueueRow
              guardrail={guardrailByJobId.get(item.job.id)}
              isSelected={selectedJobId === item.job.id}
              item={item}
              key={item.job.id}
              onSelect={() => onSelect(item.job.id)}
            />
          ))}
        </div>
      )}
    </details>
  );
}

function FormSubmissionCard({ submission }: { submission: JobFormSubmission }) {
  const fields = submission.template?.schema.fields ?? [];

  return (
    <Card padding="md" role="article">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-theme-text-primary">
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
        <p className="text-sm font-semibold text-theme-text-primary">
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
      <Card className="shadow-none" padding="md" statusTone="success">
        <Eyebrow>Next action</Eyebrow>
        <p className="text-sm font-semibold text-theme-text-primary">
          Ready to bill
        </p>
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
      <Card className="shadow-none" padding="md" statusTone="warning">
        <Eyebrow>Next action</Eyebrow>
        <p className="text-sm font-semibold text-theme-text-primary">
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
    <Card className="shadow-none" padding="md" statusTone="info">
      <Eyebrow>Next action</Eyebrow>
      <p className="text-sm font-semibold text-theme-text-primary">
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

function buildInitialConversionForm(job: Job): ConversionFormState {
  const defaults = buildWorkOrderInputFromEstimate(job, {
    estimate_job_id: job.id,
    scheduled_start: job.scheduled_start,
  });

  return {
    assigned_tech_id: defaults.assigned_tech_id ?? "",
    billing_disposition: defaults.billing_disposition ?? "billable",
    scheduled_end: "",
    scheduled_start: "",
    service_notes: defaults.service_notes ?? "",
    service_offering_id: defaults.service_offering_id ?? "general_pest_initial",
  };
}

function EstimateConversionCard({
  estimateJob,
  jobs,
  lastResult,
  onConvert,
  technicians,
}: {
  estimateJob: Job;
  jobs: Job[];
  lastResult: EstimateConversionResult | null;
  onConvert: (input: EstimateConversionInput) => Promise<unknown>;
  technicians: TechnicianProfile[];
}) {
  const existingWorkOrder =
    getExistingWorkOrderForEstimate(estimateJob, jobs) ??
    (lastResult?.estimate_job.id === estimateJob.id
      ? lastResult.work_order_job
      : null);
  const guidance = getEstimateConversionGuidance(
    estimateJob,
    existingWorkOrder,
  );
  const [form, setForm] = useState<ConversionFormState>(() =>
    buildInitialConversionForm(estimateJob),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialConversionForm(estimateJob));
    setError(null);
  }, [estimateJob]);

  if (
    guidance.readiness.status === "blocked" &&
    guidance.readiness.reasons.some((reason) =>
      /Only estimate jobs/i.test(reason),
    )
  ) {
    return null;
  }

  async function submitConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await onConvert({
        assigned_tech_id: form.assigned_tech_id || null,
        billing_disposition: form.billing_disposition,
        estimate_job_id: estimateJob.id,
        scheduled_end: form.scheduled_end || null,
        scheduled_start: form.scheduled_start,
        service_notes: form.service_notes || null,
        service_offering_id: form.service_offering_id,
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Could not convert this estimate. Review the job and try again.",
      );
    }
  }

  return (
    <Card className="border-theme-border-default" padding="md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <Eyebrow tone="muted">Estimate conversion</Eyebrow>
            <h2 className="mt-1 text-lg font-semibold text-theme-text-primary">
              {guidance.readiness.title}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {guidance.readiness.summary}
            </p>
          </div>
          <StatusPill
            tone={
              guidance.readiness.status === "ready"
                ? "success"
                : guidance.readiness.status === "already_converted"
                  ? "info"
                  : "warning"
            }
          >
            {guidance.readiness.status === "already_converted"
              ? "Work order created"
              : guidance.readiness.can_convert
                ? "Ready"
                : "Unavailable"}
          </StatusPill>
        </div>

        <ul className="space-y-1 text-sm text-theme-text-secondary">
          {guidance.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {existingWorkOrder ? (
          <div className="rounded-md bg-theme-background-subtle p-3 text-sm text-theme-text-secondary">
            <p className="font-semibold text-theme-text-primary">
              {lastResult?.estimate_job.id === estimateJob.id
                ? getEstimateConversionSuccessCopy(lastResult)
                : "Work order created. Open the linked job to continue scheduling or office review."}
            </p>
            <a
              className={`${buttonClassName({ variant: "ghost" })} mt-3`}
              href={`/jobs?job_id=${existingWorkOrder.id}`}
            >
              Open work order
            </a>
          </div>
        ) : guidance.readiness.can_convert ? (
          <form className="grid gap-3" onSubmit={submitConversion}>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Scheduled start
              <input
                aria-label="Work order scheduled start"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduled_start: event.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={form.scheduled_start}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Scheduled end
              <input
                aria-label="Work order scheduled end"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduled_end: event.target.value,
                  }))
                }
                type="datetime-local"
                value={form.scheduled_end}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Work type
              <select
                aria-label="Work order type"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    service_offering_id: event.target
                      .value as ServiceBillingOfferingId,
                  }))
                }
                value={form.service_offering_id}
              >
                {serviceOfferingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Billing handling
              <select
                aria-label="Work order billing handling"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    billing_disposition: event.target
                      .value as JobBillingDisposition,
                  }))
                }
                value={form.billing_disposition}
              >
                {billingDispositionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Technician
              <select
                aria-label="Work order technician"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assigned_tech_id: event.target.value,
                  }))
                }
                value={form.assigned_tech_id}
              >
                <option value="">Unassigned</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.display_name ?? technician.email ?? technician.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-theme-text-primary">
              Work order notes
              <textarea
                aria-label="Work order notes"
                className={formControlClassName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    service_notes: event.target.value,
                  }))
                }
                rows={4}
                value={form.service_notes}
              />
            </label>
            <p className="rounded-md bg-theme-background-subtle p-3 text-sm text-theme-text-secondary">
              This creates a new job linked to the estimate. It does not create
              an invoice.
            </p>
            {error ? (
              <p
                className={`rounded-md border px-3 py-2 text-sm font-medium ${statusSurfaceClassName(
                  "danger",
                )}`}
              >
                {error}
              </p>
            ) : null}
            <button
              className={buttonClassName({ variant: "primary" })}
              type="submit"
            >
              Convert to work order
            </button>
          </form>
        ) : (
          <div className="rounded-md bg-theme-background-subtle p-3 text-sm text-theme-text-secondary">
            {guidance.readiness.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        )}
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
    proof?.billing_label === "Billing captures ready"
      ? "success"
      : completionTone;
  const invoiceTone: StatusPillTone = invoice
    ? invoice.status === "paid"
      ? "success"
      : "info"
    : "neutral";
  const syncTone: StatusPillTone =
    proof?.sync_confidence_label === "High sync confidence"
      ? "success"
      : "warning";
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
    (pill) => pill.tone !== "success" && pill.countsAsMissingEvidence !== false,
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
    <Card className="shadow-none" padding="md" statusTone={completionTone}>
      <Eyebrow>Proof handoff</Eyebrow>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-theme-text-primary">
            Proof handoff readiness
          </p>
          <p className="mt-2 text-sm font-semibold text-theme-text-primary">
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
      <p className="mt-3 text-sm font-semibold text-theme-text-primary">
        {handoff.portal_handoff_label}
      </p>
      <p className="mt-3 text-xs font-medium text-theme-text-secondary">
        {handoff.portal_handoff_summary}
      </p>
    </Card>
  );
}

function WdoEscrowReadinessCard({
  readiness,
}: {
  readiness: WdoEscrowClearanceQueueItem;
}) {
  const tone: StatusPillTone =
    readiness.status === "ready_for_draft"
      ? "success"
      : readiness.status === "needs_operator_review"
        ? "danger"
        : readiness.status === "needs_billing_review"
          ? "info"
          : "warning";

  return (
    <Card className="shadow-none" padding="md" statusTone={tone}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>WDO / Escrow readiness</Eyebrow>
          <p className="mt-1 text-sm font-semibold text-theme-text-primary">
            {readiness.statusLabel}
          </p>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {readiness.nextAction}
          </p>
          <p className="mt-2 text-xs font-semibold text-theme-text-secondary">
            Final release requires authorized human review.
          </p>
        </div>
        <StatusPill dot={false} tone={tone}>
          {readiness.statusLabel}
        </StatusPill>
      </div>
      {readiness.missingEvidenceLabels.length > 0 ? (
        <p className="mt-3 text-xs font-semibold text-status-alert-warning-fg">
          Needs evidence: {readiness.missingEvidenceLabels.slice(0, 3).join(", ")}
        </p>
      ) : null}
      <a
        className={buttonClassName({
          className: "mt-4",
          size: "sm",
          variant: "ghost",
        })}
        href={`/escrow-re?job_id=${encodeURIComponent(readiness.job.id)}`}
      >
        Open WDO / Escrow readiness
      </a>
    </Card>
  );
}

export function CloseoutsClient() {
  const jobsQuery = useJobs();
  const convertEstimate = useConvertEstimateToWorkOrder();
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
  const technicianLicensesQuery = useTechnicianLicenses();
  const techniciansQuery = useTechnicians();
  const technicianLicenses =
    technicianLicensesQuery.data ?? emptyTechnicianLicenses;
  const technicians = techniciansQuery.data ?? emptyTechnicians;
  const [lastConversionResult, setLastConversionResult] =
    useState<EstimateConversionResult | null>(null);
  const complianceReview = useComplianceReviewItems({ jobs });
  const completedJobIds = useMemo(
    () => jobs.filter((job) => job.status === "completed").map((job) => job.id),
    [jobs],
  );
  const guardrailByJobId = complianceReview.guardrailByJobId(completedJobIds);
  const complianceGuardrailSummary =
    complianceReview.guardrailSummaryForJobs(completedJobIds);
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
  const selectedGuardrail = selectedJob
    ? (guardrailByJobId.get(selectedJob.id) ??
      complianceReview.buildGuardrailForJob(selectedJob.id))
    : null;
  const selectedWdoEscrowReadiness =
    selectedJob && isWdoEscrowLikeJob(selectedJob)
    ? buildWdoEscrowReadinessForJob({
        closeoutReview: closeout.review ?? null,
        closeoutSummary: selectedQueueItem?.summary ?? null,
        complianceGuardrail: selectedGuardrail,
        invoice: selectedQueueItem?.invoice ?? null,
        job: selectedJob,
        technicianLicenses,
      })
    : null;
  const selectedClassificationGuidance = selectedJob
    ? getClassificationAwareCloseoutGuidance(selectedJob)
    : null;
  const complianceSummaryTone: StatusPillTone =
    complianceGuardrailSummary.criticalJobs > 0
      ? "danger"
      : complianceGuardrailSummary.warningJobs > 0
        ? "warning"
        : "success";
  const noQueueAction = search.trim()
    ? "Clear the search, show all jobs, or wait for completed jobs to reach the queue."
    : "No completed jobs yet. As technicians finish jobs in dispatch, they will appear here.";
  const isLoading =
    jobsQuery.isLoading || invoicesQuery.isLoading || summariesQuery.isLoading;
  const hasError =
    jobsQuery.error || invoicesQuery.error || summariesQuery.error;
  const showComplianceBanner =
    complianceGuardrailSummary.warningJobs > 0 ||
    complianceGuardrailSummary.criticalJobs > 0;
  const readyQueueOpen =
    filteredQueue.ready.length > 0 &&
    (queueFilter === "all" ||
      queueFilter === "ready" ||
      queueFilter === "proof_ready" ||
      queueFilter === "gps_review" ||
      queueFilter === "needs_invoice" ||
      queueFilter === "billing_ready");
  const needsCapturesQueueOpen =
    filteredQueue.needsCaptures.length > 0 &&
    (queueFilter === "needsCaptures" || queueFilter === "missing_capture");
  const invoicedQueueOpen =
    filteredQueue.invoiced.length > 0 &&
    (queueFilter === "invoiced" || queueFilter === "billing_ready");

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

  async function convertSelectedEstimate(input: EstimateConversionInput) {
    const result = await convertEstimate.mutateAsync(input);

    setLastConversionResult(result);
  }

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="inverse">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            Closeouts
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-theme-text-secondary">
            Completed jobs grouped by closeout readiness. Open one to review
            captures or create an invoice.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Search closeouts"
            className={formControlClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Queue status"
            className={formControlClassName}
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
            count={filter.count}
            key={filter.id}
            label={filter.label}
            onClick={() => setFilter(filter.id)}
          />
        ))}
        <CountTile
          active={queueFilter === "all"}
          count={counts.totalCompleted}
          label="Total completed"
          onClick={() => setFilter("all")}
        />
      </section>

      {showComplianceBanner ? (
        <section
          className={`rounded-md border px-4 py-3 ${statusSurfaceClassName(
            complianceSummaryTone,
          )}`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <Eyebrow>Compliance advisory</Eyebrow>
              <p className="mt-1 text-sm font-semibold text-theme-text-primary">
                {formatGuardrailSummary(complianceGuardrailSummary)}
              </p>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Advisory review items stay internal for completed-job closeout
                and billing handoff.
              </p>
            </div>
            <a
              className={buttonClassName({
                variant: "ghost",
              })}
              href="/compliance"
            >
              Open compliance
            </a>
          </div>
        </section>
      ) : null}

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
                defaultOpen={readyQueueOpen}
                emptyCopy="Nothing ready to bill — check Needs captures."
                guardrailByJobId={guardrailByJobId}
                items={filteredQueue.ready}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Ready to bill"
              />
              <QueueSection
                emptyCopy="No completed jobs are missing captures."
                defaultOpen={needsCapturesQueueOpen}
                guardrailByJobId={guardrailByJobId}
                items={filteredQueue.needsCaptures}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Needs captures"
              />
              <QueueSection
                emptyCopy="No completed jobs have invoices yet."
                defaultOpen={invoicedQueueOpen}
                guardrailByJobId={guardrailByJobId}
                items={filteredQueue.invoiced}
                onSelect={setSelectedJobId}
                selectedJobId={selectedJob?.id ?? null}
                title="Invoiced"
              />
              {otherJobs.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-theme-text-primary">
                    Other jobs{" "}
                    <span className="font-medium text-theme-text-muted">
                      ({otherJobs.length})
                    </span>
                  </h2>
                  {otherJobs.map((job) => (
                    <OtherJobRow
                      guardrail={guardrailByJobId.get(job.id)}
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
                {selectedWdoEscrowReadiness ? (
                  <WdoEscrowReadinessCard
                    readiness={selectedWdoEscrowReadiness}
                  />
                ) : null}
                {selectedClassificationGuidance ? (
                  <JobClassificationCloseoutGuidance
                    guidance={selectedClassificationGuidance}
                  />
                ) : null}
                <EstimateConversionCard
                  estimateJob={selectedJob}
                  jobs={jobs}
                  lastResult={lastConversionResult}
                  onConvert={convertSelectedEstimate}
                  technicians={technicians}
                />
                {selectedGuardrail ? (
                  <ComplianceGuardrailPanel guardrail={selectedGuardrail} />
                ) : null}
                <div className="mt-5 flex flex-col gap-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-theme-text-primary">
                    Job details
                  </h2>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
                      {selectedJob.status}
                    </p>
                    <h2 className="mt-1 break-words text-2xl font-bold text-theme-text-primary">
                      {jobTitle(selectedJob)}
                    </h2>
                    <p className="mt-2 text-sm text-theme-text-secondary">
                      {selectedJob.location?.address ?? "No location saved"}
                    </p>
                    <p className="mt-1 text-sm text-theme-text-secondary">
                      Scheduled{" "}
                      {formatJobScheduleDateTime(selectedJob.scheduled_start)}
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
                    className={`mt-5 rounded-md border p-4 ${statusSurfaceClassName(
                      readiness.billingReady ? "success" : "warning",
                    )}`}
                  >
                    <p className="text-sm font-semibold text-theme-text-primary">
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
                    <h2 className="text-xl font-semibold text-theme-text-primary">
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
                    <h2 className="text-xl font-semibold text-theme-text-primary">
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
                            <p className="font-semibold text-theme-text-primary">
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
                    <h2 className="text-xl font-semibold text-theme-text-primary">
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
                    <h2 className="text-xl font-semibold text-theme-text-primary">
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
