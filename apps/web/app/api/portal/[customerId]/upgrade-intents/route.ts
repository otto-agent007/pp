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
import { validatePortalSession } from "../../_lib/portal-session";

export const runtime = "nodejs";

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

  try {
    const input = validateCustomerPortalUpgradeIntentInput({
      plan_id: body.plan_id as CustomerPortalUpgradePlanId,
    });
    const client = createServiceRoleSupabaseClient();
    const { error: accessError } = await validatePortalSession(
      client,
      customerId,
      request,
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
