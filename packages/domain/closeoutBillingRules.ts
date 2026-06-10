import type {
  Job,
  JobClassification,
  JobServiceCadence,
  ServiceBillingOfferingId,
} from "@pest-patrol/types";

import { normalizeJobClassification } from "./jobClassification";

export type CloseoutBillingRuleSeverity = "info" | "warning" | "critical";

export type CloseoutBillingAction =
  | "normal_invoice"
  | "review_before_invoice"
  | "estimate_review"
  | "recurring_review"
  | "project_review"
  | "warranty_review"
  | "wdo_review"
  | "no_invoice_expected";

export interface CloseoutBillingRule {
  id: string;
  label: string;
  summary: string;
  severity: CloseoutBillingRuleSeverity;
  action: CloseoutBillingAction;
  canCreateInvoice: boolean;
  requiresConfirmation: boolean;
  guidanceItems: string[];
  customerSafeSummary: string;
}

const recurringCadences = new Set<JobServiceCadence>([
  "monthly",
  "bimonthly",
  "quarterly",
  "annual",
]);

const wdoEscrowOfferingIds = new Set<ServiceBillingOfferingId>([
  "wdo_escrow_inspection",
  "escrow_clearance_document",
  "termite_inspection",
  "termite_repair",
]);

const exclusionOfferingIds = new Set<ServiceBillingOfferingId>([
  "rodent_exclusion",
  "bird_exclusion",
]);

function rule(input: CloseoutBillingRule): CloseoutBillingRule {
  return input;
}

function isEstimate(classification: JobClassification) {
  return (
    classification.job_purpose === "estimate" ||
    classification.billing_disposition === "estimate_only"
  );
}

function isWdoEscrow(classification: JobClassification) {
  return (
    classification.service_family === "termite_wdo" ||
    (classification.service_offering_id
      ? wdoEscrowOfferingIds.has(classification.service_offering_id)
      : false)
  );
}

function isWarrantyOrNoCharge(classification: JobClassification) {
  return (
    classification.job_purpose === "warranty" ||
    classification.job_purpose === "callback" ||
    classification.billing_disposition === "warranty_callback" ||
    classification.billing_disposition === "no_charge"
  );
}

function isRecurring(classification: JobClassification) {
  return (
    classification.service_family === "recurring_general_pest" ||
    recurringCadences.has(classification.service_cadence)
  );
}

function isProjectOrExclusion(classification: JobClassification) {
  return (
    classification.job_purpose === "project_phase" ||
    classification.service_cadence === "project" ||
    classification.service_family === "rodent_attic" ||
    classification.service_family === "bird_gopher" ||
    (classification.service_offering_id
      ? exclusionOfferingIds.has(classification.service_offering_id)
      : false)
  );
}

function isFollowUpOrInspection(classification: JobClassification) {
  return (
    classification.job_purpose === "follow_up" ||
    classification.job_purpose === "inspection"
  );
}

function cadenceLabel(cadence: JobServiceCadence) {
  if (cadence === "bimonthly") {
    return "bi-monthly";
  }

  return cadence.replace(/_/g, " ");
}

export function getCloseoutProofExpectationsForClassification(job: Job) {
  const classification = normalizeJobClassification(job);

  if (isEstimate(classification)) {
    return [
      "Inspection notes",
      "Photos",
      "Proposed scope",
      "Customer acknowledgement/signature if captured",
    ];
  }

  if (isWdoEscrow(classification)) {
    return [
      "Inspection findings",
      "Photos and report evidence",
      "Repair or clearance notes",
      "Staff-side WDO/Escrow readiness review",
    ];
  }

  if (isWarrantyOrNoCharge(classification)) {
    return [
      "Issue reviewed",
      "Photos/notes if needed",
      "Billable follow-up flagged if applicable",
    ];
  }

  if (isProjectOrExclusion(classification)) {
    return [
      "Before photos",
      "After photos",
      "Project scope/work notes",
      "Follow-up needed",
      "Signature if captured",
    ];
  }

  if (isRecurring(classification)) {
    return [
      "Service checklist",
      "Access/issues notes",
      "Chemical log if product was used",
      "Follow-up needs",
    ];
  }

  if (isFollowUpOrInspection(classification)) {
    return ["Findings", "Notes", "Photos if needed", "Next steps"];
  }

  return [
    "Service notes",
    "Photos/signature when captured",
    "Chemical log if product was used",
  ];
}

