import type {
  Job,
  JobInput,
  JobServiceCadence,
  ServiceBillingOfferingId,
} from "@pest-patrol/types";

import {
  inferJobClassificationFromServiceOffering,
  normalizeJobClassification,
} from "./jobClassification";
import {
  getServiceBillingOffering,
  inferServiceBillingOfferingFromJob,
} from "./serviceBillingCatalog";

export type MobileWorkModeId =
  | "estimate"
  | "recurring_service"
  | "general_pest"
  | "exclusion_project"
  | "wdo_escrow"
  | "warranty_callback"
  | "follow_up"
  | "inspection"
  | "standard_service";

export type MobileWorkModeBadgeTone =
  | "danger"
  | "info"
  | "neutral"
  | "success"
  | "warning";

export type MobileWorkModeRequirement =
  | "not_expected"
  | "optional"
  | "recommended"
  | "required";

export type MobileWorkModeRelatedStep =
  | "chemical"
  | "form"
  | "geofence"
  | "photo"
  | "signature"
  | "status"
  | "sync";

export interface MobileWorkModeChecklistItem {
  expectedState: MobileWorkModeRequirement;
  id: string;
  label: string;
  relatedStep: MobileWorkModeRelatedStep;
  required: MobileWorkModeRequirement;
  summary: string;
}

export interface MobileWorkMode {
  badgeTone: MobileWorkModeBadgeTone;
  checklistItems: MobileWorkModeChecklistItem[];
  id: MobileWorkModeId;
  label: string;
  primaryActionLabel: string;
  proofExpectations: string[];
  shortLabel: string;
  summary: string;
  warnings: string[];
}

const recurringCadences: JobServiceCadence[] = [
  "monthly",
  "bimonthly",
  "quarterly",
  "annual",
];

const wdoEscrowOfferingIds = new Set<ServiceBillingOfferingId>([
  "wdo_escrow_inspection",
  "escrow_clearance_document",
  "termite_inspection",
  "termite_repair",
  "termite_localized_treatment",
  "termite_fumigation",
]);

const exclusionOfferingIds = new Set<ServiceBillingOfferingId>([
  "rodent_exclusion",
  "bird_exclusion",
]);

function item(
  id: string,
  label: string,
  summary: string,
  relatedStep: MobileWorkModeRelatedStep,
  required: MobileWorkModeRequirement,
): MobileWorkModeChecklistItem {
  return {
    expectedState: required,
    id,
    label,
    relatedStep,
    required,
    summary,
  };
}

function mode(input: Omit<MobileWorkMode, "checklistItems"> & {
  checklistItems: MobileWorkModeChecklistItem[];
}): MobileWorkMode {
  return input;
}

