import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerPortalLinks } from "./customer-portal-links";
import {
  useCreateCustomerPortalAccessToken,
  useCustomerPortalAccessTokenEvents,
  useCustomerPortalAccessTokens,
  useCustomerPortalProviderStatus,
  useRevokeCustomerPortalAccessToken,
  useSendCustomerPortalAccessToken,
} from "../../hooks/useCustomerPortalAccess";

vi.mock("../../hooks/useCustomerPortalAccess", () => ({
  useCreateCustomerPortalAccessToken: vi.fn(),
  useCustomerPortalAccessTokenEvents: vi.fn(),
  useCustomerPortalAccessTokens: vi.fn(),
  useCustomerPortalProviderStatus: vi.fn(),
  useRevokeCustomerPortalAccessToken: vi.fn(),
  useSendCustomerPortalAccessToken: vi.fn(),
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
  last_used_at: "2026-05-07T09:38:00.000Z",
};
const openedNoExpirationToken = {
  ...token,
  id: "token-opened-no-expiration",
  last_used_at: "2026-05-07T09:38:00.000Z",
};
const revokedToken = {
  ...token,
  id: "token-revoked",
  status: "revoked",
} as const;

describe("CustomerPortalLinks", () => {
  const createMutateAsync = vi.fn();
  const revokeMutate = vi.fn();
  const sendMutateAsync = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-07T10:08:00.000Z"));
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [token],
      isLoading: false,
    } as never);
    vi.mocked(useCustomerPortalAccessTokenEvents).mockReturnValue({
      data: { events: [], truncated_before: null },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCustomerPortalProviderStatus).mockReturnValue({
      data: {
        provider: "webhook",
        webhook_configured: true,
        webhook_secret_configured: true,
      },
      error: null,
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
    vi.mocked(useSendCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: sendMutateAsync,
    } as never);
    createMutateAsync.mockReset();
    revokeMutate.mockReset();
    sendMutateAsync.mockReset();
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    createMutateAsync.mockResolvedValue({
      customer_id: "customer-1",
      access_token: "raw-token",
      expires_at: null,
      token_id: "token-1",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=raw-token",
    });
    sendMutateAsync.mockResolvedValue({
      provider: "webhook",
      status: "requested",
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
          element?.textContent ===
          "Expires May 1, 2027 · Opened May 7, 2026, 2:38 AM PDT (30 minutes ago)",
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

  it("expands one portal token audit history at a time", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [openedToken, token],
      isLoading: false,
    } as never);
    vi.mocked(useCustomerPortalAccessTokenEvents).mockImplementation(
      (tokenId: string | null) =>
        ({
          data: {
            events:
              tokenId === "token-opened"
                ? [
                    {
                      id: "event-opened",
                      token_id: "token-opened",
                      customer_id: "customer-1",
                      kind: "opened",
                      occurred_at: "2026-05-07T00:00:00.000Z",
                    },
                  ]
                : [
                    {
                      id: "event-generated",
                      token_id: "token-1",
                      customer_id: "customer-1",
                      kind: "generated",
                      occurred_at: "2026-05-06T00:00:00.000Z",
                    },
                  ],
            truncated_before: null,
          },
          error: null,
          isLoading: false,
          refetch: vi.fn(),
        }) as never,
    );

    render(<CustomerPortalLinks customerId="customer-1" />);
    const historyButtons = screen.getAllByRole("button", { name: "History" });

    await user.click(historyButtons[0]!);

    expect(screen.getByText("Opened by customer")).toBeInTheDocument();
    expect(screen.getByText("via portal link")).toBeInTheDocument();
    expect(screen.queryByText("Link generated")).not.toBeInTheDocument();

    await user.click(historyButtons[1]!);

    expect(screen.getByText("Link generated")).toBeInTheDocument();
    expect(screen.queryByText("Opened by customer")).not.toBeInTheDocument();
  });

  it("renders provider send audit events in the token history drawer", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomerPortalAccessTokenEvents).mockReturnValue({
      data: {
        events: [
          {
            id: "event-send-requested",
            token_id: "token-1",
            customer_id: "customer-1",
            kind: "send_requested",
            occurred_at: "2026-05-07T10:00:00.000Z",
          },
          {
            id: "event-send-failed",
            token_id: "token-1",
            customer_id: "customer-1",
            kind: "send_failed",
            occurred_at: "2026-05-07T10:05:00.000Z",
          },
        ],
        truncated_before: null,
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "History" }));

    expect(screen.getByText("Send requested")).toBeInTheDocument();
    expect(screen.getByText("Send failed")).toBeInTheDocument();
    expect(screen.getAllByText("by an admin")).toHaveLength(2);
  });

  it("shows empty, loading, and error readiness states", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const { rerender } = render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("No portal links")).toBeInTheDocument();
    expect(
      screen.getByText("Generate links to share with this customer."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Generate a link to share the customer portal."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No portal links generated")).not.toBeInTheDocument();

    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    rerender(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Loading portal status…")).toBeInTheDocument();
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

  it("shows no-contact readiness only when no stronger portal state is dominant", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const { rerender } = render(
      <CustomerPortalLinks
        customerContact={{ email: null, phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("No contact saved")).toBeInTheDocument();
    expect(
      screen.getByText("This customer has no email or phone on file. Share the link manually."),
    ).toBeInTheDocument();

    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [token],
      isLoading: false,
    } as never);

    rerender(
      <CustomerPortalLinks
        customerContact={{ email: null, phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("Shared — not yet opened")).toBeInTheDocument();
    expect(
      screen.getByText("A portal link was shared but hasn't been opened."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No contact saved")).not.toBeInTheDocument();
  });

  it("shows the last portal access time and relative age when opened", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [openedToken],
      isLoading: false,
    } as never);

    render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Customer has accessed the portal")).toBeInTheDocument();
    expect(
      screen.getByText("Last opened May 7, 2026, 2:38 AM PDT (30 minutes ago)."),
    ).toBeInTheDocument();
  });

  it("shows no-contact readiness for inactive portal history without saved contact", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [expiredToken, revokedToken],
      isLoading: false,
    } as never);

    const { rerender } = render(
      <CustomerPortalLinks
        customerContact={{ email: null, phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("No contact saved")).toBeInTheDocument();
    expect(screen.queryByText("No active links")).not.toBeInTheDocument();

    rerender(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("No active links")).toBeInTheDocument();
    expect(screen.queryByText("No contact saved")).not.toBeInTheDocument();
  });

  it("keeps normal empty readiness when contact is saved", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("No portal links")).toBeInTheDocument();
    expect(screen.queryByText("No contact saved")).not.toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: "Send portal link via provider" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Send link ▶")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate new" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "This link is only available during this session. Reload the page and it's gone — generate a new one to reshare.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy again" }));

    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("requests provider send only for the freshly generated session link and returns focus", async () => {
    const user = userEvent.setup();

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate link" }));
    await user.click(
      screen.getByRole("button", { name: "Send portal link via provider" }),
    );

    expect(sendMutateAsync).toHaveBeenCalledWith({
      customer_id: "customer-1",
      token_id: "token-1",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=raw-token",
    });
    expect(screen.getByText("✓ Send requested.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy again" })).toHaveFocus(),
    );
    expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
  });

  it("shows manual-only provider readiness and keeps send actions hidden", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomerPortalProviderStatus).mockReturnValue({
      data: {
        provider: "manual",
        webhook_configured: false,
        webhook_secret_configured: false,
      },
      error: null,
      isLoading: false,
    } as never);

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    expect(
      screen.getByText("Portal delivery provider is manual-only. Share links manually."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Send new portal link for link created May 6, 2026",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(
      screen.queryByRole("button", { name: "Send portal link via provider" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
  });

  it("does not show provider-ready copy as a readiness-card status", () => {
    vi.mocked(useCustomerPortalAccessTokens).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("No portal links")).toBeInTheDocument();
    expect(
      screen.queryByText("Portal delivery provider ready. Manual copy remains available."),
    ).not.toBeInTheDocument();
  });

  it("sends a fresh token from an active row with row-scoped feedback", async () => {
    const user = userEvent.setup();
    createMutateAsync.mockResolvedValueOnce({
      customer_id: "customer-1",
      access_token: "fresh-raw-token",
      expires_at: null,
      token_id: "token-fresh",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=fresh-raw-token",
    });

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Send new portal link for link created May 6, 2026",
      }),
    );

    expect(createMutateAsync).toHaveBeenCalledWith({
      customer_id: "customer-1",
      expires_at: null,
    });
    expect(sendMutateAsync).toHaveBeenCalledWith({
      customer_id: "customer-1",
      token_id: "token-fresh",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=fresh-raw-token",
    });
    expect(
      screen.getByText(
        "Fresh active link created. Older active links remain available until revoked.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("✓ Fresh link copied to clipboard.")).toBeInTheDocument();
    expect(
      screen.getByText("✓ Send requested for the fresh link."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy fresh link" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy again" })).not.toBeInTheDocument();
  });

  it("preserves the freshly generated manual fallback when row send fails", async () => {
    const user = userEvent.setup();
    createMutateAsync.mockResolvedValueOnce({
      customer_id: "customer-1",
      access_token: "fresh-raw-token",
      expires_at: null,
      token_id: "token-fresh",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=fresh-raw-token",
    });
    sendMutateAsync.mockRejectedValue(new Error("Provider failed"));

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Send new portal link for link created May 6, 2026",
      }),
    );

    expect(screen.queryByRole("button", { name: "Copy again" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Couldn't request send. Copy the newly generated link manually or try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(/access_token=fresh-raw-token/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy fresh link" }),
    ).toBeInTheDocument();
  });

  it("keeps manual copy available when portal send fails", async () => {
    const user = userEvent.setup();
    sendMutateAsync.mockRejectedValue(new Error("Provider failed"));

    render(
      <CustomerPortalLinks
        customerContact={{ email: "owner@example.com", phone: null }}
        customerId="customer-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate link" }));
    await user.click(
      screen.getByRole("button", { name: "Send portal link via provider" }),
    );

    expect(
      screen.getByText("Couldn't request send. Share the link manually or try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy again" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send portal link via provider" }),
    ).toBeEnabled();
  });

  it("disables generated-link send when contact is missing", async () => {
    const user = userEvent.setup();

    render(
      <CustomerPortalLinks
        customerContact={{ email: null, phone: null }}
        customerId="customer-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(
      screen.getByRole("button", { name: "Send portal link via provider" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
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
        "This link is active and expires May 1, 2027. The customer last opened it May 7, 2026, 2:38 AM PDT (30 minutes ago).",
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

    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revoking…" })).toBeDisabled();
  });
});
