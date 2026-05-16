import type { Customer, Invoice, Job } from "@pest-patrol/types";

import {
  getInvoiceHandoffHref,
  getInvoiceReconciliation,
  type InvoiceReconciliationStatus,
} from "./payments";

export type CustomerLedgerEntryType =
  | "completed_service"
  | "draft_invoice"
  | "needs_review_payment"
  | "paid_invoice"
  | "partial_payment"
  | "scheduled_service"
  | "sent_invoice"
  | "void_invoice";

export interface CustomerLedgerEntry {
  amount_cents: number | null;
  balance_cents: number | null;
  customer_id: string;
  date: string;
  detail: string;
  id: string;
  invoice_id: string | null;
  job_id: string | null;
  label: string;
  review: boolean;
  type: CustomerLedgerEntryType;
}

export interface CustomerLedgerInput {
  customer: Customer;
  invoices: Invoice[];
  jobs: Job[];
}

export interface CustomerLedgerSummary {
  latestInvoiceAt: string | null;
  latestServiceAt: string | null;
  openBalanceCents: number;
  paidCents: number;
  reviewCount: number;
}

export interface CustomerPortalHandoffReviewInput {
  hasActivePortalLink: boolean;
  hasContact: boolean;
  ledgerSummary: CustomerLedgerSummary;
  providerConfigured: boolean;
}

export interface CustomerPortalHandoffReview {
  label: string;
  mode_label: "Manual sharing" | "Webhook send available";
  summary: string;
}

export type BillingPortalNextActionId =
  | "create_invoice"
  | "open_customer_ledger"
  | "review_payment"
  | "share_portal";

export interface BillingPortalNextAction {
  href: string;
  id: BillingPortalNextActionId;
  label: string;
  summary: string;
}

export interface BillingPortalNextActionInput {
  hasPortalLink?: boolean;
  invoice?: Invoice | null;
  job: Job;
}

function invoiceType(status: InvoiceReconciliationStatus): CustomerLedgerEntryType {
  if (status === "draft") {
    return "draft_invoice";
  }

  if (status === "partially_paid") {
    return "partial_payment";
  }

  if (status === "manual_paid" || status === "reconciled_paid") {
    return "paid_invoice";
  }

  if (status === "needs_review") {
    return "needs_review_payment";
  }

  if (status === "void") {
    return "void_invoice";
  }

  return "sent_invoice";
}

function invoiceLabel(type: CustomerLedgerEntryType) {
  const labels: Record<CustomerLedgerEntryType, string> = {
    completed_service: "Service completed",
    draft_invoice: "Draft invoice",
    needs_review_payment: "Payment needs review",
    paid_invoice: "Invoice paid",
    partial_payment: "Partial payment",
    scheduled_service: "Service scheduled",
    sent_invoice: "Invoice sent",
    void_invoice: "Invoice voided",
  };

  return labels[type];
}

function serviceDetail(job: Job) {
  return job.location?.nickname ?? job.location?.address ?? job.service_notes ?? "Service";
}

function invoiceDetail(invoice: Invoice) {
  return invoice.job?.location?.nickname ?? invoice.job?.location?.address ?? invoice.notes ?? "Invoice";
}

export function buildCustomerLedger(input: CustomerLedgerInput): CustomerLedgerEntry[] {
  const jobEntries = input.jobs
    .filter((job) => job.customer_id === input.customer.id)
    .filter((job) => job.status === "scheduled" || job.status === "completed")
    .map((job): CustomerLedgerEntry => {
      const type =
        job.status === "completed" ? "completed_service" : "scheduled_service";

      return {
        amount_cents: null,
        balance_cents: null,
        customer_id: input.customer.id,
        date: job.scheduled_start,
        detail: serviceDetail(job),
        id: `job-${job.id}`,
        invoice_id: null,
        job_id: job.id,
        label: invoiceLabel(type),
        review: false,
        type,
      };
    });
  const invoiceEntries = input.invoices
    .filter((invoice) => invoice.customer_id === input.customer.id)
    .map((invoice): CustomerLedgerEntry => {
      const reconciliation = getInvoiceReconciliation(invoice);
      const type = invoiceType(reconciliation.status);

      return {
        amount_cents: invoice.total_cents,
        balance_cents: reconciliation.balanceCents,
        customer_id: input.customer.id,
        date: reconciliation.latestPaidAt ?? invoice.created_at,
        detail: invoiceDetail(invoice),
        id: `invoice-${invoice.id}`,
        invoice_id: invoice.id,
        job_id: invoice.job_id,
        label: invoiceLabel(type),
        review: reconciliation.needsReview,
        type,
      };
    });

  return [...jobEntries, ...invoiceEntries].sort(
    (left, right) => Date.parse(right.date) - Date.parse(left.date),
  );
}

