import { afterEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import {
  type ArchitecturePolicy,
  type ManifestSection,
  type OccurrenceClass,
  type PackageArchitectureFact,
  type RebuildGraphFacts,
  type WorkspaceArchitectureFacts,
  collectWorkspaceArchitectureFacts,
  runArchitectureBoundariesCli,
  runArchitectureBoundariesMain,
  validateArchitectureFacts,
  validateArchitecturePolicy,
} from "./architecture-boundaries";

const DIGEST = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const CLI_TARGET_DIGEST =
  "52426cb7cd243cab4b07bd18b355378a754d0ea5c32706cca953dd2f85759a11";
const CLI_TYPE_DIGEST =
  "0ef3d97416c57c9c96fb7999cd1c11df68fdb9756d891dae2f37048efdffd818";

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

function writeSource(workspace: string, sourcePath: string, contents: string) {
  const absolutePath = join(workspace, sourcePath);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function writeJson(workspace: string, path: string, value: unknown) {
  const absolutePath = join(workspace, path);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function cliPolicy(): ArchitecturePolicy {
  return {
    schemaVersion: 1,
    packages: [
      {
        name: "@pest-patrol/importer",
        path: "packages/importer",
        state: "required",
        allowedDependencies: [
          {
            name: "@pest-patrol/target",
            manifestSections: ["dependencies"],
          },
        ],
      },
      {
        name: "@pest-patrol/target",
        path: "packages/target",
        state: "required",
        allowedDependencies: [],
      },
    ],
    exceptions: [],
  };
}

function cliException(): ArchitecturePolicy["exceptions"][number] {
  return {
    id: "importer-target-debt",
    kind: "missing-manifest-dependency",
    importer: "@pest-patrol/importer",
    dependency: "@pest-patrol/target",
    sourceOccurrences: [{
      path: "packages/importer/index.ts",
      specifier: "@pest-patrol/target",
      syntax: "import",
      occurrenceClass: "production-type",
      count: 1,
      bindingDigest: CLI_TARGET_DIGEST,
    }],
    manifest: { section: null, versionSpecifier: null },
    removeIn: "CR02",
    reason: "CR02 removes the fixture debt.",
  };
}

function createCliWorkspace() {
  const workspace = createWorkspace();
  writeManifest(workspace, "packages/importer", {
    name: "@pest-patrol/importer",
    dependencies: { "@pest-patrol/target": "workspace:*" },
  });
  writeSource(
    workspace,
    "packages/importer/index.ts",
    'import type { Target } from "@pest-patrol/target";\nexport type Importer = Target;\n',
  );
  writeManifest(workspace, "packages/target", {
    name: "@pest-patrol/target",
  });
  writeSource(
    workspace,
    "packages/target/index.ts",
    "export type Target = string;\n",
  );
  writeJson(workspace, "tooling/architecture-boundaries.json", cliPolicy());
  writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });
  return workspace;
}

function runCli(workspace: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = runArchitectureBoundariesCli({
    cwd: workspace,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  return { exitCode, stdout, stderr };
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

const EMPTY_REBUILD_GRAPH: RebuildGraphFacts = { nodes: [] };

function packageFact(
  name: string,
  path: string,
  overrides: Partial<PackageArchitectureFact> = {},
): PackageArchitectureFact {
  return {
    name,
    path,
    manifestPath: `${path}/package.json`,
    manifestDependencies: [],
    sourceOccurrences: [],
    ...overrides,
  };
}

function edgePolicy(
  manifestSections: ManifestSection[],
  importerState: "required" | "planned" = "required",
): ArchitecturePolicy {
  return {
    schemaVersion: 1,
    packages: [
      {
        name: "@pest-patrol/importer",
        path: "packages/importer",
        state: importerState,
        allowedDependencies: manifestSections.length === 0
          ? []
          : [{
              name: "@pest-patrol/target",
              manifestSections,
            }],
      },
      {
        name: "@pest-patrol/target",
        path: "packages/target",
        state: "required",
        allowedDependencies: [],
      },
    ],
    exceptions: [],
  };
}

function occurrence(
  occurrenceClass: OccurrenceClass,
  path = `packages/importer/src/${occurrenceClass}.ts`,
) {
  return {
    path,
    specifier: "@pest-patrol/target",
    syntax: "import" as const,
    occurrenceClass,
    count: 1,
    bindingDigest: DIGEST,
  };
}

function edgeFacts(
  manifestSections: ManifestSection[],
  occurrenceClasses: OccurrenceClass[] = [],
): WorkspaceArchitectureFacts {
  return {
    packages: [
      packageFact("@pest-patrol/importer", "packages/importer", {
        manifestDependencies: manifestSections.map((section) => ({
          dependency: "@pest-patrol/target",
          section,
          versionSpecifier: "workspace:*",
        })),
        sourceOccurrences: occurrenceClasses.map((occurrenceClass) =>
          occurrence(occurrenceClass)
        ),
      }),
      packageFact("@pest-patrol/target", "packages/target"),
    ],
  };
}

function factErrors(
  policy: ArchitecturePolicy,
  facts: WorkspaceArchitectureFacts,
) {
  return validateArchitectureFacts(policy, facts, EMPTY_REBUILD_GRAPH);
}

function forbiddenDebtPolicy(): ArchitecturePolicy {
  const policy = edgePolicy([]);
  policy.exceptions = [{
    id: "importer-target-debt",
    kind: "forbidden-workspace-edge",
    importer: "@pest-patrol/importer",
    dependency: "@pest-patrol/target",
    sourceOccurrences: [
      occurrence("production-type"),
      occurrence("production-value"),
    ],
    manifest: {
      section: "devDependencies",
      versionSpecifier: "workspace:*",
    },
    removeIn: "CR02",
    reason: "CR02 removes the forbidden edge.",
  }];
  return policy;
}

function forbiddenDebtFacts(): WorkspaceArchitectureFacts {
  return edgeFacts(
    ["devDependencies"],
    ["production-type", "production-value"],
  );
}

function missingManifestDebtPolicy(): ArchitecturePolicy {
  const policy = edgePolicy(["dependencies"]);
  policy.exceptions = [{
    id: "importer-target-manifest",
    kind: "missing-manifest-dependency",
    importer: "@pest-patrol/importer",
    dependency: "@pest-patrol/target",
    sourceOccurrences: [occurrence("production-type")],
    manifest: { section: null, versionSpecifier: null },
    removeIn: "CR02",
    reason: "CR02 adds the required manifest dependency.",
  }];
  return policy;
}

function removalGraph(
  status: string,
  ownership: string[] = [],
): RebuildGraphFacts {
  return { nodes: [{ id: "CR02", status, ownership }] };
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

  it("reports package-name ordering when a sibling package name is missing", () => {
    const policy = validPolicy();

    expect(errorsFor({
      ...policy,
      packages: [
        {
          name: "@pest-patrol/z",
          path: "packages/z",
          state: "required",
          allowedDependencies: [],
        },
        {
          path: "packages/missing",
          state: "planned",
          allowedDependencies: [],
        },
        {
          name: "@pest-patrol/a",
          path: "packages/a",
          state: "planned",
          allowedDependencies: [],
        },
      ],
    })).toEqual([
      "package at index 1 name must be an @pest-patrol/* package name",
      "packages must be sorted by name",
    ]);
  });

  it("reports duplicate package names when a sibling package name is missing", () => {
    const policy = validPolicy();

    expect(errorsFor({
      ...policy,
      packages: [
        {
          name: "@pest-patrol/a",
          path: "packages/a",
          state: "planned",
          allowedDependencies: [],
        },
        {
          path: "packages/missing",
          state: "planned",
          allowedDependencies: [],
        },
        {
          name: "@pest-patrol/a",
          path: "packages/a-copy",
          state: "planned",
          allowedDependencies: [],
        },
      ],
    })).toEqual([
      "package @pest-patrol/a name is duplicated",
      "package at index 1 name must be an @pest-patrol/* package name",
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

  it.each([
    "@pest-patrol/domain/nested",
    "@pest-patrol/domain ",
    "@pest-patrol/Domain",
    "@pest-patrol/domain--rules",
    "@pest-patrol/domain_rules",
  ])("rejects malformed package name %s", (name) => {
    const policy = validPolicy();
    policy.packages[0] = { ...policy.packages[0], name };

    expect(errorsFor(policy)).toContain(
      `package ${name} name must be an @pest-patrol/* package name`,
    );
  });

  it.each([
    "Domain Debt",
    "domain_debt",
    "domain--debt",
    "-domain-debt",
    "domain-debt-",
    "domain/debt",
  ])("rejects malformed exception ID %s", (id) => {
    const policy = validPolicy();
    policy.packages[0].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    policy.exceptions = [exceptionWith({ id })];

    expect(errorsFor(policy)).toContain(
      `exception ${id} ID must be kebab-case`,
    );
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

  it("reports exception-ID ordering when a sibling exception ID is missing", () => {
    const policy = validPolicy();
    policy.packages[0].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    const missingId: Record<string, unknown> = exceptionWith();
    delete missingId.id;

    expect(errorsFor({
      ...policy,
      exceptions: [
        exceptionWith({ id: "z" }),
        missingId,
        exceptionWith({ id: "a" }),
      ],
    })).toEqual([
      "exception at index 1 ID must be a non-empty string",
      "exceptions must be sorted by ID",
    ]);
  });

  it("reports duplicate exception IDs when a sibling exception ID is missing", () => {
    const policy = validPolicy();
    policy.packages[0].allowedDependencies = [
      { name: "@pest-patrol/types", manifestSections: ["dependencies"] },
    ];
    const missingId: Record<string, unknown> = exceptionWith();
    delete missingId.id;

    expect(errorsFor({
      ...policy,
      exceptions: [
        exceptionWith({ id: "a" }),
        missingId,
        exceptionWith({ id: "a" }),
      ],
    })).toEqual([
      "exception a is duplicated",
      "exception at index 1 ID must be a non-empty string",
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
      "exception A! ID must be kebab-case",
      "exception A! dependency @pest-patrol/A must name a policy package",
      "exception A! importer @pest-patrol/a! must name a policy package",
      "exception z! ID must be kebab-case",
      "exception z! dependency @pest-patrol/A must name a policy package",
      "exception z! importer @pest-patrol/a! must name a policy package",
      "exception z! sourceOccurrences must be sorted",
      "exceptions must be sorted by ID",
      "package @pest-patrol/A name must be an @pest-patrol/* package name",
      "package @pest-patrol/a! allowed dependencies must be sorted",
      "package @pest-patrol/a! name must be an @pest-patrol/* package name",
      "packages must be sorted by name",
    ]);
  });
});

describe("architecture facts", () => {
  it("accepts an absent planned package but rejects an absent required package", () => {
    const policy = validPolicy();
    const facts = {
      packages: [packageFact("@pest-patrol/types", "packages/types")],
    };

    expect(factErrors(policy, facts)).toEqual([]);

    policy.packages[0].state = "required";
    expect(factErrors(policy, facts)).toEqual([
      "required package @pest-patrol/application is missing at packages/application",
    ]);
  });

  it("rejects unlisted packages and required packages with the wrong name or path in sorted order", () => {
    const policy: ArchitecturePolicy = {
      schemaVersion: 1,
      packages: [
        {
          name: "@pest-patrol/by-name",
          path: "packages/by-name",
          state: "required",
          allowedDependencies: [],
        },
        {
          name: "@pest-patrol/by-path",
          path: "packages/by-path",
          state: "required",
          allowedDependencies: [],
        },
        {
          name: "@pest-patrol/missing",
          path: "packages/missing",
          state: "required",
          allowedDependencies: [],
        },
      ],
      exceptions: [],
    };
    const facts = {
      packages: [
        packageFact("@pest-patrol/z-unlisted", "packages/z-unlisted"),
        packageFact("@pest-patrol/by-name", "packages/wrong-path"),
        packageFact("@pest-patrol/wrong-name", "packages/by-path"),
        packageFact("@pest-patrol/a-unlisted", "apps/a-unlisted"),
      ],
    };

    expect(factErrors(policy, facts)).toEqual([
      "discovered package @pest-patrol/a-unlisted at apps/a-unlisted is missing from policy",
      "discovered package @pest-patrol/z-unlisted at packages/z-unlisted is missing from policy",
      "package @pest-patrol/by-name found at packages/wrong-path; expected packages/by-name",
      "package at packages/by-path has name @pest-patrol/wrong-name; expected @pest-patrol/by-path",
      "required package @pest-patrol/missing is missing at packages/missing",
    ]);
  });

  it("validates a present planned package against its declared permissions", () => {
    const policy = edgePolicy([], "planned");
    const facts = edgeFacts([], ["production-value"]);

    expect(factErrors(policy, facts)).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-value.ts",
    ]);
  });
});

describe("unknown Pest Patrol targets", () => {
  it("governs a manifest-only target absent from policy and workspace discovery", () => {
    const policy = edgePolicy([]);
    policy.packages = [policy.packages[0]];
    const facts = {
      packages: [packageFact("@pest-patrol/importer", "packages/importer", {
        manifestDependencies: [{
          dependency: "@pest-patrol/new-debt",
          section: "dependencies",
          versionSpecifier: "workspace:*",
        }],
      })],
    };

    expect(factErrors(policy, facts)).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/new-debt; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=none",
    ]);
  });

  it("governs a source-only target absent from policy and workspace discovery", () => {
    const policy = edgePolicy([]);
    policy.packages = [policy.packages[0]];
    const facts = {
      packages: [packageFact("@pest-patrol/importer", "packages/importer", {
        sourceOccurrences: [{
          ...occurrence(
            "production-value",
            "packages/importer/src/unknown-target.ts",
          ),
          specifier: "@pest-patrol/new-debt",
        }],
      })],
    };

    expect(factErrors(policy, facts)).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/new-debt; manifest=packages/importer/package.json[none]; sources=packages/importer/src/unknown-target.ts",
    ]);
  });
});

describe("debt exceptions", () => {
  it("suppresses precisely matched forbidden-edge and missing-manifest debt", () => {
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      removalGraph("planned"),
    )).toEqual([]);
    expect(validateArchitectureFacts(
      missingManifestDebtPolicy(),
      edgeFacts([], ["production-type"]),
      removalGraph("planned"),
    )).toEqual([]);
  });

  it.each([
    {
      name: "an added source occurrence",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences.push(
          occurrence("test-value", "packages/importer/src/added.ts"),
        );
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "a removed source occurrence",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences.pop();
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "a duplicated source occurrence",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences.push({
          ...facts.packages[0].sourceOccurrences[0],
        });
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "same-file occurrence-count growth",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences[0].count = 2;
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "type-to-value occurrence drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences[0].occurrenceClass = "production-value";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "syntax-form drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences[0].syntax = "export";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "canonical-specifier drift",
      mutate(policy: ArchitecturePolicy) {
        policy.exceptions[0].sourceOccurrences[0].specifier = "@pest-patrol/importer";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "binding-digest drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].sourceOccurrences[0].bindingDigest = "f".repeat(64);
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "manifest-section drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].manifestDependencies[0].section = "peerDependencies";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "manifest-version drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].manifestDependencies[0].versionSpecifier = "workspace:^";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "manifest present-to-absent drift",
      mutate(_policy: ArchitecturePolicy, facts: WorkspaceArchitectureFacts) {
        facts.packages[0].manifestDependencies = [];
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
    {
      name: "importer drift",
      mutate(policy: ArchitecturePolicy) {
        policy.exceptions[0].importer = "@pest-patrol/target";
        return "@pest-patrol/target -> @pest-patrol/target";
      },
    },
    {
      name: "dependency drift",
      mutate(policy: ArchitecturePolicy) {
        policy.exceptions[0].dependency = "@pest-patrol/importer";
        return "@pest-patrol/importer -> @pest-patrol/importer";
      },
    },
    {
      name: "violation-kind drift",
      mutate(policy: ArchitecturePolicy) {
        policy.exceptions[0].kind = "missing-manifest-dependency";
        return "@pest-patrol/importer -> @pest-patrol/target";
      },
    },
  ])("rejects $name", ({ mutate }) => {
    const policy = forbiddenDebtPolicy();
    const facts = forbiddenDebtFacts();
    const edge = mutate(policy, facts);

    expect(validateArchitectureFacts(
      policy,
      facts,
      removalGraph("planned"),
    )).toContain(
      `exception importer-target-debt is stale or drifted for ${edge}`,
    );
  });

  it("rejects an exception left behind after its violation disappears", () => {
    expect(validateArchitectureFacts(
      missingManifestDebtPolicy(),
      edgeFacts([], []),
      removalGraph("planned"),
    )).toEqual([
      "exception importer-target-manifest is stale or drifted for @pest-patrol/importer -> @pest-patrol/target",
    ]);
  });

  it("rejects multiple exception IDs that consume one observed violation", () => {
    const policy = forbiddenDebtPolicy();
    policy.exceptions.push({
      ...policy.exceptions[0],
      id: "second-importer-target-debt",
    });

    expect(validateArchitectureFacts(
      policy,
      forbiddenDebtFacts(),
      removalGraph("planned"),
    )).toEqual([
      "exception second-importer-target-debt contradicts importer-target-debt for @pest-patrol/importer -> @pest-patrol/target: both match one observed violation",
    ]);
  });

  it("reports new unexcepted debt beside a precisely matched exception", () => {
    const facts = forbiddenDebtFacts();
    facts.packages[0].manifestDependencies.push({
      dependency: "@pest-patrol/target",
      section: "peerDependencies",
      versionSpecifier: "workspace:^",
    });

    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      facts,
      removalGraph("planned"),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[peerDependencies]=workspace:^; sources=packages/importer/src/production-type.ts,packages/importer/src/production-value.ts",
    ]);
  });
});

describe("removal node lifecycle and ownership", () => {
  it("rejects an unknown removal node but accepts planned without future ownership", () => {
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      EMPTY_REBUILD_GRAPH,
    )).toEqual([
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target has unknown removal node CR02",
    ]);
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      removalGraph("planned"),
    )).toEqual([]);
  });

  it.each(["blocked", "done", "abandoned"])(
    "rejects removal node status %s",
    (status) => {
      expect(validateArchitectureFacts(
        forbiddenDebtPolicy(),
        forbiddenDebtFacts(),
        removalGraph(status),
      )).toEqual([
        `exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target has invalid removal node CR02 status ${status}`,
      ]);
    },
  );

  it("rejects a superseded removal node without inheriting replacement ownership", () => {
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      {
        nodes: [
          { id: "CR02", status: "superseded", ownership: [] },
          {
            id: "CR03",
            status: "ready",
            ownership: [
              "packages/importer",
              "tooling/architecture-boundaries.json",
            ],
          },
        ],
      },
    )).toEqual([
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target has invalid removal node CR02 status superseded",
    ]);
  });

  it.each(["ready", "running"])(
    "accepts a %s removal node whose component ownership covers every required path",
    (status) => {
      expect(validateArchitectureFacts(
        forbiddenDebtPolicy(),
        forbiddenDebtFacts(),
        removalGraph(status, [
          "packages/importer",
          "tooling/architecture-boundaries.json",
        ]),
      )).toEqual([]);
    },
  );

  it("rejects every deterministically sorted path uncovered by promoted removal node ownership", () => {
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      removalGraph("ready"),
    )).toEqual([
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/package.json",
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/src/production-type.ts",
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/src/production-value.ts",
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own tooling/architecture-boundaries.json",
    ]);
  });

  it("does not let prefix-lookalike ownership cover package descendants", () => {
    expect(validateArchitectureFacts(
      forbiddenDebtPolicy(),
      forbiddenDebtFacts(),
      removalGraph("running", [
        "packages/importer-old",
        "tooling/architecture-boundaries.json",
      ]),
    )).toEqual([
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/package.json",
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/src/production-type.ts",
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target removal node CR02 does not own packages/importer/src/production-value.ts",
    ]);
  });

  it("validates removal-node status even when the exception is stale", () => {
    const facts = forbiddenDebtFacts();
    facts.packages[0].sourceOccurrences[0].bindingDigest = "f".repeat(64);

    const errors = validateArchitectureFacts(
      forbiddenDebtPolicy(),
      facts,
      removalGraph("done"),
    );

    expect(errors).toContain(
      "exception importer-target-debt is stale or drifted for @pest-patrol/importer -> @pest-patrol/target",
    );
    expect(errors).toContain(
      "exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target has invalid removal node CR02 status done",
    );
  });
});

