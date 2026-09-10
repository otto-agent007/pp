import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArchitecturePolicy } from "./architecture-boundaries";

/**
 * The controlled rebuild's end state, frozen so it cannot rot quietly.
 *
 * CR18 claims two things about this repository: every boundary exception has
 * been removed, and no package is left in the `planned` policy state. Both were
 * true when CR18 ran, and `pnpm architecture:check` prints the exception count
 * on every run - but printing a zero is not the same as failing on a one, so
 * re-adding an exception would have left every gate green while the claim on
 * the node quietly stopped being true. That is the shape of defect this chain
 * met thirteen times: a requirement recorded where the enforcement never reads.
 *
 * These are deliberately assertions about *this* policy rather than rules in
 * the checker. Both `exceptions` and `state: "planned"` remain legitimate
 * features - a future debt exception with a removal node, or a package declared
 * before it is built, is a normal thing to want. What must not happen is either
 * appearing without someone deciding to. Editing this file is how that decision
 * gets made, and reviewing that edit is how CR18's claim stays honest.
 */

const repoRoot = process.cwd();

function architecturePolicy(): ArchitecturePolicy {
  return JSON.parse(
    readFileSync(join(repoRoot, "tooling/architecture-boundaries.json"), "utf8"),
  ) as ArchitecturePolicy;
}

describe("controlled rebuild completion", () => {
  it("carries no boundary exceptions", () => {
    expect(architecturePolicy().exceptions).toEqual([]);
  });

  it("leaves no package in the planned policy state", () => {
    const planned = architecturePolicy()
      .packages.filter((entry) => entry.state === "planned")
      .map((entry) => entry.name);

    expect(planned).toEqual([]);
  });

  it("declares every workspace package the rebuild ended with", () => {
    // A count rather than a list of names: the names are the checker's business
    // and it already fails on a package missing from the policy or absent from
    // the workspace. What this pins is that the end state is eleven packages,
    // so growing or shrinking the workspace is a visible decision here too.
    expect(architecturePolicy().packages).toHaveLength(11);
  });
});
