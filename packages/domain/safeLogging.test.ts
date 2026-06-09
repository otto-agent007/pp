import { describe, expect, it, vi } from "vitest";

import {
  buildSafeErrorResponse,
  redactObject,
  redactValue,
  safeLogError,
} from "./safeLogging";

describe("safe logging redaction", () => {
  it("redacts sensitive keys in nested objects", () => {
    const redacted = redactObject({
      nested: {
        authorization: "Bearer abc",
        hash: "hash-value",
        token_id: "token-1",
      },
      ok: "invoice-1",
      secret: "secret-value",
    });

    expect(redacted).toEqual({
      nested: {
        authorization: "[REDACTED]",
        hash: "[REDACTED]",
        token_id: "[REDACTED]",
      },
      ok: "invoice-1",
      secret: "[REDACTED]",
    });
  });

  it("redacts sensitive portal URL query params", () => {
    expect(redactValue("https://app.example/portal/customer-1?grant=raw")).toBe(
      "https://app.example/portal/customer-1?grant=%5BREDACTED%5D",
    );
  });

  it("does not throw when logging nested payloads", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    safeLogError("test.event", {
      nested: [{ cookie: "cookie-value" }],
      route: "test",
    });

    expect(spy).toHaveBeenCalledWith("test.event", {
      nested: [{ cookie: "[REDACTED]" }],
      route: "test",
    });

    spy.mockRestore();
  });

  it("builds sanitized error responses", () => {
    expect(
      buildSafeErrorResponse("Unable", 503, {
        token: "raw-token",
      }),
    ).toEqual({
      body: {
        error: "Unable",
        token: "[REDACTED]",
      },
      status: 503,
    });
  });
});
