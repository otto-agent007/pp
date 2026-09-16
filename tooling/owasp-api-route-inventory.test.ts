import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function toPosixPath(path: string) {
  return path.replace(/\\/g, "/");
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(fullPath);
    }

    return [fullPath];
  });
}

function routePathFromFile(filePath: string) {
  const relativePath = toPosixPath(relative(repoRoot, filePath));
  const routePath = relativePath
    .replace(/^apps\/web\/app\/api\//, "/api/")
    .replace(/\/route\.ts$/, "");

  return routePath;
}

const routeInventoryDoc = join(repoRoot, "docs", "OWASP_API_SECURITY_REVIEW.md");
const handlerMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

interface InventoryRow {
  cells: string[];
  route: string;
  text: string;
}

// The inventory table is the repo's record of what guards each route. Parsing
// it means the record can be compared against the code instead of being taken
// on faith.
function parseRouteInventoryRows(review: string): InventoryRow[] {
  return review
    .split(/\r?\n/)
    .filter((line) => line.trimStart().startsWith("|"))
    .map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, ""))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length > 1 && /^`\/api\//.test(cells[0] ?? ""))
    .map((cells) => ({
      cells,
      route: (cells[0] ?? "").replace(/`/g, ""),
      text: cells.join(" | "),
    }));
}

function exportedHandlerMethods(source: string) {
  return handlerMethods.filter((method) =>
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(source),
  );
}

function documentedMethods(row: InventoryRow) {
  return (row.cells[1] ?? "")
    .split(",")
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean)
    .sort();
}

function routeInventory() {
  const review = readFileSync(routeInventoryDoc, "utf8");
  const rows = new Map(
    parseRouteInventoryRows(review).map((row) => [row.route, row]),
  );

  return listFiles(join(repoRoot, "apps", "web", "app", "api"))
    .filter((file) => file.endsWith("route.ts"))
    .sort()
    .map((file) => ({
      file: toPosixPath(relative(repoRoot, file)),
      route: routePathFromFile(file),
      row: rows.get(routePathFromFile(file)),
      source: readFileSync(file, "utf8"),
    }));
}

