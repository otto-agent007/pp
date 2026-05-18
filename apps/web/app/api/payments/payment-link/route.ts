import type { Invoice } from "@pest-patrol/types";
import { NextResponse } from "next/server";
import { getAdminAccess } from "../../_lib/server-auth";

interface PaymentLinkRequest {
  invoice?: Invoice;
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

export async function POST(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as PaymentLinkRequest;
  const invoice = body.invoice;

  if (!invoice || !invoice.line_items || invoice.line_items.length === 0) {
    return NextResponse.json(
      { error: "Invoice line items are required" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams();
  invoice.line_items
    .slice(0, 20)
    .forEach((item, index) =>
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

  const response = await fetch("https://api.stripe.com/v1/payment_links", {
    body: params,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const stripeBody = (await response.json()) as {
    error?: { message?: string };
    id?: string;
    url?: string;
  };

  if (!response.ok || !stripeBody.id || !stripeBody.url) {
    return NextResponse.json(
      { error: stripeBody.error?.message ?? "Unable to create payment link" },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json({
    provider: "stripe",
    provider_payment_link_id: stripeBody.id,
    payment_url: stripeBody.url,
  });
}
