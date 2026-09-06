import {
  listCustomerPortalFormSubmissionRecords,
  listCustomerPortalJobRecords,
  listCustomerPortalMediaRecords,
} from "@pest-patrol/api-client";
import { buildCustomerPortalCloseouts } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import { checkApiRateLimit, getClientIpFromRequest, rateLimitResponse } from "../../../_lib/rate-limit";
import {
  hashPortalSecret,
  readPortalSessionCookie,
  validatePortalSession,
} from "../../_lib/portal-session";
import { recordCustomerPortalOpenedEvent } from "../../_lib/access-token-events";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const sessionContext = readPortalSessionCookie(request);
  const clientIp = getClientIpFromRequest(request);
  const sessionHash = sessionContext
    ? hashPortalSecret(sessionContext)
    : "no-session";
  const ipSuffix = clientIp ? `:${clientIp}` : "";

  if (
    await checkApiRateLimit({
      id: "portal-session-exchange",
      request,
      key: `portal-session-exchange:${customerId}:${sessionHash}${ipSuffix}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const { error: accessError, session } = await validatePortalSession(
      client,
      customerId,
      request,
    );

    if (accessError) {
      return accessError;
    }

    if (session) {
      await recordCustomerPortalOpenedEvent(client, {
        customerId: session.customer_id,
        tokenId: session.token_id,
      });
    }

    const [jobs, formSubmissions, media] = await Promise.all([
      listCustomerPortalJobRecords(customerId, client),
      listCustomerPortalFormSubmissionRecords(customerId, client),
      listCustomerPortalMediaRecords(customerId, client),
    ]);

    return NextResponse.json({
      closeouts: buildCustomerPortalCloseouts({
        jobs,
        formSubmissions,
        media,
      }),
    });
  } catch (error) {
    console.error("Customer portal closeouts load failed", error);

    return NextResponse.json(
      { error: "Unable to load customer portal" },
      { status: 500 },
    );
  }
}
