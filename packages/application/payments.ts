import type { PaymentsPort } from "./ports";
import type { Invoice, InvoiceInput } from "@pest-patrol/types";
import { requireNonEmpty, validateInvoiceInput } from "@pest-patrol/domain";

export function getStripePaymentProviderStatus(port: PaymentsPort) {
  return port.getStripePaymentProviderStatusRecord();
}

export async function listInvoices(port: PaymentsPort) {
  return port.listInvoiceRecords();
}

export async function createInvoice(port: PaymentsPort, input: InvoiceInput) {
  return port.createInvoiceRecord(validateInvoiceInput(input));
}

export async function markInvoicePaid(port: PaymentsPort, id: string) {
  return port.updateInvoiceStatusRecord(requireNonEmpty(id, "Invoice"), "paid");
}

export async function voidInvoice(port: PaymentsPort, id: string) {
  return port.updateInvoiceStatusRecord(requireNonEmpty(id, "Invoice"), "void");
}

export async function createInvoicePaymentLink(
  port: PaymentsPort,
  invoice: Invoice,
) {
  if (!invoice.line_items || invoice.line_items.length === 0) {
    throw new Error("Invoice line items are required");
  }

  return port.createInvoicePaymentLinkRecord({
    invoice_id: invoice.id,
  });
}
