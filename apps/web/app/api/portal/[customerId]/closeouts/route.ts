import { createHash } from "node:crypto";
import {
  listCustomerPortalFormSubmissionRecords,
  listCustomerPortalJobRecords,
  listCustomerPortalMediaRecords,
} from "@pest-patrol/api-client";
import { buildCustomerPortalCloseouts } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../../_lib/server-auth";
import { recordCustomerPortalOpenedEvent } from "../../_lib/access-token-events";

export const runtime = "nodejs";

interface PortalAccessTokenRow {
  id: string;
  customer_id: string;
  expires_at: string | null;
  status: "active" | "revoked";
}

function hashToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

function accessDenied() {
  return NextResponse.json(
    { error: "Portal access is invalid or expired" },
    { status: 403 },
  );
}

async function validatePortalAccess(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  customerId: string,
  accessToken: string | null,
) {
  if (!accessToken?.trim()) {
    return NextResponse.json(
      { error: "Portal access token is required" },
      { status: 401 },
    );
  }

  const { data, error } = await client
    .from("customer_portal_access_tokens")
    .select("id, customer_id, status, expires_at")
    .eq("customer_id", customerId)
    .eq("token_hash", hashToken(accessToken.trim()))
    .eq("status", "active")
    .maybeSingle<PortalAccessTokenRow>();

  if (error || !data) {
    return accessDenied();
  }

  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) {
    return accessDenied();
  }

  await client
    .from("customer_portal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  await recordCustomerPortalOpenedEvent(client, {
    customerId: data.customer_id,
    tokenId: data.id,
  });

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const accessToken = new URL(request.url).searchParams.get("access_token");

  if (!accessToken?.trim()) {
    return NextResponse.json(
      { error: "Portal access token is required" },
      { status: 401 },
    );
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const accessError = await validatePortalAccess(
      client,
      customerId,
      accessToken,
    );

    if (accessError) {
      return accessError;
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
