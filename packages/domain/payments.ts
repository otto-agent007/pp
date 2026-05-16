import {
  createInvoicePaymentLinkRecord,
  createInvoiceRecord,
  listInvoiceRecords,
  updateInvoiceStatusRecord,
} from "@pest-patrol/api-client";
import type {
  CustomerPortalInvoice,
  CustomerPortalInvoiceLineItem,
  Invoice,
  InvoiceInput,
  InvoiceLineItemInput,
  InvoiceStatus,
  Job,
} from "@pest-patrol/types";

export type InvoiceStatusFilter = InvoiceStatus | "all";
export type CustomerPortalInvoiceStatusFilter = CustomerPortalInvoice["status"] | "all";
export type InvoiceReconciliationStatus =
  | "draft"
  | "awaiting_payment"
  | "partially_paid"
  | "reconciled_paid"
  | "manual_paid"
  | "needs_review"
  | "void";

export interface InvoiceSummary {
  draftCount: number;
  openCents: number;
  paidCents: number;
  sentCount: number;
}

export interface InvoiceReconciliation {
  balanceCents: number;
  label: string;
  latestPaidAt: string | null;
  needsReview: boolean;
  paidCents: number;
  reviewLabel: string | null;
  status: InvoiceReconciliationStatus;
}

export interface InvoiceReconciliationGuidance {
  label: string;
  markPaidConfirmation: string;
  nextStep: string;
  summary: string;
  voidConfirmation: string;
}

export interface InvoiceReconciliationSummary {
  needsReviewCount: number;
  paidCents: number;
  remainingCents: number;
}

export interface BillingCloseoutHandoffSummary {
  label: string;
  nextStep: string;
  summary: string;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeCurrency(value?: string | null) {
  const currency = normalizeOptional(value) ?? "usd";

  if (!/^[a-z]{3}$/i.test(currency)) {
    throw new Error("Currency must be a three-letter code");
  }

  return currency.toLowerCase();
}

function normalizeDueDate(value?: string | null) {
  const dueDate = normalizeOptional(value);

  if (dueDate && Number.isNaN(Date.parse(dueDate))) {
    throw new Error("Due date must be a valid date");
  }

  return dueDate;
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Line item quantity must be greater than zero");
  }

  return value;
}

function normalizeAmountCents(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Line item amount must be greater than zero");
  }

  return value;
}

export function normalizeInvoiceLineItemInput(
  input: InvoiceLineItemInput,
): InvoiceLineItemInput {
  return {
    description: requireNonEmpty(input.description, "Line item description"),
    quantity: normalizeQuantity(input.quantity),
    unit_amount_cents: normalizeAmountCents(input.unit_amount_cents),
  };
}

export function getInvoiceInputTotalCents(input: InvoiceInput) {
  return input.line_items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unit_amount_cents),
    0,
  );
}

export function normalizeInvoiceInput(input: InvoiceInput): InvoiceInput {
  const lineItems = input.line_items.map(normalizeInvoiceLineItemInput);

  if (lineItems.length === 0) {
    throw new Error("At least one invoice line item is required");
  }

  return {
    job_id: requireNonEmpty(input.job_id, "Job"),
    customer_id: requireNonEmpty(input.customer_id, "Customer"),
    currency: normalizeCurrency(input.currency),
    due_date: normalizeDueDate(input.due_date),
    notes: normalizeOptional(input.notes),
    line_items: lineItems,
  };
}

export function validateInvoiceInput(input: InvoiceInput) {
  return normalizeInvoiceInput(input);
}

export function buildInvoiceInputFromJob(
  job: Job,
  amountCents: number,
  description = "Pest control service",
): InvoiceInput {
  return validateInvoiceInput({
    job_id: job.id,
    customer_id: job.customer_id,
    currency: "usd",
    due_date: null,
    notes: job.service_notes,
    line_items: [
      {
        description,
        quantity: 1,
        unit_amount_cents: amountCents,
      },
    ],
  });
}

