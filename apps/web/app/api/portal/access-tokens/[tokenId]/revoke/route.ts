import { validateCustomerPortalAccessTokenId } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../../_lib/server-auth";
import { recordCustomerPortalAccessTokenEvent } from "../../../_lib/access-token-events";

export const runtime = "nodejs";

function tokenSummary(token: {
  created_at: string;
  customer_id: string;
  expires_at: string | null;
  id: string;
  last_used_at: string | null;
  status: "active" | "revoked";
  updated_at: string;
}) {
  return {
    id: token.id,
    customer_id: token.customer_id,
    status: token.status,
    expires_at: token.expires_at,
    last_used_at: token.last_used_at,
    created_at: token.created_at,
    updated_at: token.updated_at,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const auth = await getAdminAccess(request);

  if (auth.response) {
    return auth.response;
  }
  const access = auth.access;

  try {
    const { tokenId } = await params;
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .update({ status: "revoked" })
      .eq("id", validateCustomerPortalAccessTokenId(tokenId))
      .select(
        "id, customer_id, status, expires_at, last_used_at, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Unable to revoke portal access token" },
        { status: 400 },
      );
    }

    await recordCustomerPortalAccessTokenEvent(client, {
      actorProfileId: access.userId,
      customerId: data.customer_id,
      kind: "revoked",
      tokenId: data.id,
    });

    return NextResponse.json(tokenSummary(data));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to revoke portal access token";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
