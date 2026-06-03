import { createHash } from "node:crypto";
import { createGeneratedNotificationEventRecord } from "@pest-patrol/api-client";
import {
  buildCustomerPortalUpgradeNotificationInput,
  validateCustomerPortalUpgradeIntentInput,
} from "@pest-patrol/domain";
import type {
  CustomerPortalUpgradeIntentRequest,
  CustomerPortalUpgradeIntentResult,
  CustomerPortalUpgradePlanId,
} from "@pest-patrol/types";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";

export const runtime = "nodejs";

interface PortalAccessTokenRow {
  id: string;
  customer_id: string;
  expires_at: string | null;
  status: "active" | "revoked";
}

function hashToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

function accessDenied() {
  return NextResponse.json(
    { error: "Portal access is invalid or expired" },
    { status: 403 },
  );
}

async function validatePortalAccess(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  customerId: string,
  accessToken: string | null,
) {
  if (!accessToken?.trim()) {
    return NextResponse.json(
      { error: "Portal access token is required" },
      { status: 401 },
    );
  }

  const { data, error } = await client
    .from("customer_portal_access_tokens")
    .select("id, customer_id, status, expires_at")
    .eq("customer_id", customerId)
    .eq("token_hash", hashToken(accessToken.trim()))
    .eq("status", "active")
    .maybeSingle<PortalAccessTokenRow>();

  if (error || !data) {
    return accessDenied();
  }

  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) {
    return accessDenied();
  }

  await client
    .from("customer_portal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return null;
}

async function requestBody(request: Request) {
  try {
    return (await request.json()) as Partial<CustomerPortalUpgradeIntentRequest>;
  } catch {
    return {};
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const body = await requestBody(request);
  const accessToken =
    typeof body.access_token === "string" ? body.access_token : "";

  if (!accessToken.trim()) {
    return NextResponse.json(
      { error: "Portal access token is required" },
      { status: 401 },
    );
  }

  try {
    const input = validateCustomerPortalUpgradeIntentInput({
      plan_id: body.plan_id as CustomerPortalUpgradePlanId,
    });
    const client = createServiceRoleSupabaseClient();
    const accessError = await validatePortalAccess(
      client,
      customerId,
      accessToken,
    );

    if (accessError) {
      return accessError;
    }

    const notification = await createGeneratedNotificationEventRecord(
      buildCustomerPortalUpgradeNotificationInput(customerId, input),
      client,
    );
    const result: CustomerPortalUpgradeIntentResult = {
      notification_id: notification?.id ?? null,
      plan_id: input.plan_id,
      status: notification ? "requested" : "already_requested",
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to request recurring service follow-up";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
