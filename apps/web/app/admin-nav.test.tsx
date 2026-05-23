import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminNav, AdminShell } from "./admin-nav";

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

  it("renders a UI Kit left rail with grouped admin navigation and marks the active route", () => {
    usePathname.mockReturnValue("/payments");

    render(<AdminNav />);

    expect(
      screen.getByRole("link", { name: "Pest Patrol OS — Home" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByText("Operations")).toHaveClass("hidden", "md:block");
    expect(screen.getAllByText("Customers").length).toBeGreaterThan(0);
    expect(screen.getByText("Billing")).toHaveClass("hidden", "md:block");
    expect(screen.getByText("System")).toHaveClass("hidden", "md:block");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Technicians" })).toHaveAttribute(
      "href",
      "/technicians",
    );
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "href",
      "/payments",
    );
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByText("Field command")).not.toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass(
      "text-primitive-sky-100",
    );
  });

  it("renders the Wordmark inside the home link", () => {
    usePathname.mockReturnValue("/");

    const { container } = render(<AdminNav />);

    const homeLink = screen.getByRole("link", {
      name: "Pest Patrol OS — Home",
    });
    // The wordmark is decorative inside the labelled link, so we look for the
    // inlined SVG rather than another role="img".
    expect(homeLink.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 420 96",
    );
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

  it("wraps signed-in admin routes with the responsive admin shell", () => {
    usePathname.mockReturnValue("/dispatch");

    render(
      <AdminShell>
        <main>Dispatch content</main>
      </AdminShell>,
    );

    expect(screen.getByRole("navigation")).toHaveClass("md:h-screen");
    expect(screen.getByText("Dispatch content")).toBeInTheDocument();
  });
});
