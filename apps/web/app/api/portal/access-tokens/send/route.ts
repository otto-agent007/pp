import { createHash } from "node:crypto";
import {
  validateCustomerPortalSendInput,
  validateCustomerPortalAccessToken,
} from "@pest-patrol/domain";
import type { CustomerPortalSendProviderPayload } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../_lib/server-auth";
import { recordCustomerPortalAccessTokenEvent } from "../../_lib/access-token-events";

export const runtime = "nodejs";

type PortalTokenSendRecord = {
  customer: {
    email: string | null;
    id: string;
    name: string;
    phone: string | null;
  } | null;
  customer_id: string;
  expires_at: string | null;
  id: string;
  status: "active" | "revoked";
  token_hash: string;
};

function hashToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

function validatePortalUrl(input: {
  customerId: string;
  portalUrl: string;
  requestUrl: string;
}) {
  const requestUrl = new URL(input.requestUrl);
  let portalUrl: URL;

  try {
    portalUrl = new URL(input.portalUrl);
  } catch {
    throw new Error("Portal URL is invalid");
  }

  if (portalUrl.origin !== requestUrl.origin) {
    throw new Error("Portal URL does not match this app");
  }

  if (portalUrl.pathname !== `/portal/${input.customerId}`) {
    throw new Error("Portal URL does not match this customer");
  }

  const accessToken = validateCustomerPortalAccessToken(
    portalUrl.searchParams.get("access_token") ?? "",
  );

  return {
    accessToken,
    portalUrl: portalUrl.toString(),
  };
}

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
}

function errorStatus(message: string) {
  if (message === "Portal delivery provider is not configured") {
    return 503;
  }

  if (
    message.includes("required") ||
    message === "Portal URL is invalid" ||
    message.startsWith("Portal URL does not match")
  ) {
    return 400;
  }

  return 502;
}

function buildProviderPayload(input: {
  customer: NonNullable<PortalTokenSendRecord["customer"]>;
  portalUrl: string;
  token: PortalTokenSendRecord;
}): CustomerPortalSendProviderPayload {
  return {
    portal_access: {
      customer_id: input.token.customer_id,
      portal_url: input.portalUrl,
      token_id: input.token.id,
    },
    customer: {
      id: input.customer.id,
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
    },
  };
}

async function sendThroughProvider(payload: CustomerPortalSendProviderPayload) {
  const webhookUrl = process.env.PORTAL_DELIVERY_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Portal delivery provider is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const webhookSecret = process.env.PORTAL_DELIVERY_WEBHOOK_SECRET;

  if (webhookSecret) {
    headers.Authorization = `Bearer ${webhookSecret}`;
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Portal delivery provider request failed");
  }
}

export async function POST(request: Request) {
  const auth = await getAdminAccess(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const input = validateCustomerPortalSendInput(await request.json());
    const client = createServiceRoleSupabaseClient();
    const { data, error } = await client
      .from("customer_portal_access_tokens")
      .select(
        "id, customer_id, token_hash, status, expires_at, customer:customers(id, name, email, phone)",
      )
      .eq("id", input.token_id)
      .single<PortalTokenSendRecord>();

    if (error || !data || data.customer_id !== input.customer_id) {
      return NextResponse.json(
        { error: "Portal access token not found" },
        { status: 404 },
      );
    }

    if (data.status !== "active" || isExpired(data.expires_at)) {
      return NextResponse.json(
        { error: "Only active portal links can be sent" },
        { status: 400 },
      );
    }

    const { accessToken, portalUrl } = validatePortalUrl({
      customerId: input.customer_id,
      portalUrl: input.portal_url,
      requestUrl: request.url,
    });

    if (hashToken(accessToken) !== data.token_hash) {
      return NextResponse.json(
        { error: "Portal URL does not match this link" },
        { status: 400 },
      );
    }

    if (!data.customer?.email && !data.customer?.phone) {
      return NextResponse.json(
        { error: "Customer contact is required before sending portal access" },
        { status: 400 },
      );
    }

    if (!process.env.PORTAL_DELIVERY_WEBHOOK_URL) {
      throw new Error("Portal delivery provider is not configured");
    }

    const payload = buildProviderPayload({
      customer: data.customer,
      portalUrl,
      token: data,
    });

    try {
      await sendThroughProvider(payload);
    } catch (error) {
      await recordCustomerPortalAccessTokenEvent(client, {
        actorProfileId: auth.access.userId,
        customerId: data.customer_id,
        kind: "send_failed",
        tokenId: data.id,
      });

      throw error;
    }

    await recordCustomerPortalAccessTokenEvent(client, {
      actorProfileId: auth.access.userId,
      customerId: data.customer_id,
      kind: "send_succeeded",
      tokenId: data.id,
    });

    return NextResponse.json({
      provider: "webhook",
      status: "requested",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to request portal send";

    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
