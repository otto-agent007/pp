import { describe, expect, it } from "vitest";

import {
  getExpectedOrigin,
  getRequestOrigin,
  requireSameOriginForUnsafeMethod,
  validateSameOriginRequest,
} from "./origin-guard";

function request(url: string, init: RequestInit = {}) {
  return new Request(url, init);
}

describe("origin guard", () => {
  it("allows safe methods without an Origin header", () => {
    const result = requireSameOriginForUnsafeMethod(
      request("https://app.example/api/portal/customer-1/closeouts"),
    );

    expect(result).toBeNull();
  });

  it("uses the request URL as the expected origin", () => {
    expect(getExpectedOrigin(request("https://app.example/api/test"))).toBe(
      "https://app.example",
    );
  });

  it("prefers Origin over Referer when extracting the request origin", () => {
    expect(
      getRequestOrigin(
        request("https://app.example/api/test", {
          headers: {
            Origin: "https://app.example",
            Referer: "https://evil.example/page",
          },
          method: "POST",
        }),
      ),
    ).toBe("https://app.example");
  });

  it("falls back to a same-origin Referer when Origin is missing", () => {
    const result = validateSameOriginRequest(
      request("https://app.example/api/test", {
        headers: {
          Referer: "https://app.example/portal/customer-1",
        },
        method: "POST",
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("rejects missing Origin and Referer for unsafe methods", async () => {
    const response = requireSameOriginForUnsafeMethod(
      request("https://app.example/api/test", {
        method: "POST",
      }),
    );
    const body = (await response?.json()) as { error?: string };

    expect(response?.status).toBe(403);
    expect(body.error).toBe("Request origin is not allowed");
  });

  it("rejects cross-origin unsafe requests with a sanitized error", async () => {
    const response = requireSameOriginForUnsafeMethod(
      request("https://app.example/api/test", {
        headers: {
          Cookie: "pp_customer_portal_session=secret-session",
          Origin: "https://evil.example",
        },
        method: "POST",
      }),
    );
    const bodyText = await response?.text();

    expect(response?.status).toBe(403);
    expect(bodyText).toContain("Request origin is not allowed");
    expect(bodyText).not.toContain("secret-session");
    expect(bodyText).not.toContain("evil.example");
    expect(bodyText).not.toContain("app.example");
  });

  it("rejects malformed Origin or Referer headers", async () => {
    const originResponse = requireSameOriginForUnsafeMethod(
      request("https://app.example/api/test", {
        headers: { Origin: "not a url" },
        method: "POST",
      }),
    );
    const refererResponse = requireSameOriginForUnsafeMethod(
      request("https://app.example/api/test", {
        headers: { Referer: "not a url" },
        method: "POST",
      }),
    );

    expect(originResponse?.status).toBe(403);
    expect(refererResponse?.status).toBe(403);
  });
});
