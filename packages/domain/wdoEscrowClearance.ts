import type {
  CloseoutCaptureSummary,
  Invoice,
  Job,
  JobCloseoutReview,
  TechnicianLicense,
} from "@pest-patrol/types";
import type { ComplianceGuardrail } from "./compliance";
import { getInvoiceReconciliation } from "./payments";
import {
  getServiceBillingFamilyLabel,
  inferServiceBillingOfferingFromJob,
} from "./serviceBillingCatalog";
import { getWdoCredentialReview } from "./technicianLicenses";

export type WdoEscrowReadinessStatus =
  | "needs_billing_review"
  | "needs_evidence"
  | "needs_operator_review"
  | "ready_for_draft"
  | "released";

export type WdoEscrowReadinessItemStatus =
  | "future_follow_up"
  | "needs_evidence"
  | "needs_review"
  | "ready";

export interface WdoEscrowReadinessItem {
  detail: string;
  id: string;
  label: string;
  status: WdoEscrowReadinessItemStatus;
}

export interface WdoEscrowClearanceQueueItem {
  complianceGuardrail: ComplianceGuardrail | null;
  customerLabel: string;
  documentHandoffNote: string;
  invoice: Invoice | null;
  invoiceLabel: string;
  job: Job;
  links: {
    closeout: string;
    compliance: string;
    customer: string;
    payments: string;
  };
  locationLabel: string;
  missingEvidenceLabels: string[];
  nextAction: string;
  readinessItems: WdoEscrowReadinessItem[];
  serviceLabel: string;
  status: WdoEscrowReadinessStatus;
  statusLabel: string;
}

export interface WdoEscrowClearanceSummary {
  needsBillingReview: number;
  needsEvidence: number;
  needsOperatorReview: number;
  readyForDraft: number;
  released: number;
  totalWdoJobs: number;
}

export interface WdoEscrowReadinessInput {
  closeoutReview?: JobCloseoutReview | null;
  closeoutSummary?: CloseoutCaptureSummary | null;
  complianceGuardrail?: ComplianceGuardrail | null;
  invoice?: Invoice | null;
  job: Job;
  now?: string;
  technicianLicenses?: TechnicianLicense[];
}

export interface WdoEscrowClearanceQueueInput {
  closeoutReviews?: JobCloseoutReview[];
  closeoutSummaries?: CloseoutCaptureSummary[];
  complianceGuardrails?: Map<string, ComplianceGuardrail>;
  invoices?: Invoice[];
  jobs: Job[];
  now?: string;
  technicianLicenses?: TechnicianLicense[];
}

const humanApprovalCopy =
  "Final release requires authorized human review before any clearance document is released.";
const documentHandoffFutureCopy =
  "Draft clearance document handoff is a future follow-up; final release approval remains required.";
const wdoEscrowSignalPattern =
  /\b(termite|wdo|wood[- ]destroying|branch 3|branch three|drywood|subterranean|fungus|beetle|escrow|clearance|real estate)\b/i;
const findingsPattern =
  /\b(finding|findings|damaged member|damaged members|inaccessible|infestation|evidence|drywood|subterranean|fungus|beetle)\b/i;
const recommendationPattern =
  /\b(recommend|recommendation|recommendations|follow[- ]?up|repair|treatment|clearance|corrective)\b/i;

function normalizeText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function jobText(job: Job) {
  return normalizeText([
    job.service_notes,
    job.customer?.service_notes,
    job.location?.service_notes,
    job.location?.nickname,
  ]);
}

function reviewText(review?: JobCloseoutReview | null) {
  if (!review) {
    return "";
  }

  const formText = review.form_submissions.flatMap((submission) => [
    submission.template?.name,
    ...Object.keys(submission.form_data),
    ...Object.values(submission.form_data).map((value) =>
      value === null ? "" : String(value),
    ),
  ]);
  const mediaText = review.media.flatMap((item) => [
    item.description,
    item.storage_path,
  ]);

  return normalizeText([...formText, ...mediaText]);
}

function captureSummary(input: WdoEscrowReadinessInput): CloseoutCaptureSummary {
  if (input.closeoutReview) {
    return {
      chemicalLogs: input.closeoutReview.chemical_logs.length,
      forms: input.closeoutReview.form_submissions.length,
      jobId: input.job.id,
      photos: input.closeoutReview.photos.length,
      signatures: input.closeoutReview.signatures.length,
    };
  }

  return (
    input.closeoutSummary ?? {
      chemicalLogs: 0,
      forms: 0,
      jobId: input.job.id,
      photos: 0,
      signatures: 0,
    }
  );
}

function latestInvoiceForJob(invoices: Invoice[], jobId: string) {
  return (
    invoices
      .filter((invoice) => invoice.job_id === jobId)
      .sort(
        (left, right) =>
          Date.parse(right.created_at) - Date.parse(left.created_at),
      )[0] ?? null
  );
}

function customerLabel(job: Job) {
  return job.customer?.name ?? "Unknown customer";
}

function locationLabel(job: Job) {
  return job.location?.address ?? "No location saved";
}

