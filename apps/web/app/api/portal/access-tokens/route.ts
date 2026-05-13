import { randomBytes, createHash } from "node:crypto";
import {
  validateCustomerPortalAccessInput,
  validateCustomerPortalCustomerId,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../_lib/server-auth";
import { recordCustomerPortalAccessTokenEvent } from "../_lib/access-token-events";

export const runtime = "nodejs";

function newPortalToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

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
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
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
  const access = auth.access;

  try {
    const input = validateCustomerPortalAccessInput(await request.json());
    const accessToken = newPortalToken();
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .insert({
        created_by: access.userId,
        customer_id: input.customer_id,
        expires_at: input.expires_at,
        token_hash: hashToken(accessToken),
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
      actorProfileId: access.userId,
      customerId: data.customer_id,
      kind: "generated",
      tokenId: data.id,
    });

    const portalUrl = new URL(`/portal/${input.customer_id}`, request.url);
    portalUrl.searchParams.set("access_token", accessToken);

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
