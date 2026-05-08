import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "./page";

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

describe("HomePage", () => {
  it("renders the demo workflow without promising seeded production data", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Ops demo command center" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use live production data intentionally/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create customer and location/ }),
    ).toHaveAttribute("href", "/customers");
    expect(
      screen.getByText(
        "Add the customer, primary contact, and first service address.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Customer appears active with at least one active location.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Schedule a job/ }),
    ).toHaveAttribute("href", "/jobs");
    expect(screen.getAllByText("Route")).toHaveLength(5);
    expect(screen.getAllByText("Success signal")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Automation" })).toHaveAttribute(
      "href",
      "/automation",
    );
    expect(screen.queryByText(/seed fake production data/i)).not.toBeInTheDocument();
  });

  it("renders a compact readiness snapshot for the manual checklist and remaining dashboard action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Readiness snapshot" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Manual smoke checklist")).toBeInTheDocument();
    expect(
      screen.getByText("7 operator-run checks ready for live-data demos."),
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard action")).toBeInTheDocument();
    expect(screen.getByText("Leaked password protection")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enable leaked password protection in Supabase Auth settings.",
      ),
    ).toBeInTheDocument();
  });
});
