import type {
  Job,
  JobBillingDisposition,
  JobClassification,
  JobEstimateStatus,
  JobInput,
  JobPurpose,
  JobServiceCadence,
  ServiceBillingFamily,
  ServiceBillingOffering,
  ServiceBillingOfferingId,
} from "@pest-patrol/types";

import {
  getServiceBillingOffering,
  inferServiceBillingOfferingFromJob,
} from "./serviceBillingCatalog";

export type JobClassificationBadgeTone =
  | "danger"
  | "info"
  | "neutral"
  | "success"
  | "warning";

export interface JobClassificationBadge {
  label: string;
  prominent: boolean;
  tone: JobClassificationBadgeTone;
}

export interface JobClassificationGuidance {
  items: string[];
  label: string;
  summary: string;
  tone: JobClassificationBadgeTone;
}

const jobPurposes: JobPurpose[] = [
  "estimate",
  "service",
  "inspection",
  "follow_up",
  "callback",
  "warranty",
  "project_phase",
];
const billingDispositions: JobBillingDisposition[] = [
  "billable",
  "estimate_only",
  "included_in_recurring",
  "no_charge",
  "warranty_callback",
  "deposit_required",
];
const serviceCadences: JobServiceCadence[] = [
  "none",
  "one_time",
  "monthly",
  "bimonthly",
  "quarterly",
  "annual",
  "project",
];
const estimateStatuses: JobEstimateStatus[] = [
  "not_applicable",
  "draft",
  "presented",
  "accepted",
  "declined",
  "needs_follow_up",
];
const serviceFamilyValues: ServiceBillingFamily[] = [
  "general_pest",
  "recurring_general_pest",
  "termite_wdo",
  "rodent_attic",
  "bed_bug",
  "commercial",
  "hoa_property_management",
  "bird_gopher",
  "green_diy",
  "other",
];

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function getOffering(id?: ServiceBillingOfferingId | null) {
  if (!id) {
    return null;
  }

  try {
    return getServiceBillingOffering(id);
  } catch {
    return null;
  }
}

export function getDefaultJobClassification(): JobClassification {
  return {
    billing_disposition: "billable",
    estimate_status: "not_applicable",
    job_purpose: "service",
    parent_job_id: null,
    service_cadence: "one_time",
    service_family: null,
    service_offering_id: null,
  };
}

export function inferJobClassificationFromServiceOffering(
  offeringId?: ServiceBillingOfferingId | null,
): JobClassification {
  const base = getDefaultJobClassification();
  const offering = getOffering(offeringId);

  if (!offering) {
    return base;
  }

  return {
    ...base,
    billing_disposition: offering.defaultBillingDisposition ?? base.billing_disposition,
    job_purpose: offering.defaultJobPurpose ?? base.job_purpose,
    service_cadence: offering.defaultServiceCadence ?? base.service_cadence,
    service_family: offering.family,
    service_offering_id: offering.id,
  };
}

function fallbackOfferingForJob(job: Partial<Job>) {
  if (!("id" in job) || !job.id) {
    return null;
  }

  try {
    return inferServiceBillingOfferingFromJob(job as Job).offering;
  } catch {
    return null;
  }
}