describe("manifest sections", () => {
  it("accepts a manifest-only edge only in a section permitted for that exact edge", () => {
    expect(factErrors(
      edgePolicy(["dependencies"]),
      edgeFacts(["dependencies"]),
    )).toEqual([]);

    expect(factErrors(
      edgePolicy(["dependencies"]),
      edgeFacts(["devDependencies"]),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[devDependencies]=workspace:*; sources=none",
    ]);
  });

  it("requires production value and type occurrences to have a permitted runtime declaration", () => {
    const policy = edgePolicy(["dependencies", "devDependencies"]);
    const classes: OccurrenceClass[] = [
      "production-type",
      "production-value",
    ];

    expect(factErrors(policy, edgeFacts(["devDependencies"], classes))).toEqual([
      "missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-type.ts,packages/importer/src/production-value.ts",
    ]);
    expect(factErrors(policy, edgeFacts(["dependencies"], classes))).toEqual([]);
  });

  it("allows test value and type occurrences to use devDependencies only when explicitly permitted", () => {
    const classes: OccurrenceClass[] = ["test-type", "test-value"];

    expect(factErrors(
      edgePolicy(["devDependencies"]),
      edgeFacts(["devDependencies"], classes),
    )).toEqual([]);

    expect(factErrors(
      edgePolicy(["dependencies"]),
      edgeFacts(["devDependencies"], classes),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[devDependencies]=workspace:*; sources=packages/importer/src/test-type.ts,packages/importer/src/test-value.ts",
      "missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/test-type.ts,packages/importer/src/test-value.ts",
    ]);
  });

  it("accepts peer and optional declarations only when the exact edge names them", () => {
    for (const section of [
      "optionalDependencies",
      "peerDependencies",
    ] as const) {
      expect(factErrors(
        edgePolicy([section]),
        edgeFacts([section], ["production-value"]),
      )).toEqual([]);

      expect(factErrors(
        edgePolicy(["dependencies"]),
        edgeFacts([section], ["production-value"]),
      )).toEqual([
        `forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[${section}]=workspace:*; sources=packages/importer/src/production-value.ts`,
        "missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-value.ts",
      ]);
    }
  });

  it("requires every applicable occurrence class when production and test uses coexist", () => {
    const classes: OccurrenceClass[] = ["production-value", "test-value"];
    const policy = edgePolicy(["dependencies", "devDependencies"]);

    expect(factErrors(policy, edgeFacts(["devDependencies"], classes))).toEqual([
      "missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-value.ts,packages/importer/src/test-value.ts",
    ]);
    expect(factErrors(
      policy,
      edgeFacts(["dependencies", "devDependencies"], classes),
    )).toEqual([]);
  });

  it("reports an allowed source edge without a suitable declaration as missing", () => {
    expect(factErrors(
      edgePolicy(["dependencies"]),
      edgeFacts([], ["production-type"]),
    )).toEqual([
      "missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-type.ts",
    ]);
  });

  it("reports manifest and source edges absent from the importer allowlist as forbidden", () => {
    expect(factErrors(
      edgePolicy([]),
      edgeFacts(["peerDependencies", "dependencies"]),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=none",
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[peerDependencies]=workspace:*; sources=none",
    ]);
    expect(factErrors(
      edgePolicy([]),
      edgeFacts([], ["production-value"]),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/src/production-value.ts",
    ]);
  });

  it("validates every declaration when an internal dependency appears in two sections", () => {
    expect(factErrors(
      edgePolicy(["dependencies", "peerDependencies"]),
      edgeFacts(["dependencies", "peerDependencies"]),
    )).toEqual([]);

    expect(factErrors(
      edgePolicy(["dependencies"]),
      edgeFacts(["dependencies", "peerDependencies"]),
    )).toEqual([
      "forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[peerDependencies]=workspace:*; sources=none",
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

  it("rejects symbolic links used as immediate workspace children", () => {
    const workspace = createWorkspace();
    const targetPath = join(workspace, "fixtures", "linked-package");
    mkdirSync(targetPath, { recursive: true });
    symlinkSync(targetPath, join(workspace, "packages", "linked"), "dir");

    expect(() => collectWorkspaceArchitectureFacts(workspace)).toThrow(
      "packages/linked: symbolic links are not supported",
    );
  });

  it("rejects symbolic links in package source file and ignored-directory positions", () => {
    const fileWorkspace = createWorkspace();
    writeManifest(fileWorkspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    const fileTarget = join(fileWorkspace, "fixtures", "linked.ts");
    writeSource(fileWorkspace, "fixtures/linked.ts", "export {};\n");
    const fileLink = join(fileWorkspace, "packages", "example", "src", "linked.ts");
    mkdirSync(join(fileLink, ".."), { recursive: true });
    symlinkSync(fileTarget, fileLink, "file");

    expect(() => collectWorkspaceArchitectureFacts(fileWorkspace)).toThrow(
      "packages/example/src/linked.ts: symbolic links are not supported",
    );

    const directoryWorkspace = createWorkspace();
    writeManifest(directoryWorkspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    const directoryTarget = join(directoryWorkspace, "fixtures", "generated");
    mkdirSync(directoryTarget, { recursive: true });
    symlinkSync(
      directoryTarget,
      join(directoryWorkspace, "packages", "example", "generated"),
      "dir",
    );

    expect(() => collectWorkspaceArchitectureFacts(directoryWorkspace)).toThrow(
      "packages/example/generated: symbolic links are not supported",
    );
  });

  it("rejects a configured workspace root that is a symbolic link", () => {
    const workspace = createWorkspace(
      'packages:\n  - "linked-packages/*"\n',
    );
    const targetPath = join(workspace, "fixtures", "root-target");
    writeManifest(workspace, "fixtures/root-target/example", {
      name: "@pest-patrol/example",
    });
    symlinkSync(targetPath, join(workspace, "linked-packages"), "dir");

    expect(() => collectWorkspaceArchitectureFacts(workspace)).toThrow(
      "linked-packages: symbolic links are not supported",
    );
  });

  it("rejects a symbolic link in an intermediate configured workspace root component", () => {
    const workspace = createWorkspace(
      'packages:\n  - "fixtures/workspaces/*"\n',
    );
    const targetPath = join(workspace, "targets", "intermediate");
    writeManifest(workspace, "targets/intermediate/workspaces/example", {
      name: "@pest-patrol/example",
    });
    symlinkSync(targetPath, join(workspace, "fixtures"), "dir");

    expect(() => collectWorkspaceArchitectureFacts(workspace)).toThrow(
      "fixtures: symbolic links are not supported",
    );
  });
});

describe("TypeScript source facts", () => {
  it("classifies supported syntax in production, test filenames, and __tests__ directories", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    const source = `
      import value, { helper, type Model as LocalModel } from "@pest-patrol/domain/subpath";
      import type { Contract } from "@pest-patrol/types";
      export { rule, type RuleInput } from "@pest-patrol/domain";
      export type * from "@pest-patrol/types";
      void import("@pest-patrol/api-client/lazy");
      const adapter = require("@pest-patrol/api-client");
      type RemoteContract = import("@pest-patrol/types").Contract;
      import legacyAdapter = require("@pest-patrol/api-client/legacy");
    `;
    for (const sourcePath of [
      "packages/example/src/thing.ts",
      "packages/example/src/thing.test.ts",
      "packages/example/src/thing.spec.tsx",
      "packages/example/src/__tests__/thing.ts",
    ]) {
      writeSource(workspace, sourcePath, source);
    }

    const occurrences =
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences;

    expect(occurrences).toHaveLength(36);
    expect(Object.fromEntries(
      [
        "packages/example/src/__tests__/thing.ts",
        "packages/example/src/thing.spec.tsx",
        "packages/example/src/thing.test.ts",
        "packages/example/src/thing.ts",
      ].map((path) => [
        path,
        occurrences
          .filter((occurrence) => occurrence.path === path)
          .map((occurrence) => [
            occurrence.syntax,
            occurrence.occurrenceClass,
          ]),
      ]),
    )).toEqual({
      "packages/example/src/__tests__/thing.ts": [
        ["dynamic-import", "test-value"],
        ["import", "test-value"],
        ["require", "test-value"],
        ["export", "test-type"],
        ["export", "test-value"],
        ["import", "test-type"],
        ["import", "test-value"],
        ["export", "test-type"],
        ["import", "test-type"],
      ],
      "packages/example/src/thing.spec.tsx": [
        ["dynamic-import", "test-value"],
        ["import", "test-value"],
        ["require", "test-value"],
        ["export", "test-type"],
        ["export", "test-value"],
        ["import", "test-type"],
        ["import", "test-value"],
        ["export", "test-type"],
        ["import", "test-type"],
      ],
      "packages/example/src/thing.test.ts": [
        ["dynamic-import", "test-value"],
        ["import", "test-value"],
        ["require", "test-value"],
        ["export", "test-type"],
        ["export", "test-value"],
        ["import", "test-type"],
        ["import", "test-value"],
        ["export", "test-type"],
        ["import", "test-type"],
      ],
      "packages/example/src/thing.ts": [
        ["dynamic-import", "production-value"],
        ["import", "production-value"],
        ["require", "production-value"],
        ["export", "production-type"],
        ["export", "production-value"],
        ["import", "production-type"],
        ["import", "production-value"],
        ["export", "production-type"],
        ["import", "production-type"],
      ],
    });
    expect([
      ...new Set(occurrences.map((occurrence) => occurrence.path)),
    ]).toEqual([
      "packages/example/src/__tests__/thing.ts",
      "packages/example/src/thing.spec.tsx",
      "packages/example/src/thing.test.ts",
      "packages/example/src/thing.ts",
    ]);
    expect(
      [
        ...new Set(occurrences.map((occurrence) => occurrence.specifier)),
      ].sort(),
    ).toEqual([
      "@pest-patrol/api-client",
      "@pest-patrol/domain",
      "@pest-patrol/types",
    ]);
    expect(
      [...new Set(occurrences.map((occurrence) => occurrence.syntax))].sort(),
    ).toEqual(["dynamic-import", "export", "import", "require"]);
    expect(
      [
        ...new Set(occurrences.map((occurrence) => occurrence.occurrenceClass)),
      ].sort(),
    ).toEqual([
      "production-type",
      "production-value",
      "test-type",
      "test-value",
    ]);
    expect(
      [
        ...new Set(
          occurrences.map(
            (occurrence) =>
              `${occurrence.syntax}:${occurrence.occurrenceClass}`,
          ),
        ),
      ].sort(),
    ).toEqual([
      "dynamic-import:production-value",
      "dynamic-import:test-value",
      "export:production-type",
      "export:production-value",
      "export:test-type",
      "export:test-value",
      "import:production-type",
      "import:production-value",
      "import:test-type",
      "import:test-value",
      "require:production-value",
      "require:test-value",
    ]);
  });

  it("ignores unsupported specifiers, non-literal calls, declarations, and excluded directories", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    writeSource(
      workspace,
      "packages/example/src/thing.ts",
      `
      import local from "./local";
      import react from "react";
      export { external } from "external-package";
      const specifier = "@pest-patrol/domain";
      void import(specifier);
      require(specifier);
    `,
    );
    writeSource(
      workspace,
      "packages/example/src/ignored.d.ts",
      'export { Contract } from "@pest-patrol/types";',
    );
    for (const directory of [
      "node_modules",
      ".next",
      "dist",
      "build",
      "coverage",
      "generated",
    ]) {
      writeSource(
        workspace,
        `packages/example/src/${directory}/ignored.ts`,
        'import "@pest-patrol/domain";',
      );
    }

    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([]);
  });

  it("collects empty value and type named clauses as import and re-export edges", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    writeSource(
      workspace,
      "packages/example/src/empty-clauses.ts",
      `
      import {} from "@pest-patrol/target/import-value";
      import type {} from "@pest-patrol/target/import-type";
      export {} from "@pest-patrol/target/export-value";
      export type {} from "@pest-patrol/target/export-type";
    `,
    );

    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([
      {
        path: "packages/example/src/empty-clauses.ts",
        specifier: "@pest-patrol/target",
        syntax: "export",
        occurrenceClass: "production-type",
        count: 1,
        bindingDigest:
          "6c7accfe4beda7ac50b2228fb8e847f3900c2ed65b1b8b729a5d5f88c753d066",
      },
      {
        path: "packages/example/src/empty-clauses.ts",
        specifier: "@pest-patrol/target",
        syntax: "export",
        occurrenceClass: "production-value",
        count: 1,
        bindingDigest:
          "6c7accfe4beda7ac50b2228fb8e847f3900c2ed65b1b8b729a5d5f88c753d066",
      },
      {
        path: "packages/example/src/empty-clauses.ts",
        specifier: "@pest-patrol/target",
        syntax: "import",
        occurrenceClass: "production-type",
        count: 1,
        bindingDigest:
          "6c7accfe4beda7ac50b2228fb8e847f3900c2ed65b1b8b729a5d5f88c753d066",
      },
      {
        path: "packages/example/src/empty-clauses.ts",
        specifier: "@pest-patrol/target",
        syntax: "import",
        occurrenceClass: "production-value",
        count: 1,
        bindingDigest:
          "6c7accfe4beda7ac50b2228fb8e847f3900c2ed65b1b8b729a5d5f88c753d066",
      },
    ]);
  });

  it("collects runtime literals through transparent wrappers and additional arguments", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    writeSource(
      workspace,
      "packages/example/src/runtime.ts",
      `
      void import("@pest-patrol/target/bare");
      void import("@pest-patrol/target/options", { with: { type: "json" } });
      void import(("@pest-patrol/target/parenthesized"));
      void import("@pest-patrol/target/as" as string);
      void import(<string>"@pest-patrol/target/asserted");
      void import("@pest-patrol/target/satisfies" satisfies string);
      void import("@pest-patrol/target/non-null"!);

      require("@pest-patrol/target/bare");
      require("@pest-patrol/target/extra", "ignored");
      require(("@pest-patrol/target/parenthesized"));
      require("@pest-patrol/target/as" as string);
      require(<string>"@pest-patrol/target/asserted");
      require("@pest-patrol/target/satisfies" satisfies string);
      require("@pest-patrol/target/non-null"!);

      const target = "@pest-patrol/ignored";
      void import(target);
      require(\`@pest-patrol/ignored\`);
      void import("@pest-patrol" + "/ignored");
    `,
    );

    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([
      {
        path: "packages/example/src/runtime.ts",
        specifier: "@pest-patrol/target",
        syntax: "dynamic-import",
        occurrenceClass: "production-value",
        count: 7,
        bindingDigest:
          "aa056a0fc0b1f278c24f2690197d1b82e5493ce6005994537f03c2999edcddbd",
      },
      {
        path: "packages/example/src/runtime.ts",
        specifier: "@pest-patrol/target",
        syntax: "require",
        occurrenceClass: "production-value",
        count: 7,
        bindingDigest:
          "aa056a0fc0b1f278c24f2690197d1b82e5493ce6005994537f03c2999edcddbd",
      },
    ]);
  });

  it("normalizes import-type qualifier digests without source trivia", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    const sourcePath = "packages/example/src/import-type.ts";
    const expectedOccurrence = {
      path: sourcePath,
      specifier: "@pest-patrol/types",
      syntax: "import" as const,
      occurrenceClass: "production-type" as const,
      count: 1,
      bindingDigest:
        "79715f1f08af7f25c89d5dc859655008bb57dfc348d78e97216de070e202d9a7",
    };

    writeSource(
      workspace,
      sourcePath,
      'type Contract = import("@pest-patrol/types").Foo.Bar;\n',
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([expectedOccurrence]);

    writeSource(
      workspace,
      sourcePath,
      'type Contract = import("@pest-patrol/types").Foo /* stable */ . /* trivia */ Bar;\n',
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([expectedOccurrence]);

    writeSource(
      workspace,
      sourcePath,
      'type Contract = import("@pest-patrol/types").Foo.Baz;\n',
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([{
      ...expectedOccurrence,
      bindingDigest:
        "dcf54863b7c114b5177072fddd3143846a7649d5a39f2daf35bbd83f2929fa5a",
    }]);
  });

  it("normalizes every binding form into literal binding digests", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    writeSource(
      workspace,
      "packages/example/src/bindings.ts",
      `
      import primary, { helper as localHelper, type Model as LocalModel } from "@pest-patrol/domain/one";
      import * as domainNamespace from "@pest-patrol/domain/two";
      import "@pest-patrol/domain/side-effect";
      export { rule as localRule, type RuleInput as LocalRuleInput } from "@pest-patrol/domain/exports";
      export * from "@pest-patrol/domain/star";
      void import("@pest-patrol/api-client/lazy");
      const adapter = require("@pest-patrol/api-client");
      type RemoteContract = import("@pest-patrol/types").Contract;
      type WholeModule = import("@pest-patrol/types/all");
      import legacyAdapter = require("@pest-patrol/api-client/legacy");
      import type LegacyContract = require("@pest-patrol/types/legacy");
    `,
    );

    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/api-client",
        syntax: "dynamic-import",
        occurrenceClass: "production-value",
        count: 1,
        bindingDigest:
          "6d25a851b1aa0a590cb1b40918400be43403b31d26452f56553f97569baa5e5b",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/api-client",
        syntax: "import",
        occurrenceClass: "production-value",
        count: 1,
        bindingDigest:
          "6d25a851b1aa0a590cb1b40918400be43403b31d26452f56553f97569baa5e5b",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/api-client",
        syntax: "require",
        occurrenceClass: "production-value",
        count: 1,
        bindingDigest:
          "6d25a851b1aa0a590cb1b40918400be43403b31d26452f56553f97569baa5e5b",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/domain",
        syntax: "export",
        occurrenceClass: "production-type",
        count: 1,
        bindingDigest:
          "af6b5fb77d03749cc130f13378af86240981251553ac590cfe3abc224db8dda1",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/domain",
        syntax: "export",
        occurrenceClass: "production-value",
        count: 2,
        bindingDigest:
          "77e10fbd465df018b2083e6a9a7d01fc9d2a19beb6a7a8d35478bbcf09bc6baf",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/domain",
        syntax: "import",
        occurrenceClass: "production-type",
        count: 1,
        bindingDigest:
          "0082599e053d88f94ed659bd22e2453117f651ce264976b35ed345e6687fa73b",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/domain",
        syntax: "import",
        occurrenceClass: "production-value",
        count: 3,
        bindingDigest:
          "5671a10bf55187cea93e1c119c45c1cac8060dba25794c8f6e062b78cd7e9252",
      },
      {
        path: "packages/example/src/bindings.ts",
        specifier: "@pest-patrol/types",
        syntax: "import",
        occurrenceClass: "production-type",
        count: 3,
        bindingDigest:
          "6e57c7729cebebfd69a5a4de9f3f69451e570b038fd27c6810fa92daabb1cfc7",
      },
    ]);
  });

  it("keeps the binding digest stable across aliases and subpaths but changes it for same-file growth", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/example", {
      name: "@pest-patrol/example",
    });
    const sourcePath = "packages/example/src/growth.ts";
    const expectedStableOccurrence = {
      path: sourcePath,
      specifier: "@pest-patrol/domain",
      syntax: "import",
      occurrenceClass: "production-value",
      count: 2,
      bindingDigest:
        "138bf4722f7ae17122c7282d0eb156499d349940e129bd4cdf27c8ffdcbb3d25",
    };
    writeSource(
      workspace,
      sourcePath,
      `
      import { alpha as LocalAlpha } from "@pest-patrol/domain/one";
      import { beta as LocalBeta } from "@pest-patrol/domain/two";
    `,
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([expectedStableOccurrence]);

    writeSource(
      workspace,
      sourcePath,
      `
      import { alpha as RenamedAlpha } from "@pest-patrol/domain/one";
      import { beta as RenamedBeta } from "@pest-patrol/domain/two";
    `,
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([expectedStableOccurrence]);

    writeSource(
      workspace,
      sourcePath,
      `
      import { alpha as LocalAlpha } from "@pest-patrol/domain/changed-one";
      import { beta as LocalBeta } from "@pest-patrol/domain/changed-two";
    `,
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([expectedStableOccurrence]);

    writeSource(
      workspace,
      sourcePath,
      `
      import { alpha as LocalAlpha } from "@pest-patrol/domain/one";
      import { beta as LocalBeta } from "@pest-patrol/domain/two";
      import { alpha as ThirdAlpha } from "@pest-patrol/domain/three";
    `,
    );
    expect(
      collectWorkspaceArchitectureFacts(workspace).packages[0]
        .sourceOccurrences,
    ).toEqual([
      {
        ...expectedStableOccurrence,
        count: 3,
        bindingDigest:
          "caa15d1e302fbb3aca091ba5ee7d579ce46573d0a9fc638b6cde37306b7b0016",
      },
    ]);
  });
});

