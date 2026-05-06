import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminNav } from "./admin-nav";

const usePathname = vi.fn();
const signOut = vi.fn();

vi.mock("./admin-auth-context", () => ({
  useAdminAuth: () => ({
    profile: {
      id: "user-1",
      role: "admin",
      created_at: "2026-05-06T00:00:00.000Z",
      updated_at: "2026-05-06T00:00:00.000Z",
    },
    signOut,
    status: "signed_in",
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminNav", () => {
  beforeEach(() => {
    signOut.mockReset();
  });

  it("renders admin navigation and marks the active route", () => {
    usePathname.mockReturnValue("/payments");

    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("signs out from the admin shell", async () => {
    usePathname.mockReturnValue("/");
    const user = userEvent.setup();

    render(<AdminNav />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalled();
  });

  it("hides navigation on customer portal routes", () => {
    usePathname.mockReturnValue("/portal/customer-1");

    render(<AdminNav />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
