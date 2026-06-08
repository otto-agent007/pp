import { listCustomerPortalInvoiceRecords } from "@pest-patrol/api-client";
import { buildCustomerPortalInvoices } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import { validatePortalSession } from "../../_lib/portal-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;

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
    const message =
      error instanceof Error ? error.message : "Unable to load portal billing";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
