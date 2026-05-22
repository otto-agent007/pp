import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { Logomark } from "./logomark";
import { WORDMARK_PROMOTION_READINESS, Wordmark } from "./wordmark";

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
    expect(svg!.innerHTML).toContain('data-outline-text="PEST PATROL"');
    expect(svg!.innerHTML).not.toContain("<text");
    expect(svg!.innerHTML).not.toContain("font-family");
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
    expect(svg!.innerHTML).toContain('data-outline-text="PEST PATROL"');
    expect(svg!.innerHTML).not.toContain("<text");
    expect(svg!.innerHTML).not.toContain("font-family");
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

  it("documents promotion readiness without importing inactive v3 drafts", () => {
    expect(WORDMARK_PROMOTION_READINESS).toEqual({
      activeAssetBoundary: "packages/assets/brand/wordmark.svg",
      mobileLockupBehavior:
        "Use the logomark below 156px full-lockup width; do not squeeze the full wordmark.",
      minimumFullLockupWidthPx: 156,
      productionTitleText: "Pest Patrol",
      referenceDraftBoundary:
        "docs/design-system/assets/wordmark-options/v3/",
    });

    const repoRoot = existsSync(
      join(process.cwd(), "packages/assets/brand/README.md"),
    )
      ? process.cwd()
      : join(process.cwd(), "../..");
    const packageReadme = readFileSync(
      join(repoRoot, "packages/assets/brand/README.md"),
      "utf8",
    );
    const v3Readme = readFileSync(
      join(repoRoot, "docs/design-system/assets/wordmark-options/v3/README.md"),
      "utf8",
    );

    expect(packageReadme).toContain("Production `<title>` text: `Pest Patrol`.");
    expect(packageReadme).toContain(
      "Use the logomark below 156px full-lockup width",
    );
    expect(v3Readme).toContain("Reference-only boundary");
    expect(v3Readme).toMatch(
      /must not be imported by\s+`apps\/web\/app\/brand`/,
    );
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
