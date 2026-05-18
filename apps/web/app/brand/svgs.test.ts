import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { logomarkSvg, wordmarkOnDarkSvg, wordmarkSvg } from "./svgs";

function repoRoot() {
  const cwd = process.cwd();

  if (existsSync(join(cwd, "packages", "assets", "brand"))) {
    return cwd;
  }

  return join(cwd, "..", "..");
}

function readBrandAsset(fileName: string) {
  return readFileSync(
    join(repoRoot(), "packages", "assets", "brand", fileName),
    "utf8",
  ).trim();
}

describe("brand SVG sources", () => {
  it("keeps inline brand SVG constants generated from package assets", () => {
    expect(wordmarkSvg).toBe(readBrandAsset("wordmark.svg"));
    expect(wordmarkOnDarkSvg).toBe(readBrandAsset("wordmark-on-dark.svg"));
    expect(logomarkSvg).toBe(readBrandAsset("logomark.svg"));
  });
});