describe("architecture CLI", () => {
  it("reports one success line for a conforming workspace without rewriting inputs", () => {
    const workspace = createCliWorkspace();
    const inputPaths = [
      "pnpm-workspace.yaml",
      "tooling/architecture-boundaries.json",
      "docs/rebuild/graph.json",
      "packages/importer/package.json",
      "packages/importer/index.ts",
      "packages/target/package.json",
      "packages/target/index.ts",
    ];
    const before = inputPaths.map((path) =>
      readFileSync(join(workspace, path), "utf8"),
    );

    expect(runCli(workspace)).toEqual({
      exitCode: 0,
      stdout: [
        "Architecture boundaries valid: 2 workspace packages, 0 matched exceptions",
      ],
      stderr: [],
    });
    expect(
      inputPaths.map((path) => readFileSync(join(workspace, path), "utf8")),
    ).toEqual(before);
  });

  it("returns path-qualified errors for missing files and malformed JSON", () => {
    const missingPolicy = createCliWorkspace();
    rmSync(join(missingPolicy, "tooling/architecture-boundaries.json"));
    expect(runCli(missingPolicy)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: read failed",
      ],
    });

    const malformedPolicy = createCliWorkspace();
    writeFileSync(
      join(malformedPolicy, "tooling/architecture-boundaries.json"),
      "{",
    );
    expect(runCli(malformedPolicy)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: invalid JSON",
      ],
    });

    const missingGraph = createCliWorkspace();
    rmSync(join(missingGraph, "docs/rebuild/graph.json"));
    expect(runCli(missingGraph)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: docs/rebuild/graph.json: read failed",
      ],
    });
  });

  it("returns path-qualified errors for invalid policy and collection input", () => {
    const invalidPolicy = createCliWorkspace();
    writeJson(invalidPolicy, "tooling/architecture-boundaries.json", {
      ...cliPolicy(),
      schemaVersion: 2,
    });
    writeFileSync(
      join(invalidPolicy, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    expect(runCli(invalidPolicy)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: schemaVersion must be 1",
      ],
    });

    const collectionFailure = createCliWorkspace();
    writeFileSync(
      join(collectionFailure, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    expect(runCli(collectionFailure)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: pnpm-workspace.yaml: packages must be a YAML string list",
      ],
    });
  });

  it("validates minimal graph input before architecture facts", () => {
    const workspace = createCliWorkspace();
    const policy = cliPolicy();
    policy.packages[0].allowedDependencies = [];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", {
      nodes: [
        { id: "CR02", status: "planned", ownership: "packages/importer" },
      ],
    });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: docs/rebuild/graph.json: node CR02 ownership must be an array of normalized repository-relative paths",
      ],
    });
  });

  it("returns path-qualified architecture violations", () => {
    const workspace = createCliWorkspace();
    const policy = cliPolicy();
    policy.packages[0].allowedDependencies = [];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=packages/importer/index.ts",
      ],
    });
  });

  it("returns nonzero for an unknown Pest Patrol target", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
      dependencies: { "@pest-patrol/new-debt": "workspace:*" },
    });
    const policy = cliPolicy();
    policy.packages = [policy.packages[0]];
    policy.packages[0].allowedDependencies = [];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/new-debt; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=none",
      ],
    });
  });

  it("runtime literal CLI rejects an unknown target through a transparent wrapper", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
    });
    writeSource(
      workspace,
      "packages/importer/index.ts",
      'void import(("@pest-patrol/unknown/wrapped"));\n',
    );
    const policy = cliPolicy();
    policy.packages = [policy.packages[0]];
    policy.packages[0].allowedDependencies = [];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/unknown; manifest=packages/importer/package.json[none]; sources=packages/importer/index.ts",
      ],
    });
  });

  it("runtime literal CLI rejects an allowed target missing its manifest dependency", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
    });
    writeSource(
      workspace,
      "packages/importer/index.ts",
      'void import("@pest-patrol/target/options", { with: { type: "json" } });\n',
    );
    writeManifest(workspace, "packages/target", {
      name: "@pest-patrol/target",
    });
    writeJson(workspace, "tooling/architecture-boundaries.json", cliPolicy());
    writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/index.ts",
      ],
    });
  });

  it("empty named clause CLI rejects an unknown target through an import", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
    });
    writeSource(
      workspace,
      "packages/importer/index.ts",
      'import {} from "@pest-patrol/unknown/empty";\n',
    );
    const policy = cliPolicy();
    policy.packages = [policy.packages[0]];
    policy.packages[0].allowedDependencies = [];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/unknown; manifest=packages/importer/package.json[none]; sources=packages/importer/index.ts",
      ],
    });
  });

  it("empty named clause CLI rejects an allowed undeclared target through a type re-export", () => {
    const workspace = createWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
    });
    writeSource(
      workspace,
      "packages/importer/index.ts",
      'export type {} from "@pest-patrol/target/empty";\n',
    );
    writeManifest(workspace, "packages/target", {
      name: "@pest-patrol/target",
    });
    writeJson(workspace, "tooling/architecture-boundaries.json", cliPolicy());
    writeJson(workspace, "docs/rebuild/graph.json", { nodes: [] });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: missing-manifest-dependency: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[none]; sources=packages/importer/index.ts",
      ],
    });
  });

  it("qualifies stale exception errors with the policy path", () => {
    const workspace = createCliWorkspace();
    const policy = cliPolicy();
    policy.exceptions = [cliException()];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", {
      nodes: [{ id: "CR02", status: "planned", ownership: [] }],
    });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: exception importer-target-debt is stale or drifted for @pest-patrol/importer -> @pest-patrol/target",
      ],
    });
  });

  it("qualifies unknown removal-node errors with the graph path", () => {
    const workspace = createCliWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
    });
    const policy = cliPolicy();
    policy.exceptions = [cliException()];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: docs/rebuild/graph.json: exception importer-target-debt for @pest-patrol/importer -> @pest-patrol/target has unknown removal node CR02",
      ],
    });
  });

  it("sorts mixed graph and policy fact errors after path qualification", () => {
    const workspace = createCliWorkspace();
    writeManifest(workspace, "packages/types", { name: "@pest-patrol/types" });
    writeSource(
      workspace,
      "packages/importer/index.ts",
      'import type { Target } from "@pest-patrol/target";\nimport type { Type } from "@pest-patrol/types";\nexport type Importer = Target | Type;\n',
    );
    const policy = cliPolicy();
    policy.packages[0].allowedDependencies.push({
      name: "@pest-patrol/types",
      manifestSections: ["dependencies"],
    });
    policy.packages.push({
      name: "@pest-patrol/types",
      path: "packages/types",
      state: "required",
      allowedDependencies: [],
    });
    policy.exceptions = [
      { ...cliException(), id: "a-stale" },
      {
        ...cliException(),
        id: "z-unknown",
        dependency: "@pest-patrol/types",
        sourceOccurrences: [{
          path: "packages/importer/index.ts",
          specifier: "@pest-patrol/types",
          syntax: "import",
          occurrenceClass: "production-type",
          count: 1,
          bindingDigest: CLI_TYPE_DIGEST,
        }],
        removeIn: "CR03",
      },
    ];
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);
    writeJson(workspace, "docs/rebuild/graph.json", {
      nodes: [{ id: "CR02", status: "planned", ownership: [] }],
    });

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: docs/rebuild/graph.json: exception z-unknown for @pest-patrol/importer -> @pest-patrol/types has unknown removal node CR03",
        "architecture boundary error: tooling/architecture-boundaries.json: exception a-stale is stale or drifted for @pest-patrol/importer -> @pest-patrol/target",
      ],
    });
  });

  it("prints every architecture violation in sorted order", () => {
    const workspace = createCliWorkspace();
    writeManifest(workspace, "packages/importer", {
      name: "@pest-patrol/importer",
      dependencies: {
        "@pest-patrol/target": "workspace:*",
        "@pest-patrol/types": "workspace:*",
      },
    });
    writeManifest(workspace, "packages/types", { name: "@pest-patrol/types" });
    const policy = cliPolicy();
    policy.packages[0].allowedDependencies = [];
    policy.packages.push({
      name: "@pest-patrol/types",
      path: "packages/types",
      state: "required",
      allowedDependencies: [],
    });
    writeJson(workspace, "tooling/architecture-boundaries.json", policy);

    expect(runCli(workspace)).toEqual({
      exitCode: 1,
      stdout: [],
      stderr: [
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/target; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=packages/importer/index.ts",
        "architecture boundary error: tooling/architecture-boundaries.json: forbidden-workspace-edge: @pest-patrol/importer -> @pest-patrol/types; manifest=packages/importer/package.json[dependencies]=workspace:*; sources=none",
      ],
    });
  });

  it("rejects every argument, including accept and update flags, as a usage error", () => {
    for (const argument of ["--accept", "--update", "unexpected"]) {
      const stdout: string[] = [];
      const stderr: string[] = [];
      expect(
        runArchitectureBoundariesMain([argument], {
          stdout: (line) => stdout.push(line),
          stderr: (line) => stderr.push(line),
        }),
      ).toBe(1);
      expect(stdout).toEqual([]);
      expect(stderr).toEqual([
        "architecture boundary error: Usage: architecture:check",
      ]);
    }
  });
});

describe("checked-in architecture policy", () => {
  it("matches the live workspace facts and rebuild graph", () => {
    const repositoryRoot = process.cwd();
    const policyInput = JSON.parse(
      readFileSync(
        join(repositoryRoot, "tooling/architecture-boundaries.json"),
        "utf8",
      ),
    ) as unknown;
    const policyResult = validateArchitecturePolicy(policyInput);
    expect(policyResult.errors).toEqual([]);
    if (policyResult.policy === null) {
      throw new Error("checked-in architecture policy did not validate");
    }
    const rebuildGraph = JSON.parse(
      readFileSync(join(repositoryRoot, "docs/rebuild/graph.json"), "utf8"),
    ) as RebuildGraphFacts;

    expect(
      validateArchitectureFacts(
        policyResult.policy,
        collectWorkspaceArchitectureFacts(repositoryRoot),
        rebuildGraph,
      ),
    ).toEqual([]);
  });
});
