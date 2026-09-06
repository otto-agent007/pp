import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/csp-report", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

describe("csp report route", () => {
  it("accepts a violation report and responds with 204", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      request({
        "csp-report": {
          "blocked-uri": "https://evil.example",
          "violated-directive": "script-src",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledWith(
      "csp.violation_reported",
      expect.objectContaining({ report: expect.any(Object) }),
    );

    warnSpy.mockRestore();
  });

  it("does not throw on a malformed body", async () => {
    const response = await POST(
      new Request("http://localhost/api/csp-report", {
        body: "not json",
        method: "POST",
      }),
    );

    expect(response.status).toBe(204);
  });
});
