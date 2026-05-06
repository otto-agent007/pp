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
    render(<CustomerPortalLinks customerId="customer-1" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Last used Never")).toBeInTheDocument();
  });

  it("generates and copies portal links", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    expect(createMutateAsync).toHaveBeenCalledWith({
      customer_id: "customer-1",
      expires_at: null,
    });
    expect(screen.getByText("Portal link copied")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy latest link" }),
    ).toBeInTheDocument();
  });

  it("revokes active portal links", async () => {
    const user = userEvent.setup();

    render(<CustomerPortalLinks customerId="customer-1" />);

    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(revokeMutate).toHaveBeenCalledWith("token-1");
  });
});
