import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PortalShareCard } from "./portal-share-card";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

describe("PortalShareCard", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BRAND_KEY;
  });

  it("uses Pest Patrol customer-safe identity by default", async () => {
    render(<PortalShareCard portalUrl="https://example.test/portal/customer-1" />);

    expect(
      screen.getByText(
        "Share this Pest Patrol customer portal link by text or invoice QR code.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/provider|secret|token_hash/i)).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByAltText("QR code for customer portal link")).toHaveAttribute(
        "src",
        "data:image/png;base64,qr",
      ),
    );
  });

  it("uses the active demo brand in the default description", async () => {
    process.env.NEXT_PUBLIC_BRAND_KEY = "demo_pest";

    render(<PortalShareCard portalUrl="https://example.test/portal/customer-1" />);

    expect(
      screen.getByText(
        "Share this Coastal Shield Pest customer portal link by text or invoice QR code.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByAltText("QR code for customer portal link")).toHaveAttribute(
        "src",
        "data:image/png;base64,qr",
      ),
    );
  });
});
