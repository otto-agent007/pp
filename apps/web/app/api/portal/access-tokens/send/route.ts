import {
  getPortalDeliveryProviderReadiness,
  safeLogError,
  safeLogWarn,
  validateCustomerPortalSendInput,
  validateCustomerPortalAccessToken,
} from "@pest-patrol/domain";
import type { CustomerPortalSendProviderPayload } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../_lib/server-auth";
import { checkApiRateLimit, rateLimitResponse } from "../../../_lib/rate-limit";
import { recordCustomerPortalAccessTokenEvent } from "../../_lib/access-token-events";
import { hashPortalSecret } from "../../_lib/portal-session";

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
    portalUrl.searchParams.get("grant") ?? "",
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
  if (
    message === "Portal delivery provider is not configured" ||
    message === "Portal delivery provider is unavailable"
  ) {
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

  let input:
    | {
        customer_id: string;
        token_id: string;
        portal_url: string;
      }
    | null = null;

  try {
    input = validateCustomerPortalSendInput(await request.json());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to request portal send";

    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }

  if (
    await checkApiRateLimit({
      id: "portal-access-token-send",
      request,
      key: `portal-access-token-send:${auth.access.userId}:${input.customer_id}:${input.token_id}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
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

    if (hashPortalSecret(accessToken) !== data.token_hash) {
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

    const readiness = getPortalDeliveryProviderReadiness(process.env);

    if (
      readiness.state === "manual_fallback" ||
      readiness.state === "disabled"
    ) {
      await recordCustomerPortalAccessTokenEvent(client, {
        actorProfileId: auth.access.userId,
        customerId: data.customer_id,
        kind: "send_requested",
        tokenId: data.id,
      });

      safeLogWarn("portal.send.manual_fallback", {
        customer_id: data.customer_id,
        provider: "manual",
        route: "portal/access-tokens/send",
        token_id: data.id,
      });

      return NextResponse.json({
        manual_fallback: true,
        provider: "manual",
        status: "requested",
      });
    }

    if (readiness.state === "misconfigured") {
      await recordCustomerPortalAccessTokenEvent(client, {
        actorProfileId: auth.access.userId,
        customerId: data.customer_id,
        kind: "send_failed",
        tokenId: data.id,
      });

      safeLogWarn("portal.send.provider_misconfigured", {
        customer_id: data.customer_id,
        provider: "webhook",
        route: "portal/access-tokens/send",
        token_id: data.id,
      });

      return NextResponse.json(
        {
          error: "Portal delivery provider is unavailable",
          manual_fallback: true,
          provider: "manual",
        },
        { status: 503 },
      );
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

      safeLogError("portal.send.provider_failed", {
        customer_id: data.customer_id,
        provider: "webhook",
        route: "portal/access-tokens/send",
        token_id: data.id,
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

    return NextResponse.json(
      {
        error:
          message === "Portal delivery provider request failed"
            ? message
            : message,
      },
      { status: errorStatus(message) },
    );
  }
}
