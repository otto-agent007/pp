import type { ApiRateLimitPolicyId } from "@pest-patrol/types";
import { NextResponse } from "next/server";

type FirewallCheckOptions = {
  request?: Request;
  headers?: Headers | Record<string, string> | Record<string, string[]>;
  rateLimitKey?: string;
};

type FirewallCheckResult = {
  error?: "blocked" | "not-found";
  rateLimited: boolean;
};

type FirewallClient = {
  checkRateLimit?: (
    rateLimitId: string,
    options?: FirewallCheckOptions,
  ) => Promise<FirewallCheckResult>;
  unstable_checkRateLimit?: (
    rateLimitId: string,
    options?: FirewallCheckOptions,
  ) => Promise<FirewallCheckResult>;
};

type RateLimitChecker = (
  rateLimitId: string,
  options?: FirewallCheckOptions,
) => Promise<FirewallCheckResult>;

type CheckApiRateLimitInput = {
  id: ApiRateLimitPolicyId | (string & {});
  request: Request;
  key?: string;
};

const DEFAULT_RETRY_AFTER_SECONDS = "15";

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function sanitizeFirewallResult(
  result: FirewallCheckResult | null | undefined,
): boolean {
  if (result?.error === "blocked") {
    return true;
  }

  if (result?.error === "not-found") {
    return false;
  }

  return Boolean(result?.rateLimited);
}

function toRequestIp(request: Request): string | undefined {
  const requestAsNextRequest = request as Request & { ip?: string };
  const forwardedFor = requestAsNextRequest.ip ?? request.headers.get("x-vercel-forwarded-for");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return undefined;
}

function loadFirewallClient(): Promise<FirewallClient> {
  // Keep production-safe behavior in non-vercel environments by falling back to no-op.
  if (!isVercelRuntime()) {
    return Promise.resolve({} as FirewallClient);
  }

  return import("@vercel/firewall").catch(() => ({} as FirewallClient));
}

let rateLimitChecker: RateLimitChecker = async (rateLimitId, options) => {
  const firewall = await loadFirewallClient();
  const fn =
    firewall.checkRateLimit ??
    firewall.unstable_checkRateLimit ??
    (async () => ({ rateLimited: false }));

  return fn(rateLimitId, options);
};
let usingDefaultChecker = true;

export async function checkApiRateLimit({
  id,
  request,
  key,
}: CheckApiRateLimitInput): Promise<boolean> {
  if (
    process.env.NODE_ENV === "test" &&
    usingDefaultChecker &&
    !isVercelRuntime()
  ) {
    return false;
  }

  if (!isVercelRuntime() && usingDefaultChecker) {
    return false;
  }

  const firewallResult = await rateLimitChecker(id, {
    request,
    rateLimitKey: key,
  });

  return sanitizeFirewallResult(firewallResult);
}

export function getClientIpFromRequest(request: Request) {
  if (!isVercelRuntime()) {
    return undefined;
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp?.trim()) {
    return xRealIp.split(",")[0]?.trim();
  }

  const xVercelIp = request.headers.get("x-vercel-ip");
  if (xVercelIp?.trim()) {
    return xVercelIp.trim();
  }

  return toRequestIp(request);
}

export function rateLimitResponse() {
  return NextResponse.json(
    {
      error: "Too many requests. Please retry later.",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": DEFAULT_RETRY_AFTER_SECONDS,
      },
    },
  );
}

export function __setTestRateLimitChecker(next: RateLimitChecker) {
  rateLimitChecker = next;
  usingDefaultChecker = false;
}
