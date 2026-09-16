import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST, buildSafeCspViolation } from "./route";

let rateLimited = false;

vi.mock("../_lib/rate-limit", () => ({
  checkApiRateLimit: () => Promise.resolve(rateLimited),
  getClientIpFromRequest: () => undefined,
  rateLimitResponse: () =>
    Response.json(
      { error: "Too many requests. Please retry later." },
      { status: 429 },
    ),
}));

function request(body: unknown) {
  return new Request("http://localhost/api/csp-report", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    method: "POST",
  });
}

describe("csp report route", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rateLimited = false;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("accepts a legacy report-uri violation and responds with 204", async () => {
    const response = await POST(
      request({
        "csp-report": {
          "blocked-uri": "https://evil.example/x.js",
          "document-uri": "http://localhost/dashboard",
          "violated-directive": "script-src",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledWith(
      "csp.violation_reported",
      expect.objectContaining({
        blocked_uri: "https://evil.example/x.js",
        document_uri: "http://localhost/dashboard",
        effective_directive: "script-src",
      }),
    );
  });

  it("accepts a Reporting API reports+json violation", async () => {
    const response = await POST(
      request([
        {
          body: {
            blockedURL: "https://evil.example/x.js",
            documentURL: "http://localhost/dashboard",
            effectiveDirective: "script-src-elem",
          },
          type: "csp-violation",
        },
      ]),
    );

    expect(response.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledWith(
      "csp.violation_reported",
      expect.objectContaining({
        blocked_uri: "https://evil.example/x.js",
        effective_directive: "script-src-elem",
      }),
    );
  });

  it("does not throw on a malformed body", async () => {
    const response = await POST(request("not json"));

    expect(response.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("enforces the csp-violation-report rate limit", async () => {
    rateLimited = true;

    const response = await POST(
      request({ "csp-report": { "blocked-uri": "https://evil.example" } }),
    );

    expect(response.status).toBe(429);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // The endpoint takes no credential, so the body is whatever a stranger sends.
  // Logging it verbatim let anyone write unbounded JSON into a log with an hour
  // of retention, which is enough to push real events out of the window.
  it("logs nothing for a body too large to be a browser report", async () => {
    const response = await POST(
      request({
        "csp-report": {
          "blocked-uri": "https://evil.example",
          padding: "a".repeat(9 * 1024),
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("drops fields outside the known violation shape", () => {
    const violation = buildSafeCspViolation({
      "csp-report": {
        "blocked-uri": "https://evil.example",
        attacker_field: "should not be logged",
        nested: { deep: { deeper: "also not logged" } },
      },
    });

    expect(violation).toEqual({ blocked_uri: "https://evil.example" });
  });

  it("truncates long fields and clamps inline samples hardest", () => {
    const violation = buildSafeCspViolation({
      "csp-report": {
        "blocked-uri": `https://evil.example/${"a".repeat(500)}`,
        "script-sample": "b".repeat(500),
      },
    }) as Record<string, string>;

    expect(violation.blocked_uri).toHaveLength(257);
    expect(violation.sample).toHaveLength(129);
    expect(violation.blocked_uri.endsWith("…")).toBe(true);
  });

  it("returns nothing to log when no known field is present", () => {
    expect(buildSafeCspViolation({ "csp-report": {} })).toBeUndefined();
    expect(buildSafeCspViolation({ junk: true })).toBeUndefined();
    expect(buildSafeCspViolation("nope")).toBeUndefined();
  });

  // A violation raised on the portal grant landing page carries the one-time
  // grant in its document URI, and this endpoint is unauthenticated.
  it("keeps a portal grant out of the logged document uri", async () => {
    await POST(
      request({
        "csp-report": {
          "document-uri":
            "http://localhost/portal/customer-1?grant=one-time-secret",
          "violated-directive": "img-src",
        },
      }),
    );

    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("one-time-secret");
  });
});
