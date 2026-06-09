import { findInvoiceRecord } from "@pest-patrol/api-client";
import {
  getStripePaymentProviderReadiness,
  safeLogError,
  safeLogWarn,
} from "@pest-patrol/domain";
import type { Invoice } from "@pest-patrol/types";
import { NextResponse } from "next/server";
import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../_lib/server-auth";
import { checkApiRateLimit, rateLimitResponse } from "../../_lib/rate-limit";

interface PaymentLinkRequest {
  invoice_id?: string;
}

function appendLineItem(
  params: URLSearchParams,
  index: number,
  item: NonNullable<Invoice["line_items"]>[number],
  currency: string,
) {
  params.append(
    `line_items[${index}][price_data][product_data][name]`,
    item.description,
  );
  params.append(
    `line_items[${index}][price_data][product_data][description]`,
    `Invoice ${item.invoice_id}`,
  );
  params.append(`line_items[${index}][price_data][currency]`, currency);
  params.append(
    `line_items[${index}][price_data][unit_amount]`,
    String(item.unit_amount_cents),
  );
  params.append(`line_items[${index}][quantity]`, String(item.quantity));
}

function buildStripePaymentLinkRequest(invoice: Invoice) {
  if (!invoice.line_items || invoice.line_items.length === 0) {
    throw new Error("Invoice line items are required");
  }

  if (invoice.line_items.length > 20) {
    throw new Error("Stripe payment links support at most 20 line items");
  }

  const params = new URLSearchParams();

  invoice.line_items.forEach((item, index) =>
    appendLineItem(params, index, item, invoice.currency),
  );
  params.append("metadata[invoice_id]", invoice.id);
  params.append("metadata[job_id]", invoice.job_id);
  params.append("metadata[customer_id]", invoice.customer_id);
  params.append("payment_intent_data[metadata][invoice_id]", invoice.id);
  params.append("payment_intent_data[metadata][job_id]", invoice.job_id);
  params.append(
    "payment_intent_data[metadata][customer_id]",
    invoice.customer_id,
  );

  return params;
}

function buildStripeIdempotencyKey(invoiceId: string) {
  return `stripe-payment-link:${invoiceId}`;
}

function providerUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Stripe payment links are unavailable",
      manual_fallback: true,
      provider: "stripe",
    },
    { status: 503 },
  );
}

function providerBlockedResponse(message: string, status = 503) {
  return NextResponse.json(
    {
      error: message,
      manual_fallback: true,
      provider: "stripe",
    },
    { status },
  );
}

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess(request);
  const authError = adminAccess.response;

  if (authError) {
    return authError;
  }

  let requestBody: PaymentLinkRequest = {};
  try {
    requestBody = (await request.json()) as PaymentLinkRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid payment link request" },
      { status: 400 },
    );
  }

  const invoiceId = requestBody.invoice_id?.trim();

  if (!invoiceId) {
    return NextResponse.json(
      { error: "Invoice ID is required" },
      { status: 400 },
    );
  }

  if (
    await checkApiRateLimit({
      id: "payment-link-create",
      request,
      key: `payment-link-create:${adminAccess.access.userId}:${invoiceId}`,
    })
  ) {
    return rateLimitResponse();
  }

  const stripeReadiness = getStripePaymentProviderReadiness(process.env);
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (stripeReadiness.readiness_state === "manual_fallback") {
    return providerUnavailableResponse();
  }

  if (stripeReadiness.readiness_state === "live_mode_blocked") {
    safeLogWarn("stripe.payment_link.live_mode_blocked", {
      invoice_id: invoiceId,
      provider: "stripe",
      route: "payments/payment-link",
      stripe_key_mode: stripeReadiness.stripe_key_mode,
    });

    return providerBlockedResponse("Stripe live mode is not approved", 409);
  }

  if (stripeReadiness.readiness_state === "misconfigured" || !stripeSecretKey) {
    safeLogWarn("stripe.payment_link.misconfigured", {
      invoice_id: invoiceId,
      provider: "stripe",
      route: "payments/payment-link",
      stripe_key_mode: stripeReadiness.stripe_key_mode,
    });

    return providerBlockedResponse("Stripe payment links are unavailable");
  }

  const client = createServiceRoleSupabaseClient();
  const invoice = await findInvoiceRecord(invoiceId, client);

  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice was not found" },
      { status: 404 },
    );
  }

  if (invoice.payment_url && invoice.stripe_payment_link_id) {
    return NextResponse.json({
      provider: "stripe",
      provider_payment_link_id: invoice.stripe_payment_link_id,
      payment_url: invoice.payment_url,
      reused: true,
    });
  }

  let params: URLSearchParams;

  try {
    params = buildStripePaymentLinkRequest(invoice);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare payment link",
      },
      { status: 400 },
    );
  }

  const response = await fetch("https://api.stripe.com/v1/payment_links", {
    body: params,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": buildStripeIdempotencyKey(invoice.id),
    },
    method: "POST",
  });

  let stripeBody: {
    error?: { message?: string };
    id?: string;
    url?: string;
  } | null = null;

  try {
    stripeBody = (await response.json()) as {
      error?: { message?: string };
      id?: string;
      url?: string;
    };
  } catch {
    stripeBody = null;
  }

  if (!response.ok || !stripeBody?.id || !stripeBody?.url) {
    safeLogError("stripe.payment_link.provider_failed", {
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      job_id: invoice.job_id,
      provider: "stripe",
      route: "payments/payment-link",
      status: response.status,
    });

    return NextResponse.json(
      { error: "Unable to create payment link" },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json({
    provider: "stripe",
    provider_payment_link_id: stripeBody.id,
    payment_url: stripeBody.url,
  });
}
