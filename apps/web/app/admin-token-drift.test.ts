import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminSurfaceFiles = [
  "admin-nav.tsx",
  "closeouts/closeouts-client.tsx",
  "customers/customer-portal-links.tsx",
  "demo-seed-controls.tsx",
  "escrow-re/page.tsx",
  "inventory/inventory-client.tsx",
  "technicians/technicians-client.tsx",
] as const;

const legacyTokenClasses = [
  "bg-primitive-sky-500",
  "focus:border-primary",
  "text-neutralDark",
  "text-secondary",
] as const;

function containsClassToken(source: string, className: string) {
  return new RegExp("(^|[\\s\"'`])" + className + "([\\s\"'`])").test(source);
}

describe("admin semantic token usage", () => {
  it("keeps signed-in admin surfaces off legacy Tailwind token aliases", () => {
    const offenders = adminSurfaceFiles.flatMap((file) => {
      const source = readFileSync(join(__dirname, file), "utf8");

      return legacyTokenClasses
        .filter((className) => containsClassToken(source, className))
        .map((className) => `${file}: ${className}`);
    });

    expect(offenders).toEqual([]);
  });
});
