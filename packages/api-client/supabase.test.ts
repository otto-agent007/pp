import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import * as apiClient from "./index";

/**
 * The guards that keep the removed singleton removed.
 *
 * `supabase.ts` used to construct a Supabase client at import time and export
 * it, and CR09A's deliverable is that no adapter can be built without being
 * handed a client. That is a property of the package rather than of any one
 * function, so it is asserted here rather than left to the reviewer of the next
 * change: a reintroduced module-level client, a client-valued export, or a
 * factory that quietly defaults its client again each fail one of these.
 */
function packageDir(): string {
  const { testPath } = expect.getState();

  if (!testPath) {
    throw new Error("vitest did not report a test path");
  }

  return dirname(testPath);
}

function sourceFiles(): string[] {
  return readdirSync(packageDir())
    .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
    .sort();
}

describe("provider client construction", () => {
  it("constructs no provider client anywhere in the package", () => {
    const offenders = sourceFiles().filter((file) =>
      readFileSync(join(packageDir(), file), "utf8").includes("createClient("),
    );

    // A client built in here is a client no composition root chose. Creating
    // one belongs to `apps/web/lib/supabase-browser.ts`,
    // `apps/mobile/src/lib/supabase.ts`, or a per-request server client.
    expect(offenders).toEqual([]);
  });

  it("exports behaviour rather than a bound client", () => {
    const valued = Object.entries(apiClient).filter(
      ([, value]) => typeof value !== "function",
    );

    expect(valued).toEqual([]);
    expect(Object.keys(apiClient)).not.toContain("supabase");
  });

  it("requires a client at every adapter factory", () => {
    const factories = Object.entries(apiClient).filter(([name]) =>
      /^create[A-Za-z]+Adapter$/.test(name),
    );

    expect(factories).toHaveLength(14);

    // `Function.length` stops counting at the first parameter with a default,
    // so a factory that goes back to `client: SupabaseLikeClient = supabase`
    // reports 0 here and fails. That is the exact regression this guards.
    expect(
      factories
        .filter(([, factory]) => (factory as (...args: never[]) => unknown).length !== 1)
        .map(([name]) => name),
    ).toEqual([]);
  });
});
