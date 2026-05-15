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
    signInLocalDemo: vi.fn(),
    signOut: vi.fn(),
    status: authStatus,
  }),
}));

vi.mock("../hooks/useDemoSeed", () => ({
  usePrepareLocalDemoLogin: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
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

  it("does not treat similarly-prefixed portal routes as public", () => {
    usePathname.mockReturnValue("/portal-admin");

    render(
      <AdminAuthGate>
        <div>Protected portal admin content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Admin operations sign-in")).toBeInTheDocument();
    expect(screen.queryByText("Protected portal admin content"))
      .not.toBeInTheDocument();
  });

  it("leaves password reset routes outside admin auth", () => {
    usePathname.mockReturnValue("/forgot-password");

    const { rerender } = render(
      <AdminAuthGate>
        <div>Password reset content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Password reset content")).toBeInTheDocument();

    usePathname.mockReturnValue("/auth/update-password");
    rerender(
      <AdminAuthGate>
        <div>Password reset content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Password reset content")).toBeInTheDocument();
  });

  it("leaves technician login outside admin auth", () => {
    usePathname.mockReturnValue("/technician-login");

    render(
      <AdminAuthGate>
        <div>Technician login content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Technician login content")).toBeInTheDocument();
  });

  it("does not treat similarly-prefixed technician login routes as public", () => {
    usePathname.mockReturnValue("/technician-login-extra");

    render(
      <AdminAuthGate>
        <div>Protected technician admin content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Admin operations sign-in")).toBeInTheDocument();
    expect(screen.queryByText("Protected technician admin content"))
      .not.toBeInTheDocument();
  });

  it("does not treat similarly-prefixed update-password routes as public", () => {
    usePathname.mockReturnValue("/auth/update-password-extra");

    render(
      <AdminAuthGate>
        <div>Protected content</div>
      </AdminAuthGate>,
    );

    expect(screen.getByText("Admin operations sign-in")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
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
