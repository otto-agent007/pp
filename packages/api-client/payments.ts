import type {
  Invoice,
  InvoiceInput,
  InvoiceLineItemInput,
  InvoicePaymentLinkResult,
  InvoiceStatus,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type InvoiceRow = Invoice;
type PaymentsClient = typeof supabase | AuthSupabaseClient;

const invoiceSelect =
  "*, job:jobs(*, customer:customers(*), location:locations(*)), customer:customers(*), line_items:invoice_line_items(*), payments(*)";
const customerPortalInvoiceSelect =
  "*, job:jobs!inner(*, customer:customers(*), location:locations(*)), line_items:invoice_line_items(*), payments(*)";

function lineItemTotal(item: InvoiceLineItemInput) {
  return Math.round(item.quantity * item.unit_amount_cents);
}

function invoiceTotal(lineItems: InvoiceLineItemInput[]) {
  return lineItems.reduce((total, item) => total + lineItemTotal(item), 0);
}

function toInvoiceRow(input: InvoiceInput) {
  const totalCents = invoiceTotal(input.line_items);

  return {
    job_id: input.job_id,
    customer_id: input.customer_id,
    status: "draft",
    currency: input.currency ?? "usd",
    subtotal_cents: totalCents,
    total_cents: totalCents,
    due_date: input.due_date ?? null,
    notes: input.notes ?? null,
  };
}

function toLineItemRows(invoiceId: string, lineItems: InvoiceLineItemInput[]) {
  return lineItems.map((item) => ({
    invoice_id: invoiceId,
    description: item.description,
    quantity: item.quantity,
    unit_amount_cents: item.unit_amount_cents,
    total_cents: lineItemTotal(item),
  }));
}

async function getInvoiceRecord(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceSelect)
    .eq("id", id)
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

export async function listInvoiceRecords() {
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Invoice[];
}

export async function listCustomerPortalInvoiceRecords(
  customerId: string,
  client: PaymentsClient = supabase,
) {
  const { data, error } = await client
    .from("invoices")
    .select(customerPortalInvoiceSelect)
    .eq("customer_id", customerId)
    .in("status", ["sent", "paid"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as Invoice[];
}

export async function createInvoiceRecord(input: InvoiceInput) {
  const { data, error } = await supabase
    .from("invoices")
    .insert(toInvoiceRow(input))
    .select("*")
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  const invoice = data as Invoice;
  const { error: lineItemsError } = await supabase
    .from("invoice_line_items")
    .insert(toLineItemRows(invoice.id, input.line_items));

  if (lineItemsError) {
    throw lineItemsError;
  }

  return getInvoiceRecord(invoice.id);
}

export async function updateInvoiceStatusRecord(
  id: string,
  status: InvoiceStatus,
) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .select(invoiceSelect)
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

export async function saveInvoicePaymentLinkRecord(
  id: string,
  link: InvoicePaymentLinkResult,
) {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      payment_url: link.payment_url,
      stripe_payment_link_id: link.provider_payment_link_id,
    })
    .eq("id", id)
    .select(invoiceSelect)
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

export async function createInvoicePaymentLinkRecord(invoice: Invoice) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch("/api/payments/payment-link", {
    body: JSON.stringify({ invoice }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create payment link");
  }

  const link = (await response.json()) as InvoicePaymentLinkResult;

  return saveInvoicePaymentLinkRecord(invoice.id, link);
}
