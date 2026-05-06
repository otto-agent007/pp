import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("customer portal access token revoke route", () => {
  it("requires admin authentication", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal/access-tokens/token-1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ tokenId: "token-1" }) },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });
});
