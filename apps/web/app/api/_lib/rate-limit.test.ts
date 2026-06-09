import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
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
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
  });

  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "test";
  });

  it("allows requests in test/local context by default", async () => {
    process.env.NODE_ENV = "test";
    process.env.VERCEL = "1";

    const limited = await checkApiRateLimit({
      id: "payment-link-create",
      request: request("http://localhost/api/payments/payment-link"),
    });

    expect(limited).toBe(false);
  });

  it("delegates to the checker when in a vercel runtime", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
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

  it("extracts client ip from trusted vercel headers", () => {
    process.env.VERCEL = "1";

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
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";

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
