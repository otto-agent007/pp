import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import ts from "typescript";

const MANIFEST = "module-roles.json";
const BARREL = "index.ts";

interface ModuleRoles {
  schemaVersion: number;
  forbiddenInPolicy: string[];
  policyModules: string[];
  orchestrationModules: string[];
}

/**
 * The directory holding this test, and therefore the package under test.
 *
 * Taken from vitest's own state rather than `import.meta.url`, which the jsdom
 * environment rewrites to a non-`file:` document URL, and rather than
 * `process.cwd()`, which differs between a root `vitest run` and the
 * per-project run turbo performs inside the package directory.
 */
function packageDir(): string {
  const { testPath } = expect.getState();

  if (!testPath) {
    throw new Error("vitest did not report a test path");
  }

  return dirname(testPath);
}

function manifest(): ModuleRoles {
  return JSON.parse(
    readFileSync(join(packageDir(), MANIFEST), "utf8"),
  ) as ModuleRoles;
}

/** Production modules on disk, excluding the barrel and every test file. */
function productionModules(): string[] {
  return readdirSync(packageDir())
    .filter(
      (entry) =>
        entry.endsWith(".ts") && !entry.endsWith(".test.ts") && entry !== BARREL,
    )
    .map((entry) => entry.slice(0, -".ts".length))
    .sort();
}

/** Every module specifier a file imports or re-exports from. */
function importedSpecifiers(fileName: string): string[] {
  const source = ts.createSourceFile(
    fileName,
    readFileSync(join(packageDir(), fileName), "utf8"),
    ts.ScriptTarget.ES2022,
    true,
  );
  const specifiers: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    // Covers `import type X = require("…")` and dynamic `import("…")`.
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return specifiers;
}

/** Forbidden specifiers a module reaches for, across its file and its test. */
function forbiddenIn(module: string, forbidden: readonly string[]): string[] {
  const files = [`${module}.ts`, `${module}.test.ts`].filter((fileName) =>
    existsSync(join(packageDir(), fileName)),
  );

  return files.flatMap((fileName) =>
    importedSpecifiers(fileName)
      .filter((specifier) =>
        forbidden.some(
          (entry) => specifier === entry || specifier.startsWith(`${entry}/`),
        ),
      )
      .map((specifier) => `${fileName} -> ${specifier}`),
  );
}

describe("packages/domain module roles", () => {
  it("partitions every production module exactly once", () => {
    const { policyModules, orchestrationModules } = manifest();
    const declared = [...policyModules, ...orchestrationModules].sort();

    expect(
      declared.length,
      "a module is declared in both policyModules and orchestrationModules",
    ).toBe(new Set(declared).size);

    expect(declared).toEqual(productionModules());
  });

  it("keeps policy modules free of provider and adapter imports", () => {
    const { policyModules, forbiddenInPolicy } = manifest();

    for (const module of policyModules) {
      expect(
        forbiddenIn(module, forbiddenInPolicy),
        `${module} is declared a policy module but reaches for an adapter`,
      ).toEqual([]);
    }
  });

  it("requires every orchestration module to still orchestrate", () => {
    const { orchestrationModules, forbiddenInPolicy } = manifest();

    for (const module of orchestrationModules) {
      expect(
        forbiddenIn(module, forbiddenInPolicy).length,
        `${module} is declared an orchestration module but imports no adapter; ` +
          "reclassify it as policy rather than leaving it misfiled",
      ).toBeGreaterThan(0);
    }
  });

  it("keeps the package barrel free of provider and adapter imports", () => {
    const { forbiddenInPolicy } = manifest();

    expect(
      importedSpecifiers(BARREL).filter((specifier) =>
        forbiddenInPolicy.some(
          (entry) => specifier === entry || specifier.startsWith(`${entry}/`),
        ),
      ),
    ).toEqual([]);
  });
});