export function normalizeJobClassification(
  jobOrInput: Partial<Job | JobInput>,
): JobClassification {
  const explicitOffering = getOffering(jobOrInput.service_offering_id);
  const fallbackOffering = explicitOffering ?? fallbackOfferingForJob(jobOrInput);
  const inferred = fallbackOffering
    ? inferJobClassificationFromServiceOffering(fallbackOffering.id)
    : getDefaultJobClassification();
  const jobPurpose = isOneOf(jobOrInput.job_purpose, jobPurposes)
    ? jobOrInput.job_purpose
    : inferred.job_purpose;
  const billingDisposition = isOneOf(
    jobOrInput.billing_disposition,
    billingDispositions,
  )
    ? jobOrInput.billing_disposition
    : jobPurpose === "estimate"
      ? "estimate_only"
      : jobPurpose === "warranty" || jobPurpose === "callback"
        ? "warranty_callback"
        : inferred.billing_disposition;
  const estimateStatus = isOneOf(jobOrInput.estimate_status, estimateStatuses)
    ? jobOrInput.estimate_status
    : jobPurpose === "estimate"
      ? "draft"
      : inferred.estimate_status;
  const serviceCadence = isOneOf(jobOrInput.service_cadence, serviceCadences)
    ? jobOrInput.service_cadence
    : inferred.service_cadence;

  return {
    billing_disposition: billingDisposition,
    estimate_status: estimateStatus,
    job_purpose: jobPurpose,
    parent_job_id: normalizeOptional(jobOrInput.parent_job_id),
    service_cadence: serviceCadence,
    service_family: isOneOf(jobOrInput.service_family, serviceFamilyValues)
      ? jobOrInput.service_family
      : inferred.service_family,
    service_offering_id: explicitOffering?.id ?? inferred.service_offering_id,
  };
}

export function inferJobClassificationFromJob(job: Job): JobClassification {
  return normalizeJobClassification(job);
}

export function applyJobClassificationToInput(input: JobInput): JobInput {
  const classification = normalizeJobClassification(input);

  return {
    ...input,
    ...classification,
  };
}

function offeringForClassification(
  classification: JobClassification,
): ServiceBillingOffering | null {
  return getOffering(classification.service_offering_id);
}

export function getJobClassificationLabel(
  classification: JobClassification,
): string {
  const offering = offeringForClassification(classification);

  if (classification.job_purpose === "estimate") return "Estimate";
  if (classification.job_purpose === "warranty") return "Warranty";
  if (classification.job_purpose === "callback") return "Callback";
  if (classification.job_purpose === "follow_up") return "Follow-up";
  if (classification.service_family === "termite_wdo") return "WDO / Escrow";
  if (
    classification.service_offering_id === "rodent_exclusion" ||
    classification.service_offering_id === "bird_exclusion"
  ) {
    return "Exclusion";
  }
  if (classification.service_cadence === "project") return "Project Work";
  if (classification.service_cadence !== "one_time") return "Recurring Service";
  if (classification.job_purpose === "inspection") return "Inspection";

  return offering?.techBadgeLabel ?? "General Pest";
}

export function getJobClassificationBadge(
  classification: JobClassification,
): JobClassificationBadge {
  const label = getJobClassificationLabel(classification);

  if (classification.job_purpose === "estimate") {
    return { label, prominent: true, tone: "warning" };
  }
  if (classification.service_family === "termite_wdo") {
    return { label, prominent: true, tone: "info" };
  }
  if (isExclusionClassification(classification)) {
    return { label, prominent: true, tone: "warning" };
  }
  if (
    classification.job_purpose === "warranty" ||
    classification.job_purpose === "callback"
  ) {
    return { label, prominent: true, tone: "danger" };
  }
  if (classification.job_purpose === "follow_up") {
    return { label, prominent: true, tone: "neutral" };
  }
  if (classification.service_cadence !== "one_time") {
    return { label: "Recurring", prominent: false, tone: "success" };
  }

  return { label, prominent: false, tone: "neutral" };
}

export function getJobClassificationTechSummary(
  classification: JobClassification,
): string {
  const label = getJobClassificationLabel(classification);

  switch (label) {
    case "Estimate":
      return "Inspection or estimate visit; capture findings before office review.";
    case "Recurring Service":
      return "Recurring route service; confirm cadence and normal proof.";
    case "Exclusion":
      return "Exclusion or project work; capture before and after proof.";
    case "Project Work":
      return "Project phase work; capture scope and progress proof.";
    case "WDO / Escrow":
      return "WDO or escrow work; office review is required before release.";
    case "Warranty":
      return "Warranty visit; confirm no-charge or warranty handling.";
    case "Callback":
      return "Callback visit; document findings and customer concern.";
    case "Follow-up":
      return "Follow-up visit; verify the prior service outcome.";
    case "Inspection":
      return "Inspection visit; capture findings and recommendation notes.";
    default:
      return "General pest service; complete normal visit proof.";
  }
}

