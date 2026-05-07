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
      screen.getByRole("heading", { name: "Demo workflow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create customer and location/ }),
    ).toHaveAttribute("href", "/customers");
    expect(
      screen.getByRole("link", { name: /Schedule a job/ }),
    ).toHaveAttribute("href", "/jobs");
    expect(screen.getByRole("link", { name: "Automation" })).toHaveAttribute(
      "href",
      "/automation",
    );
    expect(screen.queryByText(/seed fake production data/i)).not.toBeInTheDocument();
  });
});
