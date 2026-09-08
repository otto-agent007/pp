import {
  createInvoicePaymentLinkRecord,
  createInvoiceRecord,
  getStripePaymentProviderStatusRecord,
  listInvoiceRecords,
  updateInvoiceStatusRecord,
} from "@pest-patrol/api-client";
import type { Invoice, InvoiceInput } from "@pest-patrol/types";
import { requireNonEmpty, validateInvoiceInput } from "@pest-patrol/domain";

export function getStripePaymentProviderStatus() {
  return getStripePaymentProviderStatusRecord();
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

  return createInvoicePaymentLinkRecord({
    invoice_id: invoice.id,
  });
}
