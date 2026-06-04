import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import EscrowRePage from "./page";

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

describe("EscrowRePage", () => {
  it("renders a WDO escrow placeholder with links into existing workflows", () => {
    render(<EscrowRePage />);

    expect(
      screen.getByRole("heading", { name: "Escrow/RE" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Real estate handoff")).toBeInTheDocument();
    expect(screen.getByText("WDO / escrow view")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Escrow packets are assembled from jobs, closeouts, customers, and payments.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Empty state")).toBeInTheDocument();
    expect(screen.queryByText("Provider-free")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review jobs/ })).toHaveAttribute(
      "href",
      "/jobs",
    );
    expect(
      screen.getByRole("link", { name: /Open customers/ }),
    ).toHaveAttribute("href", "/customers");
    expect(
      screen.getByRole("link", { name: /Check closeouts/ }),
    ).toHaveAttribute("href", "/closeouts");
    expect(
      screen.getByRole("link", { name: /Review payments/ }),
    ).toHaveAttribute("href", "/payments");
  });
});
