import type {
  EstimateConversionInput,
  EstimateConversionReadiness,
  EstimateConversionResult,
  Job,
  JobBillingDisposition,
  JobInput,
  ServiceBillingOfferingId,
} from "@pest-patrol/types";

import {
  inferJobClassificationFromJob,
  inferJobClassificationFromServiceOffering,
  normalizeJobClassification,
} from "./jobClassification";

const projectOfferings = new Set<ServiceBillingOfferingId>([
  "rodent_exclusion",
  "bird_exclusion",
  "attic_cleanup_sanitation",
  "insulation_removal",
  "re_insulation",
  "termite_repair",
]);

const estimateToWorkOrderOffering: Partial<
  Record<ServiceBillingOfferingId, ServiceBillingOfferingId>
> = {
  bird_removal: "bird_exclusion",
  rodent_inspection: "rodent_exclusion",
  termite_inspection: "termite_repair",
  wdo_escrow_inspection: "termite_repair",
};

function isCanceled(job: Job) {
  return job.status === "canceled";
}

function isDeclined(job: Job) {
  return normalizeJobClassification(job).estimate_status === "declined";
}

export function isEstimateJobClassifiableForConversion(job: Job) {
  const classification = normalizeJobClassification(job);

  return (
    classification.job_purpose === "estimate" ||
    classification.billing_disposition === "estimate_only"
  );
}

export function getExistingWorkOrderForEstimate(
  estimateJob: Job,
  jobs: Job[],
) {
  return (
    jobs.find(
      (job) =>
        job.parent_job_id === estimateJob.id &&
        job.status !== "canceled" &&
        job.id !== estimateJob.id,
    ) ?? null
  );
}

function readiness(
  input: Omit<EstimateConversionReadiness, "reasons" | "warnings"> & {
    reasons?: string[];
    warnings?: string[];
  },
): EstimateConversionReadiness {
  return {
    reasons: input.reasons ?? [],
    warnings: input.warnings ?? [],
    ...input,
  };
}

export function getEstimateConversionReadiness(
  job: Job,
  existingWorkOrder?: Job | null,
): EstimateConversionReadiness {
  if (existingWorkOrder) {
    return readiness({
      can_convert: false,
      existing_work_order_job_id: existingWorkOrder.id,
      status: "already_converted",
      summary:
        "A linked work order already exists. Open that job instead of creating another copy.",
      title: "Work order created",
    });
  }

  if (!isEstimateJobClassifiableForConversion(job)) {
    return readiness({
      can_convert: false,
      reasons: ["Only estimate jobs can be converted to work orders."],
      status: "blocked",
      summary:
        "This job is already classified as service, inspection, recurring, warranty, or project work.",
      title: "Conversion unavailable",
    });
  }

  if (isCanceled(job)) {
    return readiness({
      can_convert: false,
      reasons: ["Canceled estimates cannot be converted."],
      status: "blocked",
      summary:
        "Create a new estimate or service job if the office needs to restart this work.",
      title: "Estimate canceled",
    });
  }

  if (isDeclined(job)) {
    return readiness({
      can_convert: false,
      reasons: ["Declined estimates cannot be converted in V1."],
      status: "blocked",
      summary:
        "Keep the declined estimate for history. Reopen or create a new estimate before scheduling work.",
      title: "Estimate declined",
    });
  }

  const estimateStatus = normalizeJobClassification(job).estimate_status;

  return readiness({
    can_convert: true,
    status: "ready",
    summary:
      "Create scheduled work from this estimate. The estimate remains linked for history.",
    title: "Convert estimate to work order",
    warnings:
      estimateStatus === "accepted"
        ? []
        : [
            "Conversion will mark the estimate accepted while leaving the original estimate job in place.",
          ],
  });
}

export function canConvertEstimateToWorkOrder(job: Job) {
  return getEstimateConversionReadiness(job).can_convert;
}

function getDefaultWorkOrderOffering(job: Job) {
  const classification = inferJobClassificationFromJob(job);
  const currentOffering = classification.service_offering_id;

  if (!currentOffering) {
    return "general_pest_initial";
  }

  return estimateToWorkOrderOffering[currentOffering] ?? currentOffering;
}

function getDefaultBillingDisposition(
  offeringId: ServiceBillingOfferingId,
  override?: JobBillingDisposition | null,
) {
  if (override && override !== "estimate_only") {
    return override;
  }

  if (projectOfferings.has(offeringId)) {
    return "billable";
  }

  return inferJobClassificationFromServiceOffering(offeringId)
    .billing_disposition === "estimate_only"
    ? "billable"
    : inferJobClassificationFromServiceOffering(offeringId)
        .billing_disposition;
}

export function buildWorkOrderInputFromEstimate(
  estimateJob: Job,
  input: EstimateConversionInput,
): JobInput {
  const offeringId =
    input.service_offering_id ?? getDefaultWorkOrderOffering(estimateJob);
  const classification = inferJobClassificationFromServiceOffering(offeringId);

  return {
    assigned_tech_id: input.assigned_tech_id ?? null,
    billing_disposition: getDefaultBillingDisposition(
      offeringId,
      input.billing_disposition,
    ),
    customer_id: estimateJob.customer_id,
    estimate_status: "not_applicable",
    job_purpose: projectOfferings.has(offeringId)
      ? "project_phase"
      : classification.job_purpose === "estimate"
        ? "service"
        : classification.job_purpose,
    location_id: estimateJob.location_id,
    parent_job_id: estimateJob.id,
    scheduled_end: input.scheduled_end ?? null,
    scheduled_start: input.scheduled_start,
    service_cadence: projectOfferings.has(offeringId)
      ? "project"
      : classification.service_cadence === "none"
        ? "one_time"
        : classification.service_cadence,
    service_family: classification.service_family,
    service_notes: input.service_notes ?? estimateJob.service_notes ?? null,
    service_offering_id: offeringId,
    status: "scheduled",
  };
}

export function getEstimateConversionGuidance(
  job: Job,
  existingWorkOrder?: Job | null,
) {
  const readinessState = getEstimateConversionReadiness(job, existingWorkOrder);

  return {
    items: [
      "The original estimate remains linked for office history.",
      "The new work order gets its own schedule, closeout, photos, signatures, and invoice path.",
      "No invoice or payment link is created automatically.",
      ...readinessState.warnings,
    ],
    readiness: readinessState,
  };
}

export function getEstimateConversionSuccessCopy(
  result: EstimateConversionResult,
) {
  if (result.reused_existing_work_order) {
    return "Work order created earlier. Open the linked job to schedule, assign, or continue office review.";
  }

  return "Work order created and linked to the estimate. No invoice was created automatically.";
}

export function getWorkOrderConversionCandidate(
  estimateJob: Job,
  jobs: Job[],
  input?: EstimateConversionInput,
) {
  const existingWorkOrder = getExistingWorkOrderForEstimate(estimateJob, jobs);
  const readinessState = getEstimateConversionReadiness(
    estimateJob,
    existingWorkOrder,
  );

  return {
    default_input:
      input && readinessState.can_convert
        ? buildWorkOrderInputFromEstimate(estimateJob, input)
        : null,
    estimate_job: estimateJob,
    existing_work_order_job: existingWorkOrder,
    readiness: readinessState,
  };
}