const mobileWorkModes: Record<MobileWorkModeId, MobileWorkMode> = {
  estimate: mode({
    badgeTone: "warning",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item(
        "inspection_notes",
        "Inspection notes",
        "Document findings and recommendations.",
        "form",
        "required",
      ),
      item("photos", "Photos", "Photos strongly recommended.", "photo", "recommended"),
      item(
        "estimate_scope",
        "Estimate scope",
        "Document the proposed scope for office/customer follow-up.",
        "form",
        "required",
      ),
      item(
        "acknowledgement",
        "Customer acknowledgement / signature if available",
        "Capture acknowledgement when available.",
        "signature",
        "optional",
      ),
      item("sync", "Sync", "Sync queued estimate proof.", "sync", "required"),
    ],
    id: "estimate",
    label: "Estimate",
    primaryActionLabel: "Document estimate",
    proofExpectations: ["Photos strongly recommended"],
    shortLabel: "Estimate",
    summary:
      "Inspect, capture photos, and document the proposed scope. Treatment is not required unless directed.",
    warnings: ["Treatment is not required unless directed."],
  }),
  recurring_service: mode({
    badgeTone: "success",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item(
        "service_checklist",
        "Service checklist / treatment form",
        "Complete the scheduled route service workflow.",
        "form",
        "required",
      ),
      item(
        "chemical_if_used",
        "Chemical log if used",
        "Chemical log is only needed if product was used.",
        "chemical",
        "recommended",
      ),
      item(
        "access_issues",
        "Access/issues notes",
        "Note access issues or follow-up needs.",
        "form",
        "recommended",
      ),
      item("complete", "Complete", "Complete the route stop.", "status", "required"),
      item("sync", "Sync", "Sync queued route work.", "sync", "required"),
    ],
    id: "recurring_service",
    label: "Recurring Service",
    primaryActionLabel: "Complete route service",
    proofExpectations: [],
    shortLabel: "Recurring",
    summary:
      "Complete the scheduled route service and note any access issues or follow-up needs.",
    warnings: [],
  }),
  general_pest: mode({
    badgeTone: "neutral",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("treatment_form", "Treatment form", "Complete treatment notes.", "form", "required"),
      item(
        "chemical_if_used",
        "Chemical log if used",
        "Chemical log is only needed if product was used.",
        "chemical",
        "recommended",
      ),
      item("photos_if_needed", "Photos if needed", "Capture photos when proof is useful.", "photo", "optional"),
      item(
        "signature_if_required",
        "Signature if required",
        "Capture signature when the account or office requires it.",
        "signature",
        "optional",
      ),
      item("sync", "Sync", "Sync queued service proof.", "sync", "required"),
    ],
    id: "general_pest",
    label: "General Pest",
    primaryActionLabel: "Complete service",
    proofExpectations: [],
    shortLabel: "General Pest",
    summary: "Complete treatment workflow and chemical log if product is used.",
    warnings: [],
  }),
  exclusion_project: mode({
    badgeTone: "warning",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("review_scope", "Review scope", "Confirm scope before work begins.", "form", "required"),
      item("before_photos", "Before photos", "Photo proof expected before work.", "photo", "required"),
      item("work_checklist", "Work checklist", "Document completed project work.", "form", "required"),
      item("after_photos", "After photos", "Photo proof expected after work.", "photo", "required"),
      item("follow_up_needed", "Follow-up needed?", "Flag follow-up needs for office review.", "form", "recommended"),
      item("signature", "Signature", "Capture signature when available.", "signature", "recommended"),
      item("sync", "Sync", "Sync queued project proof.", "sync", "required"),
    ],
    id: "exclusion_project",
    label: "Exclusion / Project",
    primaryActionLabel: "Document project work",
    proofExpectations: ["Photo proof expected"],
    shortLabel: "Project",
    summary: "Review scope, capture before/after photos, and document project work.",
    warnings: [],
  }),
  wdo_escrow: mode({
    badgeTone: "info",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("inspection_form", "Inspection form", "Capture inspection proof and findings.", "form", "required"),
      item(
        "findings_recommendations",
        "Findings / recommendations",
        "Document findings and recommendations.",
        "form",
        "required",
      ),
      item("required_photos", "Required photos", "Photo proof expected.", "photo", "required"),
      item(
        "office_review",
        "Office review",
        "Office review required before final document release.",
        "sync",
        "required",
      ),
      item("sync", "Sync", "Sync queued inspection proof.", "sync", "required"),
    ],
    id: "wdo_escrow",
    label: "WDO / Escrow",
    primaryActionLabel: "Document inspection",
    proofExpectations: ["Photo proof expected"],
    shortLabel: "WDO / Escrow",
    summary:
      "Capture inspection proof and findings. Office review is required before final document release.",
    warnings: ["Office review required before final document release."],
  }),
  warranty_callback: mode({
    badgeTone: "danger",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("issue_review", "Issue review", "Confirm the customer issue.", "form", "required"),
      item("photos_if_needed", "Photos if needed", "Capture photos when proof is useful.", "photo", "recommended"),
      item("service_notes", "Service notes", "Document findings and next steps.", "form", "required"),
      item("complete", "Complete", "Complete the callback visit.", "status", "required"),
      item("sync", "Sync", "Sync queued callback proof.", "sync", "required"),
    ],
    id: "warranty_callback",
    label: "Warranty / Callback",
    primaryActionLabel: "Document callback",
    proofExpectations: [],
    shortLabel: "Callback",
    summary: "Confirm the issue, document findings, and flag any billable follow-up.",
    warnings: [],
  }),
  follow_up: mode({
    badgeTone: "neutral",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("inspection_notes", "Inspection notes", "Document findings and next steps.", "form", "required"),
      item("photos_if_needed", "Photos if needed", "Capture photos when proof is useful.", "photo", "recommended"),
      item(
        "follow_up_recommendation",
        "Follow-up recommendation",
        "Document recommendation or next action.",
        "form",
        "required",
      ),
      item("sync", "Sync", "Sync queued follow-up proof.", "sync", "required"),
    ],
    id: "follow_up",
    label: "Follow-up",
    primaryActionLabel: "Document follow-up",
    proofExpectations: [],
    shortLabel: "Follow-up",
    summary: "Document findings and next steps.",
    warnings: [],
  }),
  inspection: mode({
    badgeTone: "neutral",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("inspection_notes", "Inspection notes", "Document findings and next steps.", "form", "required"),
      item("photos_if_needed", "Photos if needed", "Capture photos when proof is useful.", "photo", "recommended"),
      item(
        "follow_up_recommendation",
        "Follow-up recommendation",
        "Document recommendation or next action.",
        "form",
        "required",
      ),
      item("sync", "Sync", "Sync queued inspection proof.", "sync", "required"),
    ],
    id: "inspection",
    label: "Inspection",
    primaryActionLabel: "Document inspection",
    proofExpectations: [],
    shortLabel: "Inspection",
    summary: "Document findings and next steps.",
    warnings: [],
  }),
  standard_service: mode({
    badgeTone: "neutral",
    checklistItems: [
      item("arrival", "Arrival", "Capture arrival at the service location.", "geofence", "required"),
      item("treatment_form", "Treatment form", "Complete the standard service workflow.", "form", "required"),
      item(
        "chemical_if_used",
        "Chemical log if used",
        "Chemical log is only needed if product was used.",
        "chemical",
        "recommended",
      ),
      item("photos_if_needed", "Photos if needed", "Capture photos when proof is useful.", "photo", "optional"),
      item(
        "signature_if_required",
        "Signature if required",
        "Capture signature when the account or office requires it.",
        "signature",
        "optional",
      ),
      item("sync", "Sync", "Sync queued service proof.", "sync", "required"),
    ],
    id: "standard_service",
    label: "Service",
    primaryActionLabel: "Complete service",
    proofExpectations: [],
    shortLabel: "Service",
    summary: "Complete the standard field workflow.",
    warnings: [],
  }),
};

