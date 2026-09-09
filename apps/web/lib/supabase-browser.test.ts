import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The guards that keep the web app's provider selection real.
 *
 * Before CR09A this app had no browser client of its own: the auth contexts
 * imported the one `packages/api-client` built at import time and passed it
 * back in, and every hook constructed its adapters with no client at all. Both
 * shapes type-check and both run, so nothing but a reviewer stood between the
 * app and a silent return to them. These assertions stand there instead.
 */
const appRoot = join(__dirname, "..");
const scannedDirectories = ["app", "hooks", "lib"] as const;

/**
 * The one file allowed to build a client besides the composition root.
 *
 * API routes run per request and bind either the caller's access token or the
 * service role, so they cannot share the browser's client.
 */
const apiRoutes = join("app", "api");
const serverClientFile = join(apiRoutes, "_lib", "server-auth.ts");

function sourceFiles(): string[] {
  const found: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") {
          walk(entryPath);
        }

        continue;
      }

      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) {
        continue;
      }

      found.push(relative(appRoot, entryPath));
    }
  }

  for (const directory of scannedDirectories) {
    walk(join(appRoot, directory));
  }

  return found.sort();
}

function read(file: string): string {
  return readFileSync(join(appRoot, file), "utf8");
}

describe("web composition root", () => {
  it("passes the composition-root client to every browser adapter factory", () => {
    // API routes are excluded because they are not the browser: each one binds
    // a client built for that request, which is why the third assertion below
    // keeps the browser's client out of them.
    const offenders = sourceFiles()
      .filter((file) => !file.startsWith(apiRoutes))
      .flatMap((file) => {
        const calls = [
          ...read(file).matchAll(/create[A-Za-z]+Adapter\(\s*([A-Za-z0-9_]*)/g),
        ];

        return calls
          .filter((call) => call[1] !== "browserSupabase")
          .map((call) => `${file}: ${call[0]}`);
      });

    expect(offenders).toEqual([]);
  });

  it("builds a Supabase client only at the composition root and per request", () => {
    const builders = sourceFiles().filter((file) =>
      read(file).includes("createClient("),
    );

    expect(builders).toEqual([join("lib", "supabase-browser.ts"), serverClientFile].sort());
  });

  it("keeps the browser client out of server-only code", () => {
    const importers = sourceFiles().filter((file) =>
      read(file).includes("supabase-browser"),
    );

    expect(importers.filter((file) => file.startsWith(apiRoutes))).toEqual([]);
  });
});
