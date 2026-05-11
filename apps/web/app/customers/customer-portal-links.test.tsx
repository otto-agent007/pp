import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  created_at: "2026-05-07T00:00:00.000Z",
  expires_at: "2027-05-01T00:00:00.000Z",
  last_used_at: "2026-05-07T00:00:00.000Z",
};
const openedNoExpirationToken = {
  ...token,
  id: "token-opened-no-expiration",
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
    expect(screen.getByText("2 active links")).toBeInTheDocument();
    expect(
      screen.getByText("Consider revoking older links before sharing again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Portal readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("1 expired")).not.toBeInTheDocument();
    expect(screen.queryByText("1 revoked")).not.toBeInTheDocument();
    expect(screen.queryByText("3 never opened")).not.toBeInTheDocument();
    expect(screen.getByText("Active — no expiration")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent === "Expires May 1, 2027 · Opened May 7, 2026",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_content, element) => element?.textContent?.includes("Never opened") ?? false,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        (_content, element) =>
          element?.textContent === "Expired May 1, 2026 · Never opened",
      ).length,
    ).toBeGreaterThan(0);
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

    expect(screen.getByText("Couldn't load portal links.")).toBeInTheDocument();
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
    expect(screen.getByText("✓ Link copied to clipboard.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate new" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "This link is only available during this session. Reload the page and it's gone — generate a new one to reshare.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy again" }));

    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("shows a manual copy fallback when clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Clipboard unavailable"),
    );

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(screen.getByText("Link ready — copy it manually:")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/access_token=raw-token/)).toBeInTheDocument();
    expect(
      screen.getByText("Paste this into an email or text to share with the customer."),
    ).toBeInTheDocument();
  });

  it("confirms before revoking active portal links", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    );

    expect(revokeMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Revoke this link?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This link is active with no expiration and has never been opened.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel revoke" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Confirm revoke" }));

    expect(revokeMutate).toHaveBeenCalledWith(
      "token-1",
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("cancels and switches revoke confirmations", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [openedToken, token],
      isLoading: false,
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 7, 2026",
      }),
    );
    expect(
      screen.getByText(
        "This link is active and expires May 1, 2027. The customer last opened it May 7, 2026.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel revoke" }));

    expect(screen.queryByText("Revoke this link?")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 7, 2026",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    );

    expect(screen.getAllByText("Revoke this link?")).toHaveLength(1);
    expect(
      screen.getByText(
        "This link is active with no expiration and has never been opened.",
      ),
    ).toBeInTheDocument();
  });

  it("returns focus to the Revoke button when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel revoke" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Revoke portal link created May 6, 2026",
        }),
      ).toHaveFocus(),
    );
  });

  it("closes revoke confirmation with Escape and keeps copy controls available", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));
    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    );

    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
    expect(screen.getByText("Revoke this link?")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Revoke this link?")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Revoke portal link created May 6, 2026",
        }),
      ).toHaveFocus(),
    );
  });

  it("renders revoke confirmation copy for expiration and opened states", async () => {
    const user = userEvent.setup();
    const expiringNeverOpenedToken = {
      ...token,
      id: "token-expiring-never-opened",
      expires_at: "2027-05-01T00:00:00.000Z",
      created_at: "2026-05-08T00:00:00.000Z",
    };
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [openedNoExpirationToken, expiringNeverOpenedToken],
      isLoading: false,
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 8, 2026",
      }),
    );
    expect(
      screen.getByText(
        "This link is active and expires May 1, 2027. It has never been opened.",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    );
    expect(
      screen.getByText(
        "This link is active with no expiration — the customer has opened it.",
      ),
    ).toBeInTheDocument();
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
    expect(screen.getByText("Couldn't revoke link. Try again.")).toBeInTheDocument();
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
