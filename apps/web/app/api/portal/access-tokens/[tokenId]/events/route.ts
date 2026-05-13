import { validateCustomerPortalAccessTokenId } from "@pest-patrol/domain";
import type { CustomerPortalAccessEventKind } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../../_lib/server-auth";

export const runtime = "nodejs";

function eventSummary(event: {
  customer_id: string;
  id: string;
  kind: CustomerPortalAccessEventKind;
  occurred_at: string;
  token_id: string;
}) {
  return {
    id: event.id,
    token_id: event.token_id,
    customer_id: event.customer_id,
    kind: event.kind,
    occurred_at: event.occurred_at,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const { tokenId } = await params;
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_token_events")
      .select("id, token_id, customer_id, kind, occurred_at")
      .eq("token_id", validateCustomerPortalAccessTokenId(tokenId))
      .order("occurred_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Unable to load portal access history" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      events: (data ?? []).map(eventSummary),
      truncated_before: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load portal access history";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
