import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logomark } from "./logomark";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the light variant with an accessible label by default", () => {
    const { container } = render(<Wordmark />);

    const mark = screen.getByRole("img", { name: "Pest Patrol" });
    expect(mark).toBeInTheDocument();

    // Light variant uses the navy text gradient (#0B2A66 → #071A3D).
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("style")).toBe(
      "display:block;width:100%;height:100%",
    );
    expect(svg!.innerHTML).toContain("#0B2A66");
    expect(svg!.innerHTML).not.toContain("wd-glow"); // dark-only halo
  });

  it("switches to the dark variant with the navy halo", () => {
    const { container } = render(
      <Wordmark variant="dark" label="Pest Patrol OS" />,
    );

    expect(screen.getByRole("img", { name: "Pest Patrol OS" })).toBeInTheDocument();

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.innerHTML).toMatch(/wd-glow-[^"]+/); // halo gradient suffixed
    expect(svg!.innerHTML).toContain('fill="#FFFFFF"'); // white wordmark text
  });

  it("suffixes internal SVG ids per instance so two marks can coexist", () => {
    const { container } = render(
      <>
        <Wordmark />
        <Wordmark />
      </>,
    );

    const ids = Array.from(container.querySelectorAll("[id]")).map(
      (node) => node.id,
    );
    const plateIds = ids.filter((id) => id.startsWith("w-plate-"));

    expect(plateIds).toHaveLength(2);
    expect(new Set(plateIds).size).toBe(2);
  });

  it("renders as decoration when label is 'decorative'", () => {
    render(<Wordmark label="decorative" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Logomark", () => {
  it("renders the shield mark with an accessible label and square footprint", () => {
    const { container } = render(<Logomark size={64} />);

    const mark = screen.getByRole("img", { name: "Pest Patrol" });
    expect(mark).toBeInTheDocument();
    expect(mark.getAttribute("style")).toContain("width: 64px");
    expect(mark.getAttribute("style")).toContain("height: 64px");

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 100 100");
  });
});
