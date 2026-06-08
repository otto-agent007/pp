import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import { recordCustomerPortalOpenedEvent } from "../../_lib/access-token-events";
import {
  hashPortalSecret,
  newPortalSecret,
  portalSessionDenied,
  portalSessionExpiry,
  portalSessionRequired,
  setPortalSessionCookie,
} from "../../_lib/portal-session";

export const runtime = "nodejs";

interface PortalGrantRow {
  customer_id: string;
  expires_at: string | null;
  id: string;
  status: "active" | "revoked";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const url = new URL(request.url);
  const grant = url.searchParams.get("grant") ?? "";

  if (!grant.trim()) {
    return portalSessionRequired();
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .select("id, customer_id, expires_at, status")
      .eq("customer_id", customerId)
      .eq("token_hash", hashPortalSecret(grant.trim()))
      .maybeSingle<PortalGrantRow>();

    if (error || !data || data.status !== "active") {
      return portalSessionDenied();
    }

    if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) {
      return portalSessionDenied();
    }

    const sessionToken = newPortalSecret();
    const expiresAt = portalSessionExpiry(data.expires_at);
    const usedAt = new Date().toISOString();
    const { error: insertError } = await client
      .from("customer_portal_sessions")
      .insert({
        customer_id: data.customer_id,
        expires_at: expiresAt,
        session_hash: hashPortalSecret(sessionToken),
        token_id: data.id,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Unable to create portal session" },
        { status: 500 },
      );
    }

    await client
      .from("customer_portal_access_tokens")
      .update({ last_used_at: usedAt, status: "revoked" })
      .eq("id", data.id);
    await recordCustomerPortalOpenedEvent(client, {
      customerId: data.customer_id,
      tokenId: data.id,
    });

    const redirectUrl = new URL(
      `/portal/${encodeURIComponent(customerId)}`,
      request.url,
    );
    const response = NextResponse.redirect(redirectUrl);
    setPortalSessionCookie(response, sessionToken, expiresAt);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to exchange portal grant";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