export function getCloseoutBillingRuleForJob(job: Job): CloseoutBillingRule {
  const classification = normalizeJobClassification(job);
  const proofExpectations = getCloseoutProofExpectationsForClassification(job);

  if (isEstimate(classification)) {
    return rule({
      action: "estimate_review",
      canCreateInvoice: true,
      customerSafeSummary: "Estimate details are being reviewed by the office.",
      guidanceItems: proofExpectations,
      id: "estimate_only",
      label: "Estimate",
      requiresConfirmation: true,
      severity: "warning",
      summary: "Estimate only — review before invoicing as completed service.",
    });
  }

  if (isWdoEscrow(classification)) {
    return rule({
      action: "wdo_review",
      canCreateInvoice: true,
      customerSafeSummary:
        "Service records are being reviewed before customer documents are shared.",
      guidanceItems: proofExpectations,
      id: "wdo_escrow",
      label: "WDO / Escrow",
      requiresConfirmation: false,
      severity: "warning",
      summary: "Confirm WDO/Escrow readiness before final document release.",
    });
  }

  if (isWarrantyOrNoCharge(classification)) {
    const noInvoiceExpected =
      classification.billing_disposition === "no_charge";

    return rule({
      action: noInvoiceExpected ? "no_invoice_expected" : "warranty_review",
      canCreateInvoice: true,
      customerSafeSummary:
        "Service follow-up is under office review before billing is finalized.",
      guidanceItems: proofExpectations,
      id: noInvoiceExpected ? "no_charge_review" : "warranty_callback",
      label: "Warranty / Callback",
      requiresConfirmation: true,
      severity: "warning",
      summary:
        "Warranty/callback — confirm no-charge or billable follow-up before invoicing.",
    });
  }

  if (isRecurring(classification)) {
    if (classification.billing_disposition === "included_in_recurring") {
      return rule({
        action: "recurring_review",
        canCreateInvoice: true,
        customerSafeSummary:
          "Recurring service records are being reviewed by the office.",
        guidanceItems: proofExpectations,
        id: "recurring_included",
        label: "Recurring Service",
        requiresConfirmation: true,
        severity: "warning",
        summary:
          "Included in recurring plan — verify account billing before creating a separate invoice.",
      });
    }

    return rule({
      action: "normal_invoice",
      canCreateInvoice: true,
      customerSafeSummary: "Recurring service completed.",
      guidanceItems: [
        `Cadence: ${cadenceLabel(classification.service_cadence)}`,
        ...proofExpectations,
      ],
      id: "recurring_billable",
      label: "Recurring Service",
      requiresConfirmation: false,
      severity: "info",
      summary: "Recurring service is billable; keep the cadence visible.",
    });
  }

  if (isProjectOrExclusion(classification)) {
    return rule({
      action: "project_review",
      canCreateInvoice: true,
      customerSafeSummary:
        "Project service proof is being reviewed before billing is finalized.",
      guidanceItems: proofExpectations,
      id:
        classification.billing_disposition === "deposit_required"
          ? "project_deposit_review"
          : "project_review",
      label: "Exclusion / Project",
      requiresConfirmation: false,
      severity:
        classification.billing_disposition === "deposit_required"
          ? "warning"
          : "info",
      summary:
        "Project/exclusion work — confirm scope and photo proof before invoice release.",
    });
  }

  if (isFollowUpOrInspection(classification)) {
    return rule({
      action: "review_before_invoice",
      canCreateInvoice: true,
      customerSafeSummary:
        "Inspection or follow-up service records are under office review.",
      guidanceItems: proofExpectations,
      id: "follow_up_inspection",
      label: "Follow-up / Inspection",
      requiresConfirmation: false,
      severity: "info",
      summary: "Inspection/follow-up — verify billing disposition before invoicing.",
    });
  }

  return rule({
    action: "normal_invoice",
    canCreateInvoice: true,
    customerSafeSummary: "Service completed.",
    guidanceItems: proofExpectations,
    id: "standard_billable",
    label: "General Pest / Service",
    requiresConfirmation: false,
    severity: "info",
    summary: "Normal completed-service invoice workflow.",
  });
}

export function getPaymentCreationGuardrailForJob(job: Job) {
  const ruleForJob = getCloseoutBillingRuleForJob(job);

  return ruleForJob.action === "normal_invoice" ? null : ruleForJob;
}

export function shouldShowInvoiceCreationWarning(job: Job) {
  return getPaymentCreationGuardrailForJob(job) !== null;
}

export function shouldRequireInvoiceCreationConfirmation(job: Job) {
  return getCloseoutBillingRuleForJob(job).requiresConfirmation;
}

export function getInvoiceCreationWarningCopy(job: Job) {
  return getCloseoutBillingRuleForJob(job).summary;
}

export function getClassificationAwareCloseoutGuidance(job: Job) {
  const ruleForJob = getCloseoutBillingRuleForJob(job);

  return ruleForJob.action === "normal_invoice" ? null : ruleForJob;
}

export function getClassificationAwareBillingGuidance(job: Job) {
  return getPaymentCreationGuardrailForJob(job);
}
