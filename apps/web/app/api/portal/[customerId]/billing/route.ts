import { listCustomerPortalInvoiceRecords } from "@pest-patrol/api-client";
import { buildCustomerPortalInvoices } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  checkApiRateLimit,
  getClientIpFromRequest,
  rateLimitResponse,
} from "../../../_lib/rate-limit";
import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import {
  hashPortalSecret,
  readPortalSessionCookie,
  validatePortalSession,
} from "../../_lib/portal-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const sessionToken = readPortalSessionCookie(request);
  const clientIp = getClientIpFromRequest(request);
  const sessionHash = sessionToken
    ? hashPortalSecret(sessionToken)
    : "no-session";
  const ipSuffix = clientIp ? `:${clientIp}` : "";

  // Billing is the most sensitive customer-visible portal read and it was the
  // only one of the three portal reads with no limit, so an expired or
  // cancelled link could be replayed against it as fast as the network allows.
  // Keyed exactly like portal-closeouts so an unauthenticated caller cannot
  // spread attempts across a dimension it controls.
  if (
    await checkApiRateLimit({
      id: "portal-billing",
      request,
      key: `portal-billing:${customerId}:${sessionHash}${ipSuffix}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const { error: accessError } = await validatePortalSession(
      client,
      customerId,
      request,
    );

    if (accessError) {
      return accessError;
    }

    const invoices = await listCustomerPortalInvoiceRecords(customerId, client);

    return NextResponse.json({
      invoices: buildCustomerPortalInvoices(invoices),
    });
  } catch (error) {
    console.error("Customer portal billing load failed", error);

    return NextResponse.json(
      { error: "Unable to load portal billing" },
      { status: 500 },
    );
  }
}
