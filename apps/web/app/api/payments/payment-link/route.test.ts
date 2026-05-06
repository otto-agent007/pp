import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("payment link route auth", () => {
  it("rejects unauthenticated payment link creation", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments/payment-link", {
        body: JSON.stringify({ invoice: null }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });
});
