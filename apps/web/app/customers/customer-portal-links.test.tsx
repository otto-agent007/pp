import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerPortalLinks } from "./customer-portal-links";
import {
  useCreateCustomerPortalAccessToken,
  useCustomerPortalAccessTokens,
  useRevokeCustomerPortalAccessToken,
} from "../../hooks/useCustomerPortalAccess";

vi.mock("../../hooks/useCustomerPortalAccess", () => ({
  useCreateCustomerPortalAccessToken: vi.fn(),
  useCustomerPortalAccessTokens: vi.fn(),
  useRevokeCustomerPortalAccessToken: vi.fn(),
}));

const now = "2026-05-06T00:00:00.000Z";
const token = {
  id: "token-1",
  customer_id: "customer-1",
  status: "active",
  expires_at: null,
  last_used_at: null,
  created_at: now,
  updated_at: now,
} as const;
const expiredToken = {
  ...token,
  id: "token-expired",
  expires_at: "2026-05-01T00:00:00.000Z",
};
const openedToken = {
  ...token,
  id: "token-opened",
  expires_at: "2027-05-01T00:00:00.000Z",
  last_used_at: "2026-05-07T00:00:00.000Z",
};
const revokedToken = {
  ...token,
  id: "token-revoked",
  status: "revoked",
} as const;

describe("CustomerPortalLinks", () => {
  const createMutateAsync = vi.fn();
  const revokeMutate = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [token],
      isLoading: false,
    } as never);
    vi.mocked(useCreateCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: createMutateAsync,
    } as never);
    vi.mocked(useRevokeCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: false,
      mutate: revokeMutate,
    } as never);
    createMutateAsync.mockReset();
    revokeMutate.mockReset();
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    createMutateAsync.mockResolvedValue({
      customer_id: "customer-1",
      access_token: "raw-token",
      expires_at: null,
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=raw-token",
    });
    writeText.mockResolvedValue(undefined);
  });

  it("lists portal token states", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [openedToken, token, expiredToken, revokedToken],
      isLoading: false,
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Portal access")).toBeInTheDocument();
    expect(screen.getAllByText("2 active links")).toHaveLength(2);
    expect(
      screen.getByText("Consider revoking older links before sharing again."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 expired")).toBeInTheDocument();
    expect(screen.getByText("1 revoked")).toBeInTheDocument();
    expect(screen.getByText("3 never opened")).toBeInTheDocument();
    expect(screen.getByText("Active - no expiration")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent === "Expires May 1, 2027 | Opened May 7, 2026",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_content, element) => element?.textContent?.includes("Never opened") ?? false,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent === "Expired May 1, 2026 | Never opened",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });

  it("shows empty, loading, and error readiness states", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const { rerender } = render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("No portal links")).toBeInTheDocument();
    expect(
      screen.getByText("Generate a link to share the customer portal."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No portal links generated")).not.toBeInTheDocument();

    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    rerender(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Loading portal status...")).toBeInTheDocument();
    expect(screen.getAllByTestId("portal-link-skeleton")).toHaveLength(2);

    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      error: new Error("Unable to load"),
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    rerender(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Could not load portal links.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("generates and copies portal links", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(createMutateAsync).toHaveBeenCalledWith({
      customer_id: "customer-1",
      expires_at: null,
    });
    expect(screen.getByText("Link copied to clipboard.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate new" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "This link is only available during this session. Reload the page and it is gone - generate a new one to reshare.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a manual copy fallback when clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Clipboard unavailable"),
    );

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(screen.getByText("Link ready - copy it manually:")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/access_token=raw-token/)).toBeInTheDocument();
    expect(
      screen.getByText("Paste this into an email or text to share with the customer."),
    ).toBeInTheDocument();
  });

  it("revokes active portal links", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(revokeMutate).toHaveBeenCalledWith("token-1");
  });

  it("shows revoke errors alongside latest-link controls", async () => {
    vi.mocked(useRevokeCustomerPortalAccessToken).mockReturnValue({
      error: new Error("Unable to revoke"),
      isPending: false,
      mutate: revokeMutate,
    } as never);
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
    expect(screen.getByText("Could not revoke link. Try again.")).toBeInTheDocument();
  });

  it("shows in-flight portal actions", () => {
    vi.mocked(useCreateCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: true,
      mutateAsync: createMutateAsync,
    } as never);
    vi.mocked(useRevokeCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: true,
      mutate: revokeMutate,
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByRole("button", { name: "Generating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revoking..." })).toBeDisabled();
  });
});
