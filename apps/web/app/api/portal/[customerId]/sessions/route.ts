import { NextResponse } from "next/server";
import { safeLogError, safeLogInfo, safeLogWarn } from "@pest-patrol/domain";

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
    safeLogWarn("portal.session.grant_required", {
      customer_id: customerId,
      route: "portal/sessions",
      status: "denied",
    });

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
      safeLogWarn("portal.session.denied", {
        customer_id: customerId,
        route: "portal/sessions",
        status: "denied",
      });

      return portalSessionDenied();
    }

    if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) {
      safeLogWarn("portal.session.expired", {
        customer_id: data.customer_id,
        route: "portal/sessions",
        status: "denied",
        token_id: data.id,
      });

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
      safeLogError("portal.session.create_failed", {
        customer_id: data.customer_id,
        route: "portal/sessions",
        token_id: data.id,
      });

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

    safeLogInfo("portal.session.opened", {
      customer_id: data.customer_id,
      route: "portal/sessions",
      token_id: data.id,
    });

    const redirectUrl = new URL(
      `/portal/${encodeURIComponent(customerId)}`,
      request.url,
    );
    const response = NextResponse.redirect(redirectUrl);
    setPortalSessionCookie(response, sessionToken, expiresAt);

    return response;
  } catch (error) {
    safeLogError("portal.session.exchange_failed", {
      customer_id: customerId,
      error: error instanceof Error ? error.message : String(error),
      route: "portal/sessions",
    });

    return NextResponse.json(
      { error: "Unable to exchange portal grant" },
      { status: 500 },
    );
  }
}
