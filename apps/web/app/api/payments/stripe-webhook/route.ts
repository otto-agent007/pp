import {
  findInvoiceRecord,
  updateInvoiceStatusRecord,
  upsertPaymentRecordRecord,
} from "@pest-patrol/api-client";
import { getInvoiceReconciliation } from "@pest-patrol/domain";
import type {
  Invoice,
  PaymentRecord,
  PaymentStatus,
  PaymentWebhookReconciliationResult,
} from "@pest-patrol/types";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "../../_lib/server-auth";

export const runtime = "nodejs";

interface StripeEvent<TObject = StripeObject> {
  id: string;
  type: string;
  data: {
    object: TObject;
  };
}

interface StripeObject {
  id?: string;
  object?: string;
  amount?: number | null;
  amount_received?: number | null;
  amount_total?: number | null;
  created?: number | null;
  currency?: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_intent?: string | null;
  payment_status?: string | null;
  status?: string | null;
}

interface PaymentWebhookPayload {
  amount_cents: number;
  currency: string;
  invoice_id: string;
  paid_at: string | null;
  provider: "stripe";
  provider_payment_id: string;
  status: PaymentStatus;
}

function parseSignatureHeader(header: string) {
  return header.split(",").reduce(
    (result, part) => {
      const [key, value] = part.split("=");

      if (key === "t") {
        result.timestamp = value;
      }

      if (key === "v1" && value) {
        result.signatures.push(value);
      }

      return result;
    },
    { signatures: [] as string[], timestamp: "" },
  );
}

function secureCompareHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  webhookSecret: string,
) {
  if (!signatureHeader) {
    return false;
  }

  const { signatures, timestamp } = parseSignatureHeader(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return signatures.some((signature) => secureCompareHex(signature, expected));
}

function getStripeObjectTimestamp(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function getStripeEventPaymentStatus(
  event: StripeEvent,
  object: StripeObject,
): PaymentStatus | null {
  if (event.type === "checkout.session.async_payment_failed") {
    return "failed";
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    return "succeeded";
  }

  if (event.type === "checkout.session.completed") {
    return object.payment_status === "paid" ||
      object.payment_status === "no_payment_required"
      ? "succeeded"
      : "pending";
  }

  return null;
}

function getStripeEventAmount(object: StripeObject) {
  return object.amount_total ?? object.amount_received ?? object.amount ?? 0;
}

function buildPaymentPayload(
  event: StripeEvent,
): PaymentWebhookPayload | null {
  const object = event.data.object;
  const invoiceId = object.metadata?.invoice_id;
  const providerPaymentId = object.id;
  const status = getStripeEventPaymentStatus(event, object);
  const amountCents = getStripeEventAmount(object);

  if (!invoiceId || !providerPaymentId || !status || amountCents <= 0) {
    return null;
  }

  return {
    amount_cents: amountCents,
    currency: object.currency ?? "usd",
    invoice_id: invoiceId,
    paid_at:
      status === "succeeded" ? getStripeObjectTimestamp(object.created) : null,
    provider: "stripe",
    provider_payment_id: providerPaymentId,
    status,
  };
}

function mergePaymentIntoInvoice(
  invoice: Invoice,
  payment: PaymentRecord,
): Invoice {
  const payments = invoice.payments ?? [];
  const mergedPayments = [
    payment,
    ...payments.filter(
      (current) =>
        current.id !== payment.id &&
        !(
          current.provider === payment.provider &&
          current.provider_payment_id === payment.provider_payment_id
        ),
    ),
  ];

  return {
    ...invoice,
    payments: mergedPayments,
  };
}

async function reconcileStripeEvent(
  event: StripeEvent,
): Promise<PaymentWebhookReconciliationResult> {
  const payload = buildPaymentPayload(event);

  if (!payload) {
    return {
      invoice_id: null,
      message: "Stripe event ignored because payment metadata is incomplete",
      payment_id: null,
      status: "ignored",
    };
  }

  const client = createServiceRoleSupabaseClient();
  const invoice = await findInvoiceRecord(payload.invoice_id, client);

  if (!invoice) {
    return {
      invoice_id: payload.invoice_id,
      message: "Stripe event ignored because invoice was not found",
      payment_id: null,
      status: "ignored",
    };
  }

  const payment = await upsertPaymentRecordRecord(payload, client);
  const updatedInvoice = mergePaymentIntoInvoice(invoice, payment);
  const reconciliation = getInvoiceReconciliation(updatedInvoice);

  if (
    payload.status === "succeeded" &&
    reconciliation.balanceCents === 0 &&
    invoice.status !== "paid" &&
    invoice.status !== "void"
  ) {
    await updateInvoiceStatusRecord(invoice.id, "paid", client);
  }

  return {
    invoice_id: payload.invoice_id,
    message: "Stripe payment event processed",
    payment_id: payment.id,
    status: "processed",
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 500 },
    );
  }

  const payload = await request.text();

  if (
    !verifyStripeSignature(
      payload,
      request.headers.get("stripe-signature"),
      webhookSecret,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature" },
      { status: 400 },
    );
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe webhook payload" },
      { status: 400 },
    );
  }

  const result = await reconcileStripeEvent(event);

  return NextResponse.json(result, {
    status: result.status === "processed" ? 200 : 202,
  });
}