export function getInvoiceHandoffHref(jobId: string) {
  return `/payments?job_id=${encodeURIComponent(requireNonEmpty(jobId, "Job"))}`;
}

function searchableInvoiceText(invoice: Invoice) {
  return [
    invoice.customer?.name,
    invoice.job?.customer?.name,
    invoice.job?.location?.address,
    invoice.notes,
    invoice.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterInvoices(
  invoices: Invoice[],
  search: string,
  status: InvoiceStatusFilter = "all",
) {
  const query = search.trim().toLowerCase();

  return invoices
    .filter((invoice) => status === "all" || invoice.status === status)
    .filter(
      (invoice) => !query || searchableInvoiceText(invoice).includes(query),
    );
}

export function getInvoiceSummary(invoices: Invoice[]): InvoiceSummary {
  return invoices.reduce(
    (summary, invoice) => {
      if (invoice.status === "draft") {
        summary.draftCount += 1;
      }

      if (invoice.status === "sent") {
        summary.sentCount += 1;
        summary.openCents += invoice.total_cents;
      }

      if (invoice.status === "paid") {
        summary.paidCents += invoice.total_cents;
      }

      return summary;
    },
    {
      draftCount: 0,
      openCents: 0,
      paidCents: 0,
      sentCount: 0,
    },
  );
}

export function getInvoiceJobIds(invoices: Invoice[]) {
  return new Set(invoices.map((invoice) => invoice.job_id));
}

export function getInvoiceBalanceCents(invoice: Invoice) {
  const paidCents =
    invoice.payments
      ?.filter((payment) => payment.status === "succeeded")
      .reduce((total, payment) => total + payment.amount_cents, 0) ?? 0;

  return Math.max(invoice.total_cents - paidCents, 0);
}

export function getInvoicePaidCents(invoice: Invoice) {
  return (
    invoice.payments
      ?.filter((payment) => payment.status === "succeeded")
      .reduce((total, payment) => total + payment.amount_cents, 0) ?? 0
  );
}

function latestSuccessfulPaidAt(invoice: Invoice) {
  return (
    invoice.payments
      ?.filter((payment) => payment.status === "succeeded" && payment.paid_at)
      .map((payment) => payment.paid_at as string)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function getPaymentReviewLabel(invoice: Invoice) {
  const payments = invoice.payments ?? [];

  if (payments.some((payment) => payment.status === "failed")) {
    return "Failed payment activity";
  }

  if (payments.some((payment) => payment.status === "pending")) {
    return "Pending payment activity";
  }

  return null;
}

export function getInvoiceReconciliation(
  invoice: Invoice,
): InvoiceReconciliation {
  const paidCents = getInvoicePaidCents(invoice);
  const balanceCents = getInvoiceBalanceCents(invoice);
  const latestPaidAt = latestSuccessfulPaidAt(invoice);

  if (invoice.status === "void") {
    return {
      balanceCents: 0,
      label: "Void",
      latestPaidAt,
      needsReview: false,
      paidCents,
      reviewLabel: null,
      status: "void",
    };
  }

  const reviewLabel = getPaymentReviewLabel(invoice);

  if (reviewLabel) {
    return {
      balanceCents,
      label: "Needs review",
      latestPaidAt,
      needsReview: true,
      paidCents,
      reviewLabel,
      status: "needs_review",
    };
  }

  if (invoice.status === "draft") {
    return {
      balanceCents,
      label: "Draft",
      latestPaidAt,
      needsReview: false,
      paidCents,
      reviewLabel: null,
      status: "draft",
    };
  }

  if (paidCents > 0 && balanceCents > 0) {
    return {
      balanceCents,
      label: "Partially paid",
      latestPaidAt,
      needsReview: false,
      paidCents,
      reviewLabel: null,
      status: "partially_paid",
    };
  }

  if (paidCents > 0 && balanceCents === 0) {
    return {
      balanceCents,
      label: "Reconciled paid",
      latestPaidAt,
      needsReview: false,
      paidCents,
      reviewLabel: null,
      status: "reconciled_paid",
    };
  }

  if (invoice.status === "paid") {
    return {
      balanceCents: 0,
      label: "Manually marked paid",
      latestPaidAt,
      needsReview: false,
      paidCents,
      reviewLabel: null,
      status: "manual_paid",
    };
  }

  return {
    balanceCents,
    label: "Awaiting payment",
    latestPaidAt,
    needsReview: false,
    paidCents,
    reviewLabel: null,
    status: "awaiting_payment",
  };
}

const markPaidConfirmation =
  "Confirm the customer paid outside provider sync before marking paid. This does not create a provider charge.";
const voidConfirmation =
  "Void only if this invoice should leave active collection. Existing payment records remain audit history.";

export function getInvoiceReconciliationGuidance(
  invoice: Invoice,
): InvoiceReconciliationGuidance {
  const reconciliation = getInvoiceReconciliation(invoice);
  const base = {
    label: reconciliation.label,
    markPaidConfirmation,
    voidConfirmation,
  };

  if (reconciliation.status === "needs_review") {
    return {
      ...base,
      nextStep:
        "Review the payment record or confirm a manual status after office verification.",
      summary: `${
        reconciliation.reviewLabel ?? "Payment activity"
      } needs review before this invoice is reconciled.`,
    };
  }

  if (reconciliation.status === "manual_paid") {
    return {
      ...base,
      nextStep: "Keep the manual confirmation visible for office audit.",
      summary: "Marked paid manually; no successful provider payment is attached.",
    };
  }

  if (reconciliation.status === "reconciled_paid") {
    return {
      ...base,
      nextStep: "Ready for customer ledger and portal handoff.",
      summary: "Successful payment records cover this invoice balance.",
    };
  }

  if (reconciliation.status === "partially_paid") {
    return {
      ...base,
      nextStep: "Collect or reconcile the remaining balance before marking paid.",
      summary: "Successful payment records cover part of this invoice.",
    };
  }

  if (reconciliation.status === "draft") {
    return {
      ...base,
      nextStep: "Create a payment link or leave draft until billing is ready.",
      summary: "Invoice is still draft and has not been sent.",
    };
  }

  if (reconciliation.status === "void") {
    return {
      ...base,
      nextStep: "Reissue from the closeout if billing should restart.",
      summary: "Invoice is void and excluded from active collection.",
    };
  }

  return {
    ...base,
    nextStep: "Send a payment link or mark paid after verified offline payment.",
    summary: "No successful payment is recorded yet.",
  };
}

export function getInvoiceReconciliationSummary(
  invoices: Invoice[],
): InvoiceReconciliationSummary {
  return invoices.reduce(
    (summary, invoice) => {
      const reconciliation = getInvoiceReconciliation(invoice);

      if (reconciliation.needsReview) {
        summary.needsReviewCount += 1;
      }

      if (reconciliation.status !== "void") {
        summary.paidCents += reconciliation.paidCents;
        summary.remainingCents += reconciliation.balanceCents;
      }

      return summary;
    },
    {
      needsReviewCount: 0,
      paidCents: 0,
      remainingCents: 0,
    },
  );
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getBillingCloseoutHandoffSummary({
  needsCaptures,
  needsReview,
  readyToBill,
}: {
  needsCaptures: number;
  needsReview: number;
  readyToBill: number;
}): BillingCloseoutHandoffSummary {
  const reviewStep =
    needsReview > 0
      ? `${countLabel(needsReview, "invoice")} ${
          needsReview === 1 ? "needs" : "need"
        } reconciliation review before demo handoff.`
      : "Create invoices for ready closeouts or review the queue.";

  if (readyToBill > 0) {
    return {
      label: "Closeout handoff ready",
      nextStep: reviewStep,
      summary: `${readyToBill} ready to invoice from closeouts; ${needsCaptures} still ${
        needsCaptures === 1 ? "needs" : "need"
      } field captures.`,
    };
  }

  if (needsCaptures > 0) {
    return {
      label: "Closeout handoff waiting on captures",
      nextStep: "Review missing captures before invoice creation.",
      summary: `No closeouts are ready to invoice; ${needsCaptures} still ${
        needsCaptures === 1 ? "needs" : "need"
      } field captures.`,
    };
  }

  return {
    label: "Closeout handoff clear",
    nextStep:
      needsReview > 0
        ? reviewStep
        : "Completed jobs will appear here after proof review.",
    summary: "No completed closeouts are waiting for invoice creation.",
  };
}

function toCustomerPortalLineItem(
  item: NonNullable<Invoice["line_items"]>[number],
): CustomerPortalInvoiceLineItem {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit_amount_cents: item.unit_amount_cents,
    total_cents: item.total_cents,
  };
}

function toCustomerPortalJob(job: Job | undefined) {
  if (!job) {
    return undefined;
  }

  return {
    id: job.id,
    customer_id: job.customer_id,
    location_id: job.location_id,
    status: "completed" as const,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    customer: job.customer
      ? {
          id: job.customer.id,
          name: job.customer.name,
        }
      : undefined,
    location: job.location
      ? {
          id: job.location.id,
          address: job.location.address,
          nickname: job.location.nickname,
        }
      : undefined,
  };
}

export function buildCustomerPortalInvoices(
  invoices: Invoice[],
): CustomerPortalInvoice[] {
  return invoices
    .filter((invoice) => invoice.status === "sent" || invoice.status === "paid")
    .map((invoice) => {
      const status = invoice.status === "paid" ? "paid" : "open";

      return {
        id: invoice.id,
        job_id: invoice.job_id,
        status,
        currency: invoice.currency,
        total_cents: invoice.total_cents,
        balance_cents:
          status === "paid" ? 0 : getInvoiceBalanceCents(invoice),
        due_date: invoice.due_date,
        payment_url: status === "open" ? invoice.payment_url : null,
        paid_at: status === "paid" ? latestSuccessfulPaidAt(invoice) : null,
        created_at: invoice.created_at,
        job: toCustomerPortalJob(invoice.job),
        line_items: (invoice.line_items ?? []).map(toCustomerPortalLineItem),
      };
    });
}

function searchableCustomerPortalInvoiceText(invoice: CustomerPortalInvoice) {
  return [
    invoice.id,
    invoice.status,
    invoice.job?.customer?.name,
    invoice.job?.location?.address,
    invoice.job?.location?.nickname,
    ...invoice.line_items.map((item) => item.description),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterCustomerPortalInvoices(
  invoices: CustomerPortalInvoice[],
  search: string,
  status: CustomerPortalInvoiceStatusFilter = "all",
) {
  const query = search.trim().toLowerCase();

  return invoices
    .filter((invoice) => status === "all" || invoice.status === status)
    .filter(
      (invoice) =>
        !query || searchableCustomerPortalInvoiceText(invoice).includes(query),
    );
}

export function getCustomerPortalInvoiceStatusLabel(
  status: CustomerPortalInvoice["status"],
) {
  return status === "paid" ? "Paid" : "Open";
}

export async function listInvoices() {
  return listInvoiceRecords();
}

export async function createInvoice(input: InvoiceInput) {
  return createInvoiceRecord(validateInvoiceInput(input));
}

export async function markInvoicePaid(id: string) {
  return updateInvoiceStatusRecord(requireNonEmpty(id, "Invoice"), "paid");
}

export async function voidInvoice(id: string) {
  return updateInvoiceStatusRecord(requireNonEmpty(id, "Invoice"), "void");
}

export async function createInvoicePaymentLink(invoice: Invoice) {
  if (!invoice.line_items || invoice.line_items.length === 0) {
    throw new Error("Invoice line items are required");
  }

  return createInvoicePaymentLinkRecord(invoice);
}