describe("OWASP API route inventory", () => {
  it("documents every Next API route", () => {
    const routeFiles = listFiles(join(repoRoot, "apps", "web", "app", "api"))
      .filter((file) => file.endsWith("route.ts"))
      .map(routePathFromFile)
      .sort();
    const review = readFileSync(
      join(repoRoot, "docs", "OWASP_API_SECURITY_REVIEW.md"),
      "utf8",
    );

    expect(routeFiles).not.toHaveLength(0);

    routeFiles.forEach((route) => {
      expect(review).toContain(`| \`${route}\` |`);
    });
  });

  // The inventory used to be checked only for the presence of a row per route,
  // so a row could claim any guard it liked and nothing noticed. Every claim
  // below is now read back out of the route it describes. This is the shape of
  // defect this repo keeps producing: a requirement recorded somewhere
  // enforcement never reads.
  it("documents the methods each route actually exports", () => {
    routeInventory().forEach(({ file, route, row, source }) => {
      expect(row, `${route} is missing from ${routeInventoryDoc}`).toBeDefined();

      const exported = exportedHandlerMethods(source);

      expect(
        exported,
        `${file} exports no recognized route handler`,
      ).not.toHaveLength(0);
      expect(
        documentedMethods(row as InventoryRow),
        `${route} documents methods that do not match ${file}`,
      ).toEqual([...exported].sort());
    });
  });

  it("only claims a rate limit for routes that call checkApiRateLimit", () => {
    routeInventory().forEach(({ file, route, row, source }) => {
      const claimed = (row as InventoryRow).text.includes("checkApiRateLimit");
      const enforced = source.includes("checkApiRateLimit(");

      expect(
        claimed,
        claimed
          ? `${route} claims checkApiRateLimit but ${file} never calls it`
          : `${file} calls checkApiRateLimit but ${route} does not record it`,
      ).toBe(enforced);
    });
  });

  it("only claims a same-origin guard for routes that enforce one", () => {
    routeInventory().forEach(({ file, route, row, source }) => {
      const claimed = (row as InventoryRow).text.includes("same-origin guard");
      const enforced = source.includes("requireSameOriginForUnsafeMethod(");

      expect(
        claimed,
        claimed
          ? `${route} claims a same-origin guard but ${file} never calls requireSameOriginForUnsafeMethod`
          : `${file} calls requireSameOriginForUnsafeMethod but ${route} does not record it`,
      ).toBe(enforced);
    });
  });

  // Anything reachable without a credential is reachable by everyone, so an
  // unthrottled one is a standing invitation. A new route of that shape has to
  // either carry a limit or be argued for here on purpose.
  it("rate limits every route reachable without a credential", () => {
    const unauthenticatedRoutes = routeInventory().filter(({ row }) =>
      (row as InventoryRow).cells[2]?.includes("unauthenticated"),
    );

    expect(unauthenticatedRoutes).not.toHaveLength(0);

    unauthenticatedRoutes.forEach(({ file, route, source }) => {
      // A route that refuses to run anywhere but local development is not
      // reachable on a deployment at all, so a limit would guard nothing. That
      // refusal is read out of the route rather than taken from its row.
      const localDevelopmentOnly =
        source.includes("isLocalDevelopment()") && source.includes("isLocalhost(");

      expect(
        source.includes("checkApiRateLimit(") || localDevelopmentOnly,
        `${route} is unauthenticated, so ${file} needs a rate limit or a local-development-only refusal`,
      ).toBe(true);
    });
  });

  it("documents the broader OWASP Web Top 10 2025 companion lens", () => {
    const review = readFileSync(
      join(repoRoot, "docs", "OWASP_API_SECURITY_REVIEW.md"),
      "utf8",
    );
    const webTop10Categories = [
      "A01:2025 Broken Access Control",
      "A02:2025 Security Misconfiguration",
      "A03:2025 Software Supply Chain Failures",
      "A04:2025 Cryptographic Failures",
      "A05:2025 Injection",
      "A06:2025 Insecure Design",
      "A07:2025 Authentication Failures",
      "A08:2025 Software or Data Integrity Failures",
      "A09:2025 Security Logging & Alerting Failures",
      "A10:2025 Mishandling of Exceptional Conditions",
    ];

    webTop10Categories.forEach((category) => {
      expect(review).toContain(category);
    });
  });

  it("keeps service-role references inside server API code", () => {
    const appFiles = listFiles(join(repoRoot, "apps", "web", "app")).filter(
      (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"),
    );
    const serviceRoleReferences = appFiles
      .map((file) => ({
        file: toPosixPath(relative(repoRoot, file)),
        source: readFileSync(file, "utf8"),
      }))
      .filter(
        ({ source }) =>
          source.includes("createServiceRoleSupabaseClient") ||
          source.includes("SUPABASE_SERVICE_ROLE_KEY"),
      )
      .map(({ file }) => file);

    expect(serviceRoleReferences).not.toHaveLength(0);
    expect(
      serviceRoleReferences.every((file) => file.startsWith("apps/web/app/api/")),
    ).toBe(true);
  });

  it("keeps local Whisper rewrites development-only", () => {
    const nextConfig = readFileSync(
      join(repoRoot, "apps", "web", "next.config.ts"),
      "utf8",
    );

    expect(nextConfig).toContain(
      'if (nodeEnv !== "development") {\n    return [];\n  }',
    );
    expect(nextConfig).toContain('source: "/api/transcribe"');
    expect(nextConfig).toContain('source: "/api/whisper-health"');
    expect(nextConfig).toContain("http://127.0.0.1:8765/transcribe");
    expect(nextConfig).toContain("http://127.0.0.1:8765/health");
  });

  // VERCEL_FIREWALL_RATE_LIMIT_ID was read by every rate-limited route and
  // named in no operator-facing file, so a deployment that never set it had
  // every policy fail open and log about it. An env var an operator cannot see
  // is an env var an operator cannot set.
  it("declares every configured env var the code reads", () => {
    // Set by the runtime, not by an operator, so they have nothing to declare.
    const platformProvided = new Set(["NODE_ENV", "VERCEL", "VERCEL_ENV"]);
    const declared = new Set(
      readFileSync(join(repoRoot, ".env.example"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.split("=")[0]),
    );
    // listFiles walks everything, including vendored dependency and build
    // output that reads env vars this repo does not own.
    const generated = /\/(node_modules|\.next|\.expo|\.turbo|dist|build)\//;
    const sourceFiles = ["apps", "packages"].flatMap((dir) =>
      listFiles(join(repoRoot, dir))
        .map(toPosixPath)
        .filter(
          (file) =>
            /\.(ts|tsx)$/.test(file) &&
            !/\.test\.tsx?$/.test(file) &&
            !generated.test(file),
        ),
    );
    const referenced = new Set(
      sourceFiles.flatMap(
        (file) =>
          readFileSync(file, "utf8").match(
            /process\.env\.[A-Z_][A-Z0-9_]*/g,
          ) ?? [],
      ).map((match) => match.replace("process.env.", "")),
    );
    const undeclared = [...referenced]
      .filter((name) => !platformProvided.has(name) && !declared.has(name))
      .sort();

    expect(referenced.size).toBeGreaterThan(0);
    expect(
      undeclared,
      "env vars read by the app but absent from .env.example",
    ).toEqual([]);
  });

  it("keeps env example values as placeholders", () => {
    const envExample = readFileSync(join(repoRoot, ".env.example"), "utf8");
    const assignments = envExample
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    assignments.forEach((line) => {
      const [name, value = ""] = line.split("=");

      expect(name).toBeTruthy();
      expect(value === "" || value === "false").toBe(true);
    });
  });
});