function hasStructuredClassification(job: Partial<Job | JobInput>) {
  return Boolean(
    job.job_purpose ??
      job.billing_disposition ??
      job.service_cadence ??
      job.service_family ??
      job.service_offering_id,
  );
}

function modeIdFromClassification(
  jobOrInput: Partial<Job | JobInput>,
): MobileWorkModeId {
  const classification = normalizeJobClassification(jobOrInput);

  if (
    classification.job_purpose === "estimate" ||
    classification.billing_disposition === "estimate_only"
  ) {
    return "estimate";
  }

  if (
    classification.job_purpose === "warranty" ||
    classification.job_purpose === "callback" ||
    classification.billing_disposition === "warranty_callback" ||
    classification.billing_disposition === "no_charge"
  ) {
    return "warranty_callback";
  }

  if (
    classification.service_family === "termite_wdo" ||
    (classification.service_offering_id &&
      wdoEscrowOfferingIds.has(classification.service_offering_id))
  ) {
    return "wdo_escrow";
  }

  if (
    classification.job_purpose === "project_phase" ||
    classification.service_cadence === "project" ||
    (classification.service_offering_id &&
      exclusionOfferingIds.has(classification.service_offering_id))
  ) {
    return "exclusion_project";
  }

  if (
    recurringCadences.includes(classification.service_cadence) ||
    classification.service_family === "recurring_general_pest"
  ) {
    return "recurring_service";
  }

  if (classification.job_purpose === "follow_up") {
    return "follow_up";
  }

  if (classification.job_purpose === "inspection") {
    return "inspection";
  }

  if (
    classification.job_purpose === "service" &&
    classification.service_family === "general_pest"
  ) {
    return "general_pest";
  }

  return "standard_service";
}

function inferredModeId(job: Job): MobileWorkModeId {
  try {
    const inference = inferServiceBillingOfferingFromJob(job);

    if (inference.confidence === "fallback") {
      return "standard_service";
    }

    return modeIdFromClassification(
      inferJobClassificationFromServiceOffering(inference.offering.id),
    );
  } catch {
    return "standard_service";
  }
}

function getModeIdForJob(job: Job | JobInput): MobileWorkModeId {
  if (hasStructuredClassification(job)) {
    return modeIdFromClassification(job);
  }

  if ("id" in job && job.id) {
    return inferredModeId(job as Job);
  }

  return "standard_service";
}

export function getMobileWorkModeForJob(job: Job | JobInput): MobileWorkMode {
  return mobileWorkModes[getModeIdForJob(job)];
}

export function getMobileWorkModeLabel(mode: MobileWorkMode | MobileWorkModeId) {
  return typeof mode === "string" ? mobileWorkModes[mode].label : mode.label;
}

export function getMobileWorkModeSummary(
  mode: MobileWorkMode | MobileWorkModeId,
) {
  return typeof mode === "string" ? mobileWorkModes[mode].summary : mode.summary;
}

export function getMobileWorkModeChecklist(
  job: Job | JobInput,
  currentWorkPlan: unknown[] = [],
) {
  void currentWorkPlan;
  return getMobileWorkModeForJob(job).checklistItems;
}

export function getMobileWorkModeProofExpectations(job: Job | JobInput) {
  return getMobileWorkModeForJob(job).proofExpectations;
}

export function shouldRequireChemicalLogForWorkMode(job: Job | JobInput) {
  const modeId = getModeIdForJob(job);

  return modeId === "general_pest" || modeId === "recurring_service";
}

export function shouldRequirePhotosForWorkMode(job: Job | JobInput) {
  const modeId = getModeIdForJob(job);

  return modeId === "exclusion_project" || modeId === "wdo_escrow";
}

export function shouldRequireSignatureForWorkMode(job: Job | JobInput) {
  void job;
  return false;
}

export function getMobileWorkModeById(id: MobileWorkModeId) {
  return mobileWorkModes[id];
}

export function getMobileWorkModeForOffering(id: ServiceBillingOfferingId) {
  const offering = getServiceBillingOffering(id);

  return mobileWorkModes[
    modeIdFromClassification(inferJobClassificationFromServiceOffering(offering.id))
  ];
}
