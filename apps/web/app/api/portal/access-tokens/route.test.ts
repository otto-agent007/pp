import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

describe("customer portal access token route", () => {
  it("requires admin authentication for listing", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/portal/access-tokens?customer_id=customer-1",
      ),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("requires admin authentication", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal/access-tokens", {
        body: JSON.stringify({ customer_id: "customer-1" }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });
});
