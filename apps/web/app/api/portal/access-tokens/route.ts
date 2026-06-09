import {
  validateCustomerPortalAccessInput,
  validateCustomerPortalCustomerId,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../_lib/server-auth";
import { checkApiRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { recordCustomerPortalAccessTokenEvent } from "../_lib/access-token-events";
import { hashPortalSecret, newPortalSecret } from "../_lib/portal-session";

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

export async function GET(request: Request) {
  const auth = await getAdminAccess(request);

  if (auth.response) {
    return auth.response;
  }

  if (
    await checkApiRateLimit({
      id: "portal-access-token-create",
      request,
      key: `portal-access-token-create:${auth.access.userId}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
    const customerId = validateCustomerPortalCustomerId(
      new URL(request.url).searchParams.get("customer_id") ?? "",
    );
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .select(
        "id, customer_id, status, expires_at, last_used_at, created_at, updated_at",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Unable to load portal access tokens" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      tokens: (data ?? []).map(tokenSummary),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load portal access tokens";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await getAdminAccess(request);

  if (auth.response) {
    return auth.response;
  }

  let input:
    | {
        customer_id: string;
        expires_at?: string | null;
      }
    | null = null;

  try {
    input = validateCustomerPortalAccessInput(await request.json());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create portal access token";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    await checkApiRateLimit({
      id: "portal-access-token-create",
      request,
      key: `portal-access-token-create:${auth.access.userId}:${input.customer_id}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
    const accessToken = newPortalSecret();
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .insert({
        created_by: auth.access.userId,
        customer_id: input.customer_id,
        expires_at: input.expires_at,
        token_hash: hashPortalSecret(accessToken),
      })
      .select(
        "id, customer_id, status, expires_at, last_used_at, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Unable to create portal access token" },
        { status: 400 },
      );
    }

    await recordCustomerPortalAccessTokenEvent(client, {
      actorProfileId: auth.access.userId,
      customerId: data.customer_id,
      kind: "generated",
      tokenId: data.id,
    });

    const portalUrl = new URL(`/portal/${input.customer_id}`, request.url);
    portalUrl.searchParams.set("grant", accessToken);

    return NextResponse.json({
      customer_id: input.customer_id,
      access_token: accessToken,
      expires_at: input.expires_at,
      token_id: data.id,
      portal_url: portalUrl.toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create portal access token";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