export function getJobClassificationCloseoutGuidance(
  classificationOrJob: JobClassification | Job | JobInput,
): JobClassificationGuidance | null {
  const classification = normalizeJobClassification(classificationOrJob);

  if (classification.job_purpose === "estimate") {
    return {
      items: ["Capture findings, recommendations, and customer-safe estimate notes."],
      label: "Estimate guidance",
      summary: "Inspection/estimate proof expected.",
      tone: "warning",
    };
  }

  if (isExclusionClassification(classification)) {
    return {
      items: ["Capture before/after photos, access points, and project scope notes."],
      label: "Exclusion guidance",
      summary: "Project/exclusion proof expected.",
      tone: "warning",
    };
  }

  if (classification.service_family === "termite_wdo") {
    return {
      items: ["Keep final documents internal until office review is complete."],
      label: "WDO / Escrow guidance",
      summary: "Office review required before final document release.",
      tone: "info",
    };
  }

  return null;
}

export function getJobClassificationBillingGuidance(
  classificationOrJob: JobClassification | Job | JobInput,
): JobClassificationGuidance | null {
  const classification = normalizeJobClassification(classificationOrJob);

  if (classification.billing_disposition === "estimate_only") {
    return {
      items: ["Review estimate status before treating the visit as completed service."],
      label: "Estimate only",
      summary: "Estimate only - review before invoicing as completed service.",
      tone: "warning",
    };
  }

  if (classification.billing_disposition === "included_in_recurring") {
    return {
      items: ["Verify plan billing before creating a separate invoice."],
      label: "Included in recurring",
      summary:
        "Included in recurring plan - verify account billing before creating a separate invoice.",
      tone: "info",
    };
  }

  if (classification.billing_disposition === "warranty_callback") {
    return {
      items: ["Confirm warranty/callback billing handling before invoice release."],
      label: "Warranty/callback",
      summary: "Warranty or callback handling expected; verify billing before invoicing.",
      tone: "warning",
    };
  }

  if (classification.billing_disposition === "no_charge") {
    return {
      items: ["Confirm no-charge account handling before invoice release."],
      label: "No charge",
      summary: "No-charge visit; verify account handling before creating an invoice.",
      tone: "neutral",
    };
  }

  return null;
}

function isExclusionClassification(classification: JobClassification) {
  return (
    classification.service_offering_id === "rodent_exclusion" ||
    classification.service_offering_id === "bird_exclusion" ||
    (classification.service_family === "rodent_attic" &&
      classification.service_cadence === "project") ||
    (classification.service_family === "bird_gopher" &&
      classification.service_cadence === "project")
  );
}

export function isEstimateJob(job: Job | JobInput) {
  return normalizeJobClassification(job).job_purpose === "estimate";
}

export function isRecurringJob(job: Job | JobInput) {
  const classification = normalizeJobClassification(job);
  return (
    classification.service_cadence === "monthly" ||
    classification.service_cadence === "bimonthly" ||
    classification.service_cadence === "quarterly" ||
    classification.service_cadence === "annual"
  );
}

export function isExclusionJob(job: Job | JobInput) {
  return isExclusionClassification(normalizeJobClassification(job));
}

export function isWdoEscrowJob(job: Job | JobInput) {
  return normalizeJobClassification(job).service_family === "termite_wdo";
}

export function isBillableJob(job: Job | JobInput) {
  const disposition = normalizeJobClassification(job).billing_disposition;
  return disposition === "billable" || disposition === "deposit_required";
}

export function shouldOfferInvoiceForJob(job: Job | JobInput) {
  const disposition = normalizeJobClassification(job).billing_disposition;
  return disposition !== "estimate_only" && disposition !== "included_in_recurring";
}
