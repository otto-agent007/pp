import {
  listCustomerPortalFormSubmissionRecords,
  listCustomerPortalJobRecords,
  listCustomerPortalMediaRecords,
} from "@pest-patrol/api-client";
import { buildCustomerPortalCloseouts } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import { recordCustomerPortalOpenedEvent } from "../../_lib/access-token-events";
import { validatePortalSession } from "../../_lib/portal-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;

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
    const message =
      error instanceof Error ? error.message : "Unable to load customer portal";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
