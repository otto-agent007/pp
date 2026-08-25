import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  aggregateGateStatus,
  classifyGate,
  digestInputTree,
  readPackageManagerVersion,
  resolvePackageManager,
  resolveVerificationCommand,
  selectVerificationGates,
  withPackageManagerPath,
} from "./rebuild-verification";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("controlled rebuild verification gate selection", () => {
  it("selects the union of path-driven and declared gates", () => {
    const commands = selectVerificationGates(
      [
        "tooling/rebuild-graph.ts",
        "tooling/rebuild-graph-reconcile.ts",
        "tooling/rebuild-verification.ts",
        ".agents/skills/pest-patrol-verification-gate/SKILL.md",
        ".codex/agents/pp-rebuild-worker.toml",
        "packages/domain/src/index.ts",
        "package.json",
        "pnpm-lock.yaml",
        "docs/rebuild/README.md",
        ".github/workflows/ci.yml",
      ],
      ["pnpm test", "pnpm rebuild:graph:check", "pnpm test"],
    ).map((gate) => gate.command);

    expect(commands).toEqual(
      [
        "git diff --check",
        "pnpm exec vitest run tooling/rebuild-graph-reconcile.test.ts",
        "pnpm exec vitest run tooling/rebuild-graph.test.ts",
        "pnpm exec vitest run tooling/rebuild-verification.test.ts",
        "pnpm rebuild:graph:check",
        "pnpm rebuild:graph:reconcile -- --offline",
        "pnpm security:baseline",
        "pnpm test",
        "python3 -c \"import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))\" .codex/agents/pp-rebuild-worker.toml",
        "python3 $CODEX_SKILL_VALIDATOR .agents/skills/pest-patrol-verification-gate",
      ].sort(),
    );
  });

  it("deduplicates exact commands and orders gates lexically", () => {
    const gates = selectVerificationGates(
      [],
      ["pnpm typecheck", "pnpm test", "pnpm typecheck"],
    );
    expect(gates.map((gate) => gate.command)).toEqual([
      "pnpm test",
      "pnpm typecheck",
    ]);
    expect(new Set(gates.map((gate) => gate.id)).size).toBe(gates.length);
  });

  it("turns an unmapped changed path into a required missing gate", () => {
    expect(selectVerificationGates(["assets/unmapped.bin"], [])).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^missing-/),
        command: "UNMAPPED changed path: assets/unmapped.bin",
      }),
    ]);
  });

  it("maps task records to the docs/config gate", () => {
    expect(
      selectVerificationGates(["tasks/in-progress.md"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check"]);
  });
});

describe("controlled rebuild package manager resolution", () => {
  it("selects the lexically first exact-version package manager", () => {
    expect(
      resolvePackageManager("pnpm@9.15.4", [
        { path: "/z/pnpm", version: "9.15.4" },
        { path: "/a/pnpm", version: "9.15.4" },
        { path: "/older/pnpm", version: "9.15.3" },
      ]),
    ).toBe("/a/pnpm");
  });

  it("rejects mismatched versions and non-pnpm declarations", () => {
    expect(
      resolvePackageManager("pnpm@9.15.4", [
        { path: "/usr/bin/pnpm", version: "10.0.0" },
      ]),
    ).toBeNull();
    expect(
      resolvePackageManager("npm@11.0.0", [
        { path: "/usr/bin/npm", version: "11.0.0" },
      ]),
    ).toBeNull();
  });

  it("reads exact pnpm package metadata when a launcher emits no version", () => {
    const root = mkdtempSync(join(tmpdir(), "pp-pnpm-launcher-"));
    temporaryDirectories.push(root);
    const packageRoot = join(root, "node_modules", "pnpm");
    mkdirSync(join(packageRoot, "bin"), { recursive: true });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "pnpm", version: "9.15.4" }),
    );
    writeFileSync(join(packageRoot, "bin", "pnpm.cjs"), "// fixture");
    const launcher = join(root, "node_modules", ".bin", "pnpm");
    symlinkSync("../pnpm/bin/pnpm.cjs", launcher);

    expect(readPackageManagerVersion(launcher, "")).toBe("9.15.4");
    expect(readPackageManagerVersion(launcher, "10.0.0")).toBe("10.0.0");
  });

  it("prepends the selected package manager directory to PATH", () => {
    expect(
      withPackageManagerPath({ PATH: "/usr/bin" }, "/exact/pnpm/bin").PATH,
    ).toBe(`/exact/pnpm/bin${delimiter}/usr/bin`);
  });
});