export function getCustomerLedgerSummary(
  entries: CustomerLedgerEntry[],
): CustomerLedgerSummary {
  return entries.reduce<CustomerLedgerSummary>(
    (summary, entry) => {
      if (entry.type === "completed_service" || entry.type === "scheduled_service") {
        summary.latestServiceAt =
          !summary.latestServiceAt || Date.parse(entry.date) > Date.parse(summary.latestServiceAt)
            ? entry.date
            : summary.latestServiceAt;
      }

      if (entry.invoice_id) {
        summary.latestInvoiceAt =
          !summary.latestInvoiceAt || Date.parse(entry.date) > Date.parse(summary.latestInvoiceAt)
            ? entry.date
            : summary.latestInvoiceAt;
        summary.openBalanceCents += entry.balance_cents ?? 0;
      }

      if (entry.type === "partial_payment") {
        summary.paidCents += Math.max(
          (entry.amount_cents ?? 0) - (entry.balance_cents ?? 0),
          0,
        );
      }

      if (entry.type === "paid_invoice") {
        summary.paidCents += entry.amount_cents ?? 0;
      }

      if (entry.review) {
        summary.reviewCount += 1;
      }

      return summary;
    },
    {
      latestInvoiceAt: null,
      latestServiceAt: null,
      openBalanceCents: 0,
      paidCents: 0,
      reviewCount: 0,
    },
  );
}

export function getCustomerPortalHandoffReview(
  input: CustomerPortalHandoffReviewInput,
): CustomerPortalHandoffReview {
  const missingContact = !input.hasContact;
  const missingServiceProof = !input.ledgerSummary.latestServiceAt;
  const needsAccountReview = input.ledgerSummary.reviewCount > 0;
  const mode_label = input.providerConfigured
    ? "Webhook send available"
    : "Manual sharing";

  if (missingContact || missingServiceProof) {
    return {
      label: "Review before portal handoff",
      mode_label,
      summary: [
        missingContact ? "Add customer contact" : null,
        missingServiceProof ? "finish service proof" : null,
      ]
        .filter(Boolean)
        .join(" and ") + " before sharing.",
    };
  }

  if (needsAccountReview) {
    return {
      label: "Review account before sharing",
      mode_label,
      summary: "Payment or invoice activity needs office review before portal handoff.",
    };
  }

  if (!input.hasActivePortalLink) {
    return {
      label: "Generate portal link",
      mode_label,
      summary: "Service proof is ready; generate a portal link when the account is ready to share.",
    };
  }

  return {
    label: "Portal handoff ready",
    mode_label,
    summary:
      input.ledgerSummary.openBalanceCents > 0
        ? "Service proof and billing context are ready to share; open balance is visible in the customer portal."
        : "Service proof and billing context are ready to share.",
  };
}

export function buildBillingPortalNextActions(
  input: BillingPortalNextActionInput,
): BillingPortalNextAction[] {
  const actions: BillingPortalNextAction[] = [];
  const customerHref = `/customers?customer_id=${encodeURIComponent(input.job.customer_id)}`;

  if (!input.invoice) {
    actions.push({
      href: getInvoiceHandoffHref(input.job.id),
      id: "create_invoice",
      label: "Create invoice",
      summary: "Create billing before sharing a payment-ready portal link.",
    });
  } else {
    const reconciliation = getInvoiceReconciliation(input.invoice);
    actions.push({
      href: `/payments?invoice_id=${encodeURIComponent(input.invoice.id)}`,
      id: "review_payment",
      label: reconciliation.needsReview ? "Review payment" : "Open invoice",
      summary: reconciliation.needsReview
        ? reconciliation.reviewLabel ?? "Payment activity needs review."
        : reconciliation.label,
    });

    if (!input.hasPortalLink && input.invoice.status !== "draft") {
      actions.push({
        href: customerHref,
        id: "share_portal",
        label: "Share portal",
        summary: "Generate a customer portal link for service and billing follow-up.",
      });
    }
  }

  actions.push({
    href: customerHref,
    id: "open_customer_ledger",
    label: "Open customer ledger",
    summary: "Review service and billing history for this account.",
  });

  return actions;
}
