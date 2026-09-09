import type {
  Invoice,
  InvoiceInput,
  InvoiceLineItemInput,
  InvoicePaymentLinkInput,
  InvoicePaymentLinkResult,
  InvoiceStatus,
  PaymentProvider,
  PaymentRecord,
  PaymentStatus,
  StripePaymentProviderStatus,
} from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

type InvoiceRow = Invoice;
type PaymentsClient = SupabaseProviderClient;
type PaymentRecordInput = {
  amount_cents: number;
  currency: string;
  invoice_id: string;
  paid_at: string | null;
  provider: PaymentProvider;
  provider_payment_id: string;
  status: PaymentStatus;
};

const invoiceSelect =
  "*, job:jobs(*, customer:customers(*), location:locations(*)), customer:customers(*), line_items:invoice_line_items(*), payments(*)";
const customerPortalInvoiceSelect =
  "*, job:jobs!inner(*, customer:customers(*), location:locations(*)), line_items:invoice_line_items(*), payments(*)";
const paymentSelect = "*, invoice:invoices(*)";

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

export async function getInvoiceRecord(
  id: string,
  client: PaymentsClient,
) {
  const { data, error } = await client
    .from("invoices")
    .select(invoiceSelect)
    .eq("id", id)
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  return data as Invoice;
}

export async function findInvoiceRecord(
  id: string,
  client: PaymentsClient,
) {
  try {
    return await getInvoiceRecord(id, client);
  } catch {
    return null;
  }
}

export async function listInvoiceRecords(client: PaymentsClient) {
  const { data, error } = await client
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
  client: PaymentsClient,
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

export async function createInvoiceRecord(
  input: InvoiceInput,
  client: PaymentsClient,
) {
  const { data, error } = await client
    .from("invoices")
    .insert(toInvoiceRow(input))
    .select("*")
    .single<InvoiceRow>();

  if (error) {
    throw error;
  }

  const invoice = data as Invoice;
  const { error: lineItemsError } = await client
    .from("invoice_line_items")
    .insert(toLineItemRows(invoice.id, input.line_items));

  if (lineItemsError) {
    throw lineItemsError;
  }

  return getInvoiceRecord(invoice.id, client);
}

export async function updateInvoiceStatusRecord(
  id: string,
  status: InvoiceStatus,
  client: PaymentsClient,
) {
  const { data, error } = await client
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

async function getPaymentRecordByProviderPaymentIdRecord(
  provider: PaymentProvider,
  providerPaymentId: string,
  client: PaymentsClient,
) {
  const { data, error } = await client
    .from("payments")
    .select(paymentSelect)
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .single<PaymentRecord>();

  if (error) {
    return null;
  }

  return data;
}

export async function upsertPaymentRecordRecord(
  input: PaymentRecordInput,
  client: PaymentsClient,
) {
  const existing = await getPaymentRecordByProviderPaymentIdRecord(
    input.provider,
    input.provider_payment_id,
    client,
  );
  const row = {
    amount_cents: input.amount_cents,
    currency: input.currency,
    invoice_id: input.invoice_id,
    paid_at: input.paid_at,
    provider: input.provider,
    provider_payment_id: input.provider_payment_id,
    status: input.status,
  };

  if (existing) {
    const { data, error } = await client
      .from("payments")
      .update(row)
      .eq("id", existing.id)
      .select(paymentSelect)
      .single<PaymentRecord>();

    if (error) {
      throw error;
    }

    return data as PaymentRecord;
  }

  const { data, error } = await client
    .from("payments")
    .insert(row)
    .select(paymentSelect)
    .single<PaymentRecord>();

  if (error) {
    throw error;
  }

  return data as PaymentRecord;
}

export async function saveInvoicePaymentLinkRecord(
  id: string,
  link: InvoicePaymentLinkResult,
  client: PaymentsClient,
) {
  const { data, error } = await client
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

export async function createInvoicePaymentLinkRecord(
  input: InvoicePaymentLinkInput,
  client: PaymentsClient,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const { data } = await client.auth.getSession();

  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch("/api/payments/payment-link", {
    body: JSON.stringify(input),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create payment link");
  }

  const link = (await response.json()) as InvoicePaymentLinkResult;

  return saveInvoicePaymentLinkRecord(input.invoice_id, link, client);
}

export async function getStripePaymentProviderStatusRecord(
  client: PaymentsClient,
) {
  const { data } = await client.auth.getSession();
  const headers: Record<string, string> = {};

  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch("/api/payments/provider-status", {
    headers,
  });

  if (!response.ok) {
    throw new Error("Unable to load payment provider status");
  }

  return (await response.json()) as StripePaymentProviderStatus;
}
