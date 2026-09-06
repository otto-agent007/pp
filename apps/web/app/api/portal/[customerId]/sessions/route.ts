import { NextResponse } from "next/server";
import { safeLogError, safeLogInfo, safeLogWarn } from "@pest-patrol/domain";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import {
  checkApiRateLimit,
  getClientIpFromRequest,
  rateLimitResponse,
} from "../../../_lib/rate-limit";
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

interface ClaimedPortalGrant {
  customer_id: string;
  expires_at: string | null;
  id: string;
}

async function readGrant(request: Request) {
  try {
    const body = (await request.json()) as { grant?: unknown } | null;

    return typeof body?.grant === "string" ? body.grant : "";
  } catch {
    return "";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const grant = await readGrant(request);
  const clientIp = getClientIpFromRequest(request);
  const ipSuffix = clientIp ? `:${clientIp}` : "";

  if (
    await checkApiRateLimit({
      id: "portal-session-exchange",
      request,
      key: `portal-session-exchange:${customerId}${ipSuffix}`,
    })
  ) {
    return rateLimitResponse();
  }

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
    const nowIso = new Date().toISOString();

    // Atomically claim the grant: the conditional `status = 'active'` filter
    // means only one concurrent request can flip it to `revoked`, so two
    // simultaneous exchanges of the same grant can never both mint a session.
    const { data: claimed, error: claimError } = await client
      .from("customer_portal_access_tokens")
      .update({ last_used_at: nowIso, status: "revoked" })
      .eq("customer_id", customerId)
      .eq("token_hash", hashPortalSecret(grant.trim()))
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .select("id, customer_id, expires_at")
      .maybeSingle<ClaimedPortalGrant>();

    if (claimError || !claimed) {
      safeLogWarn("portal.session.denied", {
        customer_id: customerId,
        route: "portal/sessions",
        status: "denied",
      });

      return portalSessionDenied();
    }

    const sessionToken = newPortalSecret();
    const expiresAt = portalSessionExpiry(claimed.expires_at);
    const { error: insertError } = await client
      .from("customer_portal_sessions")
      .insert({
        customer_id: claimed.customer_id,
        expires_at: expiresAt,
        session_hash: hashPortalSecret(sessionToken),
        token_id: claimed.id,
      });

    if (insertError) {
      safeLogError("portal.session.create_failed", {
        customer_id: claimed.customer_id,
        route: "portal/sessions",
        token_id: claimed.id,
      });

      return NextResponse.json(
        { error: "Unable to create portal session" },
        { status: 500 },
      );
    }

    await recordCustomerPortalOpenedEvent(client, {
      customerId: claimed.customer_id,
      tokenId: claimed.id,
    });

    safeLogInfo("portal.session.opened", {
      customer_id: claimed.customer_id,
      route: "portal/sessions",
      token_id: claimed.id,
    });

    const response = NextResponse.json({
      redirectTo: `/portal/${encodeURIComponent(customerId)}`,
    });
    setPortalSessionCookie(response, sessionToken, expiresAt);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to exchange portal grant";

    safeLogError("portal.session.exchange_failed", {
      customer_id: customerId,
      route: "portal/sessions",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
