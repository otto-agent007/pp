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

import { requireSameOriginForUnsafeMethod } from "../../../_lib/origin-guard";
import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import {
  hashPortalSecret,
  readPortalSessionCookie,
  validatePortalSession,
} from "../../_lib/portal-session";
import { checkApiRateLimit, rateLimitResponse } from "../../../_lib/rate-limit";

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
  const originError = requireSameOriginForUnsafeMethod(request);

  if (originError) {
    return originError;
  }

  const { customerId } = await params;
  const body = await requestBody(request);

  try {
    const input = validateCustomerPortalUpgradeIntentInput({
      plan_id: body.plan_id as CustomerPortalUpgradePlanId,
    });
    const sessionToken = readPortalSessionCookie(request);
    const sessionContext = sessionToken
      ? hashPortalSecret(sessionToken)
      : "no-session";

    if (
      await checkApiRateLimit({
        id: "portal-upgrade-intent",
        request,
        key: `portal-upgrade-intent:${customerId}:${sessionContext}:${input.plan_id}`,
      })
    ) {
      return rateLimitResponse();
    }

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
    console.error("Portal upgrade intent request failed", error);

    return NextResponse.json(
      { error: "Unable to request recurring service follow-up" },
      { status: 400 },
    );
  }
}
