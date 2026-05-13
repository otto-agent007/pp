import type { CustomerPortalProviderStatus } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import { requireAdminAccess } from "../../../_lib/server-auth";

export async function GET(request: Request) {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const webhookConfigured = Boolean(process.env.PORTAL_DELIVERY_WEBHOOK_URL);
  const status: CustomerPortalProviderStatus = {
    provider: webhookConfigured ? "webhook" : "manual",
    webhook_configured: webhookConfigured,
    webhook_secret_configured: Boolean(process.env.PORTAL_DELIVERY_WEBHOOK_SECRET),
  };

  return NextResponse.json(status);
}
