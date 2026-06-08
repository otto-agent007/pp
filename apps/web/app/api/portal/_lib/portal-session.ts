import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../_lib/server-auth";

export const portalSessionCookieName = "pp_customer_portal_session";
const defaultPortalSessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

interface PortalSessionRow {
  customer_id: string;
  expires_at: string;
  id: string;
  revoked_at: string | null;
  token_id: string;
}

export function newPortalSecret() {
  return randomBytes(32).toString("base64url");
}

export function hashPortalSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function portalSessionExpiry(grantExpiresAt: string | null) {
  const defaultExpiry = new Date(
    Date.now() + defaultPortalSessionLifetimeMs,
  ).toISOString();

  if (!grantExpiresAt) {
    return defaultExpiry;
  }

  return Date.parse(grantExpiresAt) < Date.parse(defaultExpiry)
    ? grantExpiresAt
    : defaultExpiry;
}

export function readPortalSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);
  const match = cookies.find((cookie) =>
    cookie.startsWith(`${portalSessionCookieName}=`),
  );

  return match
    ? decodeURIComponent(match.slice(portalSessionCookieName.length + 1))
    : "";
}

export function setPortalSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: string,
) {
  response.cookies.set({
    expires: new Date(expiresAt),
    httpOnly: true,
    name: portalSessionCookieName,
    path: "/",
    sameSite: "lax",
    secure: true,
    value: sessionToken,
  });
}

export function portalSessionRequired() {
  return NextResponse.json(
    { error: "Portal session is required" },
    { status: 401 },
  );
}

export function portalSessionDenied() {
  return NextResponse.json(
    { error: "Portal access is invalid or expired" },
    { status: 403 },
  );
}

export async function validatePortalSession(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  customerId: string,
  request: Request,
) {
  const sessionToken = readPortalSessionCookie(request);

  if (!sessionToken.trim()) {
    return {
      error: portalSessionRequired(),
      session: null,
    };
  }

  const { data, error } = await client
    .from("customer_portal_sessions")
    .select("id, token_id, customer_id, expires_at, revoked_at")
    .eq("customer_id", customerId)
    .eq("session_hash", hashPortalSecret(sessionToken.trim()))
    .maybeSingle<PortalSessionRow>();

  if (error || !data || data.revoked_at) {
    return {
      error: portalSessionDenied(),
      session: null,
    };
  }

  if (Date.parse(data.expires_at) <= Date.now()) {
    return {
      error: portalSessionDenied(),
      session: null,
    };
  }

  const usedAt = new Date().toISOString();
  await client
    .from("customer_portal_sessions")
    .update({ last_used_at: usedAt })
    .eq("id", data.id);
  await client
    .from("customer_portal_access_tokens")
    .update({ last_used_at: usedAt })
    .eq("id", data.token_id);

  return {
    error: null,
    session: data,
  };
}
