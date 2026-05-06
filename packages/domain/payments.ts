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

export interface InvoiceSummary {
  draftCount: number;
  openCents: number;
  paidCents: number;
  sentCount: number;
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

function latestSuccessfulPaidAt(invoice: Invoice) {
  return (
    invoice.payments
      ?.filter((payment) => payment.status === "succeeded" && payment.paid_at)
      .map((payment) => payment.paid_at as string)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
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