function statusLabel(status: WdoEscrowReadinessStatus) {
  const labels: Record<WdoEscrowReadinessStatus, string> = {
    needs_billing_review: "Needs billing review",
    needs_evidence: "Needs evidence",
    needs_operator_review: "Operator review required",
    ready_for_draft: "Ready for draft",
    released: "Released",
  };

  return labels[status];
}

function invoiceReadiness(invoice?: Invoice | null): WdoEscrowReadinessItem {
  if (!invoice) {
    return {
      detail: "No invoice is linked to this WDO / escrow job yet.",
      id: "billing",
      label: "Invoice/payment state",
      status: "needs_review",
    };
  }

  const reconciliation = getInvoiceReconciliation(invoice);
  const ready =
    reconciliation.status === "manual_paid" ||
    reconciliation.status === "reconciled_paid";

  return {
    detail: ready
      ? `${reconciliation.label}; invoice/payment state is ready for draft clearance review.`
      : `${reconciliation.label}; billing review is needed before final document release.`,
    id: "billing",
    label: "Invoice/payment state",
    status: ready ? "ready" : "needs_review",
  };
}

function contactReadiness(job: Job): WdoEscrowReadinessItem {
  const hasContact = Boolean(
    job.customer?.email ||
      job.customer?.phone ||
      job.location?.address ||
      job.location?.nickname,
  );

  return {
    detail: hasContact
      ? "Customer/location contact evidence is available from current records."
      : "Customer, realtor, escrow, or location contact evidence is not available in current records.",
    id: "contact",
    label: "Customer/escrow contact evidence",
    status: hasContact ? "ready" : "needs_evidence",
  };
}

function serviceReadiness(job: Job): WdoEscrowReadinessItem {
  const inference = inferServiceBillingOfferingFromJob(job);

  return {
    detail: isWdoEscrowLikeJob(job)
      ? `${inference.offering.label} matched as ${getServiceBillingFamilyLabel(
          inference.offering.family,
        )}.`
      : "WDO / escrow service signal is not present.",
    id: "service",
    label: "WDO/escrow service signal",
    status: isWdoEscrowLikeJob(job) ? "ready" : "needs_evidence",
  };
}

function credentialReadiness(
  input: WdoEscrowReadinessInput,
): WdoEscrowReadinessItem {
  if (!input.technicianLicenses) {
    return {
      detail: "Branch 3 credential review will use technician credentials when available.",
      id: "branch_3_credential",
      label: "Branch 3 credential readiness",
      status: "future_follow_up",
    };
  }

  const review = getWdoCredentialReview(
    input.job,
    input.technicianLicenses,
    input.now,
  );

  return {
    detail: review.summary,
    id: "branch_3_credential",
    label: "Branch 3 credential readiness",
    status: review.status === "ready" ? "ready" : "needs_review",
  };
}

function complianceReadiness(
  guardrail?: ComplianceGuardrail | null,
): WdoEscrowReadinessItem {
  if (!guardrail || guardrail.status === "clear") {
    return {
      detail: "No linked internal compliance guardrail is blocking draft readiness.",
      id: "compliance",
      label: "Compliance guardrail",
      status: "ready",
    };
  }

  return {
    detail: `${guardrail.label}: ${guardrail.summary}`,
    id: "compliance",
    label: "Compliance guardrail",
    status: guardrail.status === "critical" ? "needs_review" : "ready",
  };
}

export function isWdoEscrowLikeJob(job: Job) {
  const inference = inferServiceBillingOfferingFromJob(job);
  return (
    inference.offering.family === "termite_wdo" &&
    wdoEscrowSignalPattern.test(jobText(job))
  );
}

