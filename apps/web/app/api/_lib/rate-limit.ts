import type { ApiRateLimitPolicyId } from "@pest-patrol/types";
import { safeLogError } from "@pest-patrol/domain";
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

// Vercel's Hobby plan allows exactly one rate-limit rule per project, but the
// app declares several policy ids, so at least all-but-one can never resolve to
// a real firewall rule. Setting VERCEL_FIREWALL_RATE_LIMIT_ID points every
// policy at that single configured rule while keeping the policy id in the
// rate-limit key, so each policy still gets its own counter bucket under the
// shared rule. Unset, ids pass through unchanged (a plan with enough rules).
function configuredSharedRuleId(): string | undefined {
  return process.env.VERCEL_FIREWALL_RATE_LIMIT_ID?.trim() || undefined;
}

function resolveRule(
  id: string,
  key: string | undefined,
): { key: string | undefined; ruleId: string } {
  const sharedRuleId = configuredSharedRuleId();

  if (!sharedRuleId) {
    return { key, ruleId: id };
  }

  const scopedKey = key ?? id;

  return {
    key: scopedKey.startsWith(`${id}:`) || scopedKey === id
      ? scopedKey
      : `${id}:${scopedKey}`,
    ruleId: sharedRuleId,
  };
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function isLocalDevRuntime() {
  return process.env.NODE_ENV === "development";
}

function sanitizeFirewallResult(
  result: FirewallCheckResult | null | undefined,
  ruleId: string,
): boolean {
  if (result?.error === "blocked") {
    return true;
  }

  if (result?.error === "not-found") {
    // An unrecognized rule id means the Vercel Firewall has no rule for this
    // policy. Failing closed here took eight production routes offline for four
    // days (every caller got a 429) because the Hobby plan cannot hold the
    // rules this app declares — a self-inflicted outage strictly worse than the
    // unthrottled traffic it was guarding against. Fail open and log loudly;
    // set VERCEL_FIREWALL_RATE_LIMIT_ID to make the rule resolve for real.
    safeLogError("rate_limit.fail_open", {
      reason: "unknown_rule_id",
      rule_id: ruleId,
    });

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

const defaultRateLimitChecker: RateLimitChecker = async (
  rateLimitId,
  options,
) => {
  const firewall = await loadFirewallClient();
  const fn =
    firewall.checkRateLimit ??
    firewall.unstable_checkRateLimit ??
    (async () => ({ rateLimited: false }));

  return fn(rateLimitId, options);
};
let rateLimitChecker: RateLimitChecker = defaultRateLimitChecker;
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
    if (isLocalDevRuntime()) {
      return false;
    }

    // No Vercel Firewall client is available outside Vercel/local dev, so
    // there's nothing to enforce a limit — fail closed instead of silently
    // disabling rate limiting for every route on a non-Vercel deployment.
    safeLogError("rate_limit.fail_closed", {
      reason: "firewall_client_unavailable",
      rule_id: id,
    });

    return true;
  }

  const { key: rateLimitKey, ruleId } = resolveRule(id, key);

  const firewallResult = await rateLimitChecker(ruleId, {
    request,
    rateLimitKey,
  });

  return sanitizeFirewallResult(firewallResult, ruleId);
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

export function __resetRateLimitCheckerForTest() {
  rateLimitChecker = defaultRateLimitChecker;
  usingDefaultChecker = true;
}
