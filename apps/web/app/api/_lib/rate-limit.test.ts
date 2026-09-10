import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetRateLimitCheckerForTest,
  __setTestRateLimitChecker,
  checkApiRateLimit,
  getClientIpFromRequest,
  rateLimitResponse,
} from "./rate-limit";

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    headers,
  });
}

describe("rate-limit helper", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows requests in test/local context by default", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "1");

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(false);
  });

  it("delegates to the checker when in a vercel runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const checker = vi.fn().mockResolvedValue({
      rateLimited: true,
    });

    __setTestRateLimitChecker(checker);

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
      key: "payment-link-create:admin-1:invoice-1",
    });

    expect(limited).toBe(true);
    expect(checker).toHaveBeenCalledWith(
      "payment-link-create",
      expect.objectContaining({
        request: expect.any(Request),
        rateLimitKey: "payment-link-create:admin-1:invoice-1",
      }),
    );
  });

  it("fails open only in local development when no firewall client is available", async () => {
    __resetRateLimitCheckerForTest();
    vi.stubEnv("NODE_ENV", "development");

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(false);
  });

  it("fails closed outside development when no firewall client is available", async () => {
    __resetRateLimitCheckerForTest();
    vi.stubEnv("NODE_ENV", "production");

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(true);
  });

  it("fails open when the firewall reports an unrecognized rule id", async () => {
    // Failing closed here returned 429 to every caller on eight routes for four
    // days: the Hobby plan allows one firewall rule and the app declares
    // several policy ids, so most could never resolve. A missing rule is a
    // deployment misconfiguration, not an attack, and taking the product
    // offline is the worse of the two failure modes.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        error: "not-found",
        rateLimited: false,
      }),
    );

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(false);
  });

  it("still blocks when the firewall reports the caller is blocked", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        error: "blocked",
        rateLimited: false,
      }),
    );

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(true);
  });

  it("routes every policy through one configured firewall rule, keeping per-policy keys", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_FIREWALL_RATE_LIMIT_ID", "shared-api-limit");
    const checker = vi.fn().mockResolvedValue({ rateLimited: true });

    __setTestRateLimitChecker(checker);

    const limited = await checkApiRateLimit({
      id: "portal-closeouts",
      request: request("http://localhost/api/portal/x/closeouts"),
      key: "portal-closeouts:cust-1:hash",
    });

    expect(limited).toBe(true);
    expect(checker).toHaveBeenCalledWith(
      "shared-api-limit",
      expect.objectContaining({
        rateLimitKey: "portal-closeouts:cust-1:hash",
      }),
    );
  });

  it("prefixes the policy id onto keys that do not already carry it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_FIREWALL_RATE_LIMIT_ID", "shared-api-limit");
    const checker = vi.fn().mockResolvedValue({ rateLimited: false });

    __setTestRateLimitChecker(checker);

    await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
      key: "admin-1",
    });

    await checkApiRateLimit({
      id: "portal-upgrade-intent",
      request: request("http://localhost/api/portal/x/upgrade-intents"),
    });

    expect(checker).toHaveBeenNthCalledWith(
      1,
      "shared-api-limit",
      expect.objectContaining({
        rateLimitKey: "payment-link-create:admin-1",
      }),
    );
    expect(checker).toHaveBeenNthCalledWith(
      2,
      "shared-api-limit",
      expect.objectContaining({
        rateLimitKey: "portal-upgrade-intent",
      }),
    );
  });

  it("passes the policy id straight through when no shared rule is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const checker = vi.fn().mockResolvedValue({ rateLimited: false });

    __setTestRateLimitChecker(checker);

    await checkApiRateLimit({
      id: "compliance-advisory-create",
      request: request("http://localhost/api/compliance/advisories"),
      key: "compliance-advisory-create:admin-1",
    });

    expect(checker).toHaveBeenCalledWith(
      "compliance-advisory-create",
      expect.objectContaining({
        rateLimitKey: "compliance-advisory-create:admin-1",
      }),
    );
  });

  it("extracts client ip from trusted vercel headers", () => {
    vi.stubEnv("VERCEL", "1");

    const withRealIp = getClientIpFromRequest(
      request("http://localhost", {
        "x-real-ip": "203.0.113.8",
      }),
    );

    const withVercelIp = getClientIpFromRequest(
      request("http://localhost", {
        "x-vercel-ip": "203.0.113.9",
      }),
    );

    expect(withRealIp).toBe("203.0.113.8");
    expect(withVercelIp).toBe("203.0.113.9");
  });

  it("does not trust generic forwarded headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");

    const localOnly = getClientIpFromRequest(
      request("http://localhost", {
        "x-forwarded-for": "198.51.100.11",
      }),
    );

    expect(localOnly).toBeUndefined();
  });

  it("returns sanitized rate-limit response payload and headers", () => {
    const response = rateLimitResponse();
    const payload = response.clone();
    const body = response.headers.get("Retry-After");

    expect(response.status).toBe(429);
    expect(body).toBe("15");
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    return payload
      .json()
      .then((data) =>
        expect(data).toEqual({ error: "Too many requests. Please retry later." }),
      );
  });
});
