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
