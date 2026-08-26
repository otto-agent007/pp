import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import {
  type ArchitecturePolicy,
  collectWorkspaceArchitectureFacts,
  validateArchitecturePolicy,
} from "./architecture-boundaries";

const DIGEST = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function validPolicy(): ArchitecturePolicy {
  return {
    schemaVersion: 1,
    packages: [
      {
        name: "@pest-patrol/application",
        path: "packages/application",
        state: "planned",
        allowedDependencies: [],
      },
      {
        name: "@pest-patrol/types",
        path: "packages/types",
        state: "required",
        allowedDependencies: [],
      },
    ],
    exceptions: [],
  };
}

function errorsFor(value: unknown) {
  return validateArchitecturePolicy(value).errors;
}

const temporaryWorkspaces: string[] = [];

afterEach(() => {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function createWorkspace(workspaceFile = 'packages:\n  - "apps/*"\n  - "packages/*"\n') {
  const workspace = mkdtempSync(join(tmpdir(), "architecture-boundaries-"));
  temporaryWorkspaces.push(workspace);
  writeFileSync(join(workspace, "pnpm-workspace.yaml"), workspaceFile);
  mkdirSync(join(workspace, "apps"), { recursive: true });
  mkdirSync(join(workspace, "packages"), { recursive: true });
  return workspace;
}

function writeManifest(workspace: string, packagePath: string, manifest: unknown) {
  const manifestPath = join(workspace, packagePath, "package.json");
  mkdirSync(join(workspace, packagePath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest));
}

function repositoryPath(workspace: string, path: string) {
  return relative(workspace, path).split(sep).join("/");
}

function exceptionWith(overrides: Record<string, unknown> = {}) {
  return {
    id: "application-to-types",
    kind: "missing-manifest-dependency",
    importer: "@pest-patrol/application",
    dependency: "@pest-patrol/types",
    sourceOccurrences: [
      {
        path: "packages/application/src/policy.ts",
        specifier: "@pest-patrol/types",
        syntax: "import",
        occurrenceClass: "production-type",
        count: 1,
        bindingDigest: DIGEST,
      },
    ],
    manifest: { section: null, versionSpecifier: null },
    removeIn: "CR02",
    reason: "The package manifest will be updated in CR02.",
    ...overrides,
  };
}

describe("architecture policy", () => {
  it("accepts a minimal valid policy and returns its typed value", () => {
    const policy = validPolicy();

    expect(validateArchitecturePolicy(policy)).toEqual({ policy, errors: [] });
  });

  it("rejects a non-object value and an unsupported schema version", () => {
    expect(errorsFor(null)).toEqual(["policy must be an object"]);
    expect(errorsFor({ ...validPolicy(), schemaVersion: 2 })).toEqual([
      "schemaVersion must be 1",
    ]);
  });

  it("rejects missing or malformed top-level collections", () => {
    const missingPackages = validPolicy() as Record<string, unknown>;
    delete missingPackages.packages;

    expect(errorsFor(missingPackages)).toEqual([
      "packages must be a non-empty array",
    ]);
    expect(errorsFor({ ...validPolicy(), packages: [] })).toEqual([
      "packages must be a non-empty array",
    ]);
    expect(errorsFor({ ...validPolicy(), exceptions: {} })).toEqual([
      "exceptions must be an array",
    ]);
  });

  it("rejects duplicate package names and paths", () => {
    const policy = validPolicy();
    policy.packages[1] = {
      ...policy.packages[1],
      name: "@pest-patrol/application",
      path: "packages/application",
    };

    expect(errorsFor(policy)).toEqual([
      "package @pest-patrol/application name is duplicated",
      "package @pest-patrol/application path packages/application is duplicated",
    ]);
  });

  it("reports package ordering and duplicate names beside sibling structural errors", () => {
    const policy = validPolicy();
    policy.packages = [
      { ...policy.packages[1], path: "packages//types" },
      { ...policy.packages[0] },
      { ...policy.packages[0], path: "packages/application-copy" },
    ];

    expect(errorsFor(policy)).toEqual([
      "package @pest-patrol/application name is duplicated",
      "package @pest-patrol/types path must be a normalized repository-relative path",
      "packages must be sorted by name",
    ]);
  });

  it("rejects invalid package names, paths, and states", () => {
    const policy = validPolicy();
    policy.packages[0] = {
      ...policy.packages[0],
      name: "application",
      path: "C:\\packages\\application",
      state: "current" as ArchitecturePolicy["packages"][number]["state"],
    };

    expect(errorsFor(policy)).toEqual([
      "package application name must be an @pest-patrol/* package name",
      "package application path must be a normalized repository-relative path",
      "package application state must be required or planned",
      "packages must be sorted by name",
    ]);
  });

  it("rejects non-normalized repository-relative package and source paths", () => {
    for (const path of [
      "/packages/application",
      "C:/packages/application",
      "packages//application",
      "packages/./application",
      "packages/../application",
    ]) {
      const policy = validPolicy();
      policy.packages[0] = { ...policy.packages[0], path };
      expect(errorsFor(policy)).toContain(
        "package @pest-patrol/application path must be a normalized repository-relative path",
      );
    }

    const policy = validPolicy();
    policy.exceptions = [exceptionWith({ sourceOccurrences: [{
      ...exceptionWith().sourceOccurrences[0],
      path: "packages/application/../types/source.ts",
    }] })];
    expect(errorsFor(policy)).toContain(
      "exception application-to-types occurrence 0 path must be a normalized repository-relative path",
    );
  });

  it("rejects duplicate and non-canonical allowed dependencies", () => {
    const policy = validPolicy();
    policy.packages[0] = {
      ...policy.packages[0],
      allowedDependencies: [
        {
          name: "@pest-patrol/types",
          manifestSections: ["peerDependencies", "dependencies", "dependencies"],
        },
        { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
        { name: "@pest-patrol/missing", manifestSections: ["dependencies"] },
        { name: "@pest-patrol/application", manifestSections: ["dependencies"] },
      ],
    };

    expect(errorsFor(policy)).toEqual([
      "package @pest-patrol/application allowed dependencies must be sorted",
      "package @pest-patrol/application allowed dependency @pest-patrol/application must not depend on itself",
      "package @pest-patrol/application allowed dependency @pest-patrol/missing must name a policy package",
      "package @pest-patrol/application allowed dependency @pest-patrol/types is duplicated",
      "package @pest-patrol/application allowed dependency @pest-patrol/types manifest sections must be sorted",
      "package @pest-patrol/application allowed dependency @pest-patrol/types repeats dependencies",
    ]);
  });

  it("rejects unsorted packages, exception IDs, and source occurrences", () => {
    const policy = validPolicy();
    policy.packages.reverse();
    policy.packages[1].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    policy.exceptions = [
      exceptionWith({ id: "z-to-types" }),
      exceptionWith({ id: "a-to-types" }),
    ];
    policy.exceptions[0].sourceOccurrences = [
      { ...policy.exceptions[0].sourceOccurrences[0], path: "packages/application/src/z.ts" },
      { ...policy.exceptions[0].sourceOccurrences[0], path: "packages/application/src/a.ts" },
    ];

    expect(errorsFor(policy)).toEqual([
      "exception z-to-types sourceOccurrences must be sorted",
      "exceptions must be sorted by ID",
      "packages must be sorted by name",
    ]);
  });

  it("rejects duplicate exception IDs and edges with the wrong kind", () => {
    const policy = validPolicy();
    policy.packages[0].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    policy.exceptions = [
      exceptionWith({ kind: "forbidden-workspace-edge", id: "a" }),
      exceptionWith({ id: "a" }),
    ];

    expect(errorsFor(policy)).toEqual([
      "exception a forbidden-workspace-edge must not be an allowed dependency",
      "exception a is duplicated",
    ]);
  });

  it("reports exception ordering and duplicate IDs beside sibling structural errors", () => {
    const policy = validPolicy();
    policy.packages[0].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    policy.exceptions = [
      exceptionWith({
        id: "z",
        sourceOccurrences: [{
          ...exceptionWith().sourceOccurrences[0],
          count: 0,
        }],
      }),
      exceptionWith({ id: "a" }),
      exceptionWith({ id: "a" }),
    ];

    expect(errorsFor(policy)).toEqual([
      "exception a is duplicated",
      "exception z occurrence 0 count must be a positive integer",
      "exceptions must be sorted by ID",
    ]);
  });

  it("rejects exceptions referring to unknown packages or a forbidden missing-manifest edge", () => {
    const policy = validPolicy();
    policy.exceptions = [
      exceptionWith({ id: "a", importer: "@pest-patrol/missing" }),
      exceptionWith({
        id: "b",
        dependency: "@pest-patrol/missing",
        sourceOccurrences: [{
          ...exceptionWith().sourceOccurrences[0],
          specifier: "@pest-patrol/missing",
        }],
      }),
      exceptionWith({ id: "c" }),
    ];

    expect(errorsFor(policy)).toEqual([
      "exception a importer @pest-patrol/missing must name a policy package",
      "exception b dependency @pest-patrol/missing must name a policy package",
      "exception c missing-manifest-dependency must be an allowed dependency",
    ]);
  });

  it("rejects invalid exception occurrence values and paths outside the importer", () => {
    const policy = validPolicy();
    policy.exceptions = [exceptionWith({ sourceOccurrences: [{
      path: "packages/types/index.ts",
      specifier: "@pest-patrol/other",
      syntax: "load",
      occurrenceClass: "runtime",
      count: 0,
      bindingDigest: "ABC",
    }] })];

    expect(errorsFor(policy)).toEqual([
      "exception application-to-types occurrence 0 bindingDigest must be a lowercase 64-character SHA-256 digest",
      "exception application-to-types occurrence 0 count must be a positive integer",
      "exception application-to-types occurrence 0 occurrenceClass is invalid",
      "exception application-to-types occurrence 0 path must be inside packages/application",
      "exception application-to-types occurrence 0 specifier must be @pest-patrol/types",
      "exception application-to-types occurrence 0 syntax is invalid",
    ]);
  });

  it("rejects invalid manifest pairs, missing-manifest evidence, and removal metadata", () => {
    const policy = validPolicy();
    policy.exceptions = [
      exceptionWith({
        id: "a",
        manifest: { section: "dependencies", versionSpecifier: null },
        sourceOccurrences: [],
        removeIn: "next",
        reason: " ",
      }),
      exceptionWith({
        id: "b",
        kind: "forbidden-workspace-edge",
        manifest: { section: "invalid", versionSpecifier: "" },
      }),
    ];

    expect(errorsFor(policy)).toEqual([
      "exception a manifest section and versionSpecifier must both be null or non-null",
      "exception a missing-manifest-dependency manifest must be null",
      "exception a missing-manifest-dependency must include source occurrences",
      "exception a reason must not be blank",
      "exception a removeIn must be a CR node ID",
      "exception b manifest section is invalid",
      "exception b manifest versionSpecifier must not be blank",
    ]);
  });

  it("orders mixed-case and punctuation data with the shared comparator", () => {
    const policy = validPolicy();
    policy.packages = [
      {
        name: "@pest-patrol/a!",
        path: "packages/a",
        state: "required",
        allowedDependencies: [
          { name: "@pest-patrol/z", manifestSections: ["dependencies"] },
          { name: "@pest-patrol/A", manifestSections: ["dependencies"] },
        ],
      },
      {
        name: "@pest-patrol/A",
        path: "packages/A",
        state: "required",
        allowedDependencies: [],
      },
      {
        name: "@pest-patrol/z",
        path: "packages/z",
        state: "required",
        allowedDependencies: [],
      },
    ];
    policy.exceptions = [
      exceptionWith({
        id: "z!",
        importer: "@pest-patrol/a!",
        dependency: "@pest-patrol/A",
        sourceOccurrences: [
          { ...exceptionWith().sourceOccurrences[0], path: "packages/a/z.ts", specifier: "@pest-patrol/A" },
          { ...exceptionWith().sourceOccurrences[0], path: "packages/a/A.ts", specifier: "@pest-patrol/A" },
        ],
      }),
      exceptionWith({
        id: "A!",
        importer: "@pest-patrol/a!",
        dependency: "@pest-patrol/A",
        sourceOccurrences: [{
          ...exceptionWith().sourceOccurrences[0],
          path: "packages/a/source.ts",
          specifier: "@pest-patrol/A",
        }],
      }),
    ];

    expect(errorsFor(policy)).toEqual([
      "exception z! sourceOccurrences must be sorted",
      "exceptions must be sorted by ID",
      "package @pest-patrol/a! allowed dependencies must be sorted",
      "packages must be sorted by name",
    ]);
  });
});

describe("manifest facts", () => {
  it("discovers sorted manifest-bearing children, including planned and unlisted packages", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/zeta", {
      name: "@pest-patrol/zeta",
      dependencies: {
        "@pest-patrol/types": "workspace:*",
        react: "19.0.0",
      },
      devDependencies: {
        "@pest-patrol/domain": "workspace:^",
        vitest: "4.0.0",
      },
      peerDependencies: {
        "@pest-patrol/application": "workspace:~",
      },
      optionalDependencies: {
        "@pest-patrol/adapter": "workspace:^",
      },
    });
    writeManifest(workspace, "apps/unlisted", {
      name: "@pest-patrol/unlisted",
      dependencies: { "@pest-patrol/types": "^1.2.3" },
    });
    writeManifest(workspace, "packages/application", {
      name: "@pest-patrol/application",
    });
    mkdirSync(join(workspace, "packages", "without-manifest"), { recursive: true });

    expect(collectWorkspaceArchitectureFacts(workspace)).toEqual({
      packages: [
        {
          name: "@pest-patrol/application",
          path: "packages/application",
          manifestPath: "packages/application/package.json",
          manifestDependencies: [],
          sourceOccurrences: [],
        },
        {
          name: "@pest-patrol/unlisted",
          path: "apps/unlisted",
          manifestPath: "apps/unlisted/package.json",
          manifestDependencies: [
            {
              dependency: "@pest-patrol/types",
              section: "dependencies",
              versionSpecifier: "^1.2.3",
            },
          ],
          sourceOccurrences: [],
        },
        {
          name: "@pest-patrol/zeta",
          path: "packages/zeta",
          manifestPath: "packages/zeta/package.json",
          manifestDependencies: [
            {
              dependency: "@pest-patrol/adapter",
              section: "optionalDependencies",
              versionSpecifier: "workspace:^",
            },
            {
              dependency: "@pest-patrol/application",
              section: "peerDependencies",
              versionSpecifier: "workspace:~",
            },
            {
              dependency: "@pest-patrol/domain",
              section: "devDependencies",
              versionSpecifier: "workspace:^",
            },
            {
              dependency: "@pest-patrol/types",
              section: "dependencies",
              versionSpecifier: "workspace:*",
            },
          ],
          sourceOccurrences: [],
        },
      ],
    });
  });

  it("discovers manifest-bearing children under a nested literal workspace root", () => {
    const workspace = createWorkspace('packages:\n  - "fixtures/workspaces/*"\n');
    writeManifest(workspace, "fixtures/workspaces/example", {
      name: "@pest-patrol/example",
    });

    expect(collectWorkspaceArchitectureFacts(workspace)).toEqual({
      packages: [{
        name: "@pest-patrol/example",
        path: "fixtures/workspaces/example",
        manifestPath: "fixtures/workspaces/example/package.json",
        manifestDependencies: [],
        sourceOccurrences: [],
      }],
    });
  });

  it("rejects missing and malformed workspace files before collecting partial facts", () => {
    const missingWorkspaceFile = mkdtempSync(join(tmpdir(), "architecture-boundaries-"));
    temporaryWorkspaces.push(missingWorkspaceFile);

    expect(() => collectWorkspaceArchitectureFacts(missingWorkspaceFile)).toThrow(
      new RegExp(`${repositoryPath(missingWorkspaceFile, join(missingWorkspaceFile, "pnpm-workspace.yaml"))}.*read`),
    );

    const malformedWorkspace = createWorkspace("packages:\n  - apps/*\n");
    writeManifest(malformedWorkspace, "apps/ignored", { name: "@pest-patrol/ignored" });

    expect(() => collectWorkspaceArchitectureFacts(malformedWorkspace)).toThrow(
      "pnpm-workspace.yaml: packages must be a YAML string list",
    );
  });

  it("rejects recursive, absolute, and multi-segment workspace wildcards", () => {
    for (const pattern of ["apps/**", "/apps/*", "apps/*/nested"]) {
      const workspace = createWorkspace(`packages:\n  - "${pattern}"\n`);

      expect(() => collectWorkspaceArchitectureFacts(workspace)).toThrow(
        `pnpm-workspace.yaml: unsupported workspace pattern ${pattern}`,
      );
    }
  });

  it("reports the discovered manifest path for invalid JSON and missing names", () => {
    const invalidJsonWorkspace = createWorkspace();
    const invalidJsonManifest = join(invalidJsonWorkspace, "packages", "broken", "package.json");
    mkdirSync(join(invalidJsonWorkspace, "packages", "broken"), { recursive: true });
    writeFileSync(invalidJsonManifest, "{");

    expect(() => collectWorkspaceArchitectureFacts(invalidJsonWorkspace)).toThrow(
      `${repositoryPath(invalidJsonWorkspace, invalidJsonManifest)}: invalid JSON`,
    );

    const unnamedWorkspace = createWorkspace();
    writeManifest(unnamedWorkspace, "apps/unnamed", { name: "" });

    expect(() => collectWorkspaceArchitectureFacts(unnamedWorkspace)).toThrow(
      "apps/unnamed/package.json: name must be a non-empty string",
    );
  });
});