export function buildWdoEscrowReadinessForJob(
  input: WdoEscrowReadinessInput,
): WdoEscrowClearanceQueueItem {
  const summary = captureSummary(input);
  const evidenceText = `${jobText(input.job)} ${reviewText(
    input.closeoutReview,
  )}`;
  const hasReport = summary.forms > 0;
  const hasFindingsEvidence = findingsPattern.test(evidenceText);
  const hasRecommendationEvidence = recommendationPattern.test(evidenceText);
  const hasPhotos = summary.photos > 0;
  const items: WdoEscrowReadinessItem[] = [
    serviceReadiness(input.job),
    {
      detail: hasReport
        ? "Inspection/report form or draft is captured."
        : "Inspection/report form or draft is missing or unknown.",
      id: "inspection_report",
      label: "Inspection/report form",
      status: hasReport ? "ready" : "needs_evidence",
    },
    {
      detail: hasFindingsEvidence
        ? "Findings, damaged-member, or inaccessible-area evidence is captured in current records."
        : "Findings, damaged-member, or inaccessible-area evidence is missing or unknown.",
      id: "findings",
      label: "Findings/damaged-member evidence",
      status: hasFindingsEvidence ? "ready" : "needs_evidence",
    },
    {
      detail: hasRecommendationEvidence
        ? "Recommendations or follow-up disposition are captured."
        : "Recommendations or follow-up disposition are missing or unknown.",
      id: "recommendations",
      label: "Recommendations/follow-up disposition",
      status: hasRecommendationEvidence ? "ready" : "needs_evidence",
    },
    {
      detail: hasPhotos
        ? "Photo evidence is captured."
        : "Photo evidence is missing or unknown.",
      id: "photos",
      label: "Photos",
      status: hasPhotos ? "ready" : "needs_evidence",
    },
    contactReadiness(input.job),
    complianceReadiness(input.complianceGuardrail),
    credentialReadiness(input),
    invoiceReadiness(input.invoice),
    {
      detail: documentHandoffFutureCopy,
      id: "document_handoff",
      label: "Document handoff",
      status: "future_follow_up",
    },
    {
      detail: humanApprovalCopy,
      id: "final_release",
      label: "Final release approval",
      status: "needs_review",
    },
  ];
  const missingEvidenceLabels = items
    .filter((item) => item.status === "needs_evidence")
    .map((item) => item.label);
  const needsOperatorReview = items.some(
    (item) =>
      item.status === "needs_review" &&
      item.id !== "billing" &&
      item.id !== "final_release",
  );
  const billingItem = items.find((item) => item.id === "billing");
  const status: WdoEscrowReadinessStatus = needsOperatorReview
    ? "needs_operator_review"
    : missingEvidenceLabels.length > 0
      ? "needs_evidence"
      : billingItem?.status !== "ready"
        ? "needs_billing_review"
        : "ready_for_draft";
  const inference = inferServiceBillingOfferingFromJob(input.job);
  const item: WdoEscrowClearanceQueueItem = {
    complianceGuardrail: input.complianceGuardrail ?? null,
    customerLabel: customerLabel(input.job),
    documentHandoffNote: documentHandoffFutureCopy,
    invoice: input.invoice ?? null,
    invoiceLabel: billingItem?.detail ?? "Invoice/payment state unknown.",
    job: input.job,
    links: {
      closeout: `/closeouts?job_id=${encodeURIComponent(input.job.id)}`,
      compliance: "/compliance",
      customer: `/customers?customer_id=${encodeURIComponent(
        input.job.customer_id,
      )}`,
      payments: `/payments?job_id=${encodeURIComponent(input.job.id)}`,
    },
    locationLabel: locationLabel(input.job),
    missingEvidenceLabels,
    nextAction: "",
    readinessItems: items,
    serviceLabel: inference.offering.label,
    status,
    statusLabel: statusLabel(status),
  };

  return {
    ...item,
    nextAction: getWdoEscrowNextAction(item),
  };
}

export function buildWdoEscrowClearanceQueue(
  input: WdoEscrowClearanceQueueInput,
) {
  const summariesByJobId = new Map(
    (input.closeoutSummaries ?? []).map((summary) => [summary.jobId, summary]),
  );
  const reviewsByJobId = new Map(
    (input.closeoutReviews ?? []).map((review) => [review.job.id, review]),
  );

  return input.jobs
    .filter(isWdoEscrowLikeJob)
    .map((job) =>
      buildWdoEscrowReadinessForJob({
        closeoutReview: reviewsByJobId.get(job.id) ?? null,
        closeoutSummary: summariesByJobId.get(job.id) ?? null,
        complianceGuardrail: input.complianceGuardrails?.get(job.id) ?? null,
        invoice: latestInvoiceForJob(input.invoices ?? [], job.id),
        job,
        now: input.now,
        technicianLicenses: input.technicianLicenses,
      }),
    )
    .sort(
      (left, right) =>
        Date.parse(right.job.scheduled_start) -
        Date.parse(left.job.scheduled_start),
    );
}

export function getWdoEscrowClearanceSummary(
  queue: WdoEscrowClearanceQueueItem[],
): WdoEscrowClearanceSummary {
  return queue.reduce(
    (summary, item) => {
      summary.totalWdoJobs += 1;

      if (item.status === "needs_billing_review") {
        summary.needsBillingReview += 1;
      } else if (item.status === "needs_evidence") {
        summary.needsEvidence += 1;
      } else if (item.status === "needs_operator_review") {
        summary.needsOperatorReview += 1;
      } else if (item.status === "ready_for_draft") {
        summary.readyForDraft += 1;
      } else if (item.status === "released") {
        summary.released += 1;
      }

      return summary;
    },
    {
      needsBillingReview: 0,
      needsEvidence: 0,
      needsOperatorReview: 0,
      readyForDraft: 0,
      released: 0,
      totalWdoJobs: 0,
    },
  );
}

export function getWdoEscrowNextAction(item: WdoEscrowClearanceQueueItem) {
  if (item.status === "needs_operator_review") {
    return "Operator review required before draft clearance handoff.";
  }

  if (item.status === "needs_evidence") {
    const missing = item.missingEvidenceLabels.slice(0, 3).join(", ");
    return missing
      ? `Capture or review missing evidence: ${missing}.`
      : "Capture or review missing WDO / escrow evidence.";
  }

  if (item.status === "needs_billing_review") {
    return "Confirm invoice/payment state before final document release.";
  }

  if (item.status === "released") {
    return "Final release approval is recorded.";
  }

  return "Generate draft clearance packet for authorized human review.";
}
