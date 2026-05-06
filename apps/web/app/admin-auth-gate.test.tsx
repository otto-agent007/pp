import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthGate } from "./admin-auth-gate";

const usePathname = vi.fn();
let authStatus: "loading" | "signed_in" | "signed_out" = "signed_out";

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("./admin-auth-context", () => ({
  useAdminAuth: () => ({
    error: null,
    profile: null,
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    status: authStatus,
  }),
}));

describe("AdminAuthGate", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
    authStatus = "signed_out";
  });

  it("renders protected admin content for signed-in users", () => {
    authStatus = "signed_in";

    render(
      <AdminAuthGate>
        <div>Protected admin content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Protected admin content")).toBeInTheDocument();
  });

  it("renders sign-in for signed-out admin routes", () => {
    render(
      <AdminAuthGate>
        <div>Protected admin content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByRole("heading", { name: "Admin operations sign-in" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Protected admin content")).not.toBeInTheDocument();
  });

  it("leaves customer portal routes outside admin auth", () => {
    usePathname.mockReturnValue("/portal/customer-1");

    render(
      <AdminAuthGate>
        <div>Portal content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Portal content")).toBeInTheDocument();
  });

  it("shows a loading state while auth initializes", () => {
    authStatus = "loading";

    render(
      <AdminAuthGate>
        <div>Protected admin content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Checking admin access...")).toBeInTheDocument();
  });
});