describe("controlled rebuild input digest", () => {
  function createFixture(order: "forward" | "reverse") {
    const root = mkdtempSync(join(tmpdir(), "pp-rebuild-digest-"));
    temporaryDirectories.push(root);
    const operations = [
      () => mkdirSync(join(root, "nested"), { recursive: true }),
      () => mkdirSync(join(root, "vacant"), { recursive: true }),
      () => writeFileSync(join(root, "a.txt"), "alpha"),
      () => writeFileSync(join(root, "empty.bin"), Buffer.alloc(0)),
      () => {
        mkdirSync(join(root, "nested"), { recursive: true });
        writeFileSync(join(root, "nested", "b.txt"), Buffer.from([0, 1, 2]));
      },
      () => symlinkSync("nested/b.txt", join(root, "link")),
    ];
    for (const operation of order === "forward"
      ? operations
      : operations.reverse()) {
      operation();
    }
    return root;
  }

  it("hashes files, directories, empty files, and symlinks literally", () => {
    const root = createFixture("forward");
    expect(digestInputTree(root)).toBe(
      "36aba89a235d676349abbb6f1fa3966767c31f89a45af4ffa72cb23956cd14e8",
    );
  });

  it("is stable across creation order and changes with bytes or link targets", () => {
    const first = createFixture("forward");
    const second = createFixture("reverse");
    expect(digestInputTree(second)).toBe(digestInputTree(first));

    writeFileSync(join(second, "a.txt"), "changed");
    expect(digestInputTree(second)).not.toBe(digestInputTree(first));
    writeFileSync(join(second, "a.txt"), "alpha");
    rmSync(join(second, "link"));
    symlinkSync("a.txt", join(second, "link"));
    expect(digestInputTree(second)).not.toBe(digestInputTree(first));
  });
});

describe("controlled rebuild gate classification", () => {
  it.each([
    [
      "MISSING",
      {
        provenanceComplete: false,
        stale: true,
        launched: false,
        isolatedInfrastructureFailure: true,
        exitCode: 1,
      },
    ],
    [
      "STALE",
      {
        provenanceComplete: true,
        stale: true,
        launched: false,
        isolatedInfrastructureFailure: true,
        exitCode: 1,
      },
    ],
    [
      "BLOCKED",
      {
        provenanceComplete: true,
        stale: false,
        launched: false,
        isolatedInfrastructureFailure: true,
        exitCode: null,
      },
    ],
    [
      "FAIL",
      {
        provenanceComplete: true,
        stale: false,
        launched: true,
        isolatedInfrastructureFailure: false,
        exitCode: 1,
      },
    ],
    [
      "PASS",
      {
        provenanceComplete: true,
        stale: false,
        launched: true,
        isolatedInfrastructureFailure: false,
        exitCode: 0,
      },
    ],
  ] as const)(
    "classifies %s with the required precedence",
    (expected, input) => {
      expect(classifyGate(input)).toBe(expected);
    },
  );

  it("collapses missing, stale, or failed gates to an overall failure", () => {
    expect(aggregateGateStatus(["PASS", "MISSING"])).toBe("FAIL");
    expect(aggregateGateStatus(["PASS", "STALE"])).toBe("FAIL");
    expect(aggregateGateStatus(["PASS", "FAIL"])).toBe("FAIL");
    expect(aggregateGateStatus(["PASS", "BLOCKED"])).toBe("BLOCKED");
    expect(aggregateGateStatus(["PASS"])).toBe("PASS");
  });

  it("binds diff checks and pnpm commands to resolved identities", () => {
    expect(
      resolveVerificationCommand("git diff --check", {
        baseSha: "1111111111111111111111111111111111111111",
        packageManager: "'/opt/pnpm'",
      }),
    ).toBe("git diff --check 1111111111111111111111111111111111111111...HEAD");
    expect(
      resolveVerificationCommand("pnpm test", {
        baseSha: "1111111111111111111111111111111111111111",
        packageManager: "'/opt/pnpm'",
      }),
    ).toBe("'/opt/pnpm' test");
  });
});
