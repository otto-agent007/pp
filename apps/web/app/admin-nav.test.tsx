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
    expect(screen.getByRole("navigation")).toHaveClass(
      "bg-primitive-navy-900",
      "md:fixed",
      "md:left-0",
      "md:w-52",
      "md:-translate-x-[calc(100%-1rem)]",
      "md:hover:translate-x-0",
      "md:focus-within:translate-x-0",
      "motion-reduce:transition-none",
    );
    expect(screen.getByRole("navigation")).not.toHaveClass(
      "md:w-[4.5rem]",
      "md:hover:w-64",
      "md:focus-within:w-64",
    );
    expect(screen.getByTestId("admin-nav-reveal-edge")).toHaveClass(
      "hidden",
      "w-4",
      "md:block",
      "md:group-hover/admin-nav:opacity-0",
      "md:group-focus-within/admin-nav:opacity-0",
    );
    expect(screen.getByTestId("admin-nav-reveal-edge")).not.toHaveClass(
      "pointer-events-none",
    );
    expect(screen.getByTestId("admin-nav-content")).toHaveClass(
      "md:opacity-0",
      "md:group-hover/admin-nav:opacity-100",
      "md:group-focus-within/admin-nav:opacity-100",
    );
    expect(screen.getByTestId("admin-nav-route-strip")).toHaveClass(
      "max-w-full",
      "min-w-0",
      "overflow-x-auto",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Technicians" })).toHaveAttribute(
      "href",
      "/technicians",
    );
    expect(screen.getByRole("link", { name: "Escrow/RE" })).toHaveAttribute(
      "href",
      "/escrow-re",
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
    const compactLogomarks = homeLink.querySelectorAll(
      'svg[viewBox="0 0 100 100"]',
    );
    const brandMarks = homeLink.querySelectorAll('span[style*="width"]');
    // The full wordmark already includes the shield mark. Rendering the
    // standalone desktop logomark beside it duplicates the logo when revealed.
    expect(compactLogomarks).toHaveLength(0);
    expect(container.querySelector('svg[viewBox="0 0 420 96"]')).not.toBeNull();
    expect(
      screen.queryByTestId("admin-nav-desktop-logomark"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-nav-desktop-wordmark")).toHaveClass(
      "hidden",
      "md:block",
    );
    expect(screen.getByTestId("admin-nav-mobile-wordmark")).toHaveClass(
      "md:hidden",
    );
    expect(brandMarks[0]).toHaveStyle({
      width: "156px",
    });
    expect(brandMarks[1]).toHaveStyle({
      width: "200px",
    });
  });

  it("marks the Escrow/RE route active from the sidebar", () => {
    usePathname.mockReturnValue("/escrow-re");

    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Escrow/RE" })).toHaveAttribute(
      "aria-current",
      "page",
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

    const shell = screen.getByText("Dispatch content").parentElement
      ?.parentElement;
    expect(screen.getByRole("navigation")).toHaveClass("md:h-screen");
    expect(shell).toHaveClass("min-h-screen", "bg-theme-background-canvas");
    expect(shell).not.toHaveClass(
      "md:grid",
      "md:grid-cols-[4.5rem_minmax(0,1fr)]",
      "md:grid-cols-[15rem_minmax(0,1fr)]",
    );
    expect(screen.getByText("Dispatch content")).toBeInTheDocument();
  });
});
