import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  aggregateGateStatus,
  classifyGate,
  digestInputTree,
  readPackageManagerVersion,
  resolvePackageManager,
  resolveVerificationCommand,
  runRebuildVerificationCli,
  selectVerificationGates,
  withPackageManagerPath,
} from "./rebuild-verification";

const temporaryDirectories: string[] = [];

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return result.stdout.trim();
}

function createRecoveryFixture(
  ownership: string[],
  changedPath = "tasks/in-progress.md",
) {
  const repository = mkdtempSync(join(tmpdir(), "pp-rebuild-recovery-"));
  const graphDirectory = mkdtempSync(join(tmpdir(), "pp-rebuild-graph-"));
  temporaryDirectories.push(repository, graphDirectory);
  git(repository, ["init", "-b", "main"]);
  git(repository, ["config", "user.email", "tests@example.com"]);
  git(repository, ["config", "user.name", "Rebuild Tests"]);
  mkdirSync(dirname(join(repository, changedPath)), { recursive: true });
  writeFileSync(
    join(repository, "package.json"),
    JSON.stringify({ packageManager: "pnpm@9.15.4" }),
  );
  writeFileSync(join(repository, changedPath), "merged\n");
  git(repository, ["add", "package.json", changedPath]);
  git(repository, ["commit", "-m", "merged slice"]);
  const mergeSha = git(repository, ["rev-parse", "HEAD"]);

  writeFileSync(join(repository, changedPath), "repaired\n");
  git(repository, ["add", changedPath]);
  git(repository, ["commit", "-m", "post-merge repair"]);

  const graphPath = join(graphDirectory, "graph.json");
  writeFileSync(
    graphPath,
    JSON.stringify({
      nodes: [
        {
          baseSha: "1111111111111111111111111111111111111111",
          checks: ["git diff --check"],
          id: "CR00",
          kind: "slice",
          mergeSha,
          ownership,
          status: "done",
        },
      ],
    }),
  );
  return { graphPath, mergeSha, repository };
}

/**
 * A running slice whose branch has merged the default branch forward, where the
 * default branch meanwhile gained a path the slice does not own.
 */
function createUpdatedFromDefaultBranchFixture() {
  const repository = mkdtempSync(join(tmpdir(), "pp-rebuild-running-"));
  const graphDirectory = mkdtempSync(join(tmpdir(), "pp-rebuild-graph-"));
  temporaryDirectories.push(repository, graphDirectory);
  git(repository, ["init", "-b", "main"]);
  git(repository, ["config", "user.email", "tests@example.com"]);
  git(repository, ["config", "user.name", "Rebuild Tests"]);
  writeFileSync(
    join(repository, "package.json"),
    JSON.stringify({ packageManager: "pnpm@9.15.4" }),
  );
  mkdirSync(join(repository, "tasks"), { recursive: true });
  writeFileSync(join(repository, "tasks/in-progress.md"), "base\n");
  git(repository, ["add", "package.json", "tasks/in-progress.md"]);
  git(repository, ["commit", "-m", "base"]);
  const baseSha = git(repository, ["rev-parse", "HEAD"]);

  git(repository, ["checkout", "-b", "codex/slice-v1"]);
  writeFileSync(join(repository, "tasks/in-progress.md"), "slice\n");
  git(repository, ["add", "tasks/in-progress.md"]);
  git(repository, ["commit", "-m", "slice work"]);

  // The default branch moves on with a path no gate maps.
  git(repository, ["checkout", "main"]);
  mkdirSync(join(repository, "tools/other/src"), { recursive: true });
  writeFileSync(join(repository, "tools/other/src/client.ts"), "export {};\n");
  git(repository, ["add", "tools/other/src/client.ts"]);
  git(repository, ["commit", "-m", "unrelated tooling change"]);

  git(repository, ["checkout", "codex/slice-v1"]);
  git(repository, ["merge", "main", "-m", "Merge branch 'main' into slice"]);

  const graphPath = join(graphDirectory, "graph.json");
  writeFileSync(
    graphPath,
    JSON.stringify({
      repository: { slug: "example/repo", defaultBranch: "main" },
      nodes: [
        {
          baseSha,
          checks: ["git diff --check"],
          id: "CR99",
          kind: "slice",
          mergeSha: "",
          ownership: ["tasks/in-progress.md"],
          status: "running",
        },
      ],
    }),
  );
  return { baseSha, graphPath, repository };
}

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
        "python3 -c \"import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))\" '.codex/agents/pp-rebuild-worker.toml'",
        "python3 $CODEX_SKILL_VALIDATOR '.agents/skills/pest-patrol-verification-gate'",
      ].sort(),
    );
  });

  it("shell-quotes a .toml path so shell metacharacters cannot break out", () => {
    const commands = selectVerificationGates(["$(touch pwned).toml"], []).map(
      (gate) => gate.command,
    );

    expect(commands).toEqual([
      "python3 -c \"import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))\" '$(touch pwned).toml'",
    ]);
  });

  it("shell-quotes a skill path containing shell metacharacters", () => {
    const commands = selectVerificationGates(
      [".agents/skills/`touch pwned`/SKILL.md"],
      [],
    ).map((gate) => gate.command);

    expect(commands).toEqual([
      "python3 $CODEX_SKILL_VALIDATOR '.agents/skills/`touch pwned`'",
    ]);
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

  it("maps the root README to the docs/config gate", () => {
    expect(
      selectVerificationGates(["README.md"], []).map((gate) => gate.command),
    ).toEqual(["git diff --check"]);
  });

  it("maps the .nvmrc runtime pin to the docs/config gate and a runtime check", () => {
    expect(
      selectVerificationGates([".nvmrc"], []).map((gate) => gate.command),
    ).toEqual([
      "git diff --check",
      "node -e \"const pinned = require('node:fs').readFileSync('.nvmrc', 'utf8').trim(); if (process.version !== 'v' + pinned) { throw new Error(process.version + ' is not v' + pinned) }\"",
    ]);
  });

  it("maps pnpm-workspace.yaml and .npmrc to the security baseline and docs/config gates", () => {
    expect(
      selectVerificationGates(["pnpm-workspace.yaml"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm security:baseline"]);
    expect(
      selectVerificationGates([".npmrc"], []).map((gate) => gate.command),
    ).toEqual(["git diff --check", "pnpm security:baseline"]);
  });

  it("maps ESLint flat and legacy config files to the lint and docs/config gates", () => {
    expect(
      selectVerificationGates(["eslint.config.mjs"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm lint"]);
    expect(
      selectVerificationGates([".eslintrc.cjs"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm lint"]);
  });

  it("maps TypeScript project configs to the typecheck and docs/config gates", () => {
    expect(
      selectVerificationGates(["tsconfig.tooling.json"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm typecheck"]);
    expect(
      selectVerificationGates(["tsconfig.base.json"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm typecheck"]);
  });

  it("maps a workspace project's TypeScript config to the typecheck gate as well as its package gates", () => {
    expect(
      selectVerificationGates(["apps/web/tsconfig.json"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm test", "pnpm typecheck"]);
  });

  it("maps a workspace project's ESLint config to the lint gate as well as its package gates", () => {
    expect(
      selectVerificationGates(["apps/web/eslint.config.mjs"], []).map(
        (gate) => gate.command,
      ),
    ).toEqual(["git diff --check", "pnpm lint", "pnpm test"]);
  });

  it("accepts standing slice ownership during recovery gate selection", () => {
    const commands = selectVerificationGates(
      [
        "docs/rebuild/graph.json",
        "tasks/in-progress.md",
        "docs/superpowers/plans/2026-08-31-cr00-process-optimization-recovery.md",
        "pnpm-lock.yaml",
      ],
      [],
      [],
      "CR00",
    ).map((gate) => gate.command);

    expect(
      commands.filter((command) =>
        command.startsWith("UNMAPPED recovery ownership:"),
      ),
    ).toEqual([]);
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

describe("controlled rebuild running-slice gate selection", () => {
  it("ignores default-branch changes merged into the slice branch", () => {
    const fixture = createUpdatedFromDefaultBranchFixture();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = runRebuildVerificationCli(
        ["--graph", fixture.graphPath],
        fixture.repository,
        {},
      );
      const output = log.mock.calls.flat().join("\n");

      expect(output).not.toContain(
        "UNMAPPED changed path: tools/other/src/client.ts",
      );
      expect(exitCode).toBe(0);
    } finally {
      error.mockRestore();
      log.mockRestore();
    }
  });
});

describe("controlled rebuild post-merge recovery", () => {
  it("verifies an explicitly selected done slice from its merge SHA", () => {
    const fixture = createRecoveryFixture([]);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = runRebuildVerificationCli(
        ["--recovery-slice", "CR00", "--graph", fixture.graphPath],
        fixture.repository,
        {},
      );
      const output = log.mock.calls.flat().join("\n");

      expect(exitCode).toBe(0);
      const result = JSON.parse(output) as {
        baseSha: string;
        mode: string;
        status: string;
      };

      expect(result).toMatchObject({
        baseSha: fixture.mergeSha,
        mode: "post-merge-recovery",
        status: "PASS",
      });
    } finally {
      error.mockRestore();
      log.mockRestore();
    }
  });

  it("refuses recovery changes outside the completed slice ownership", () => {
    const fixture = createRecoveryFixture(["tasks"], "docs/AGENTS.md");
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = runRebuildVerificationCli(
        ["--recovery-slice", "CR00", "--graph", fixture.graphPath],
        fixture.repository,
        {},
      );
      const output = log.mock.calls.flat().join("\n");

      expect(exitCode).toBe(1);
      expect(output).toContain(
        "UNMAPPED recovery ownership: changed path docs/AGENTS.md is outside running-node ownership",
      );
    } finally {
      error.mockRestore();
      log.mockRestore();
    }
  });

  it("refuses a recovery base that is not an ancestor of HEAD", () => {
    const fixture = createRecoveryFixture(["tasks/in-progress.md"]);
    const treeSha = git(fixture.repository, ["rev-parse", "HEAD^{tree}"]);
    const unrelatedSha = git(fixture.repository, [
      "commit-tree",
      treeSha,
      "-m",
      "unrelated merge",
    ]);
    const graph = JSON.parse(readFileSync(fixture.graphPath, "utf8")) as {
      nodes: Array<{ mergeSha: string }>;
    };
    graph.nodes[0].mergeSha = unrelatedSha;
    writeFileSync(fixture.graphPath, JSON.stringify(graph));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = runRebuildVerificationCli(
        ["--recovery-slice", "CR00", "--graph", fixture.graphPath],
        fixture.repository,
        {},
      );

      expect(exitCode).toBe(1);
      expect(error.mock.calls.flat().join("\n")).toContain(
        `Post-merge recovery merge SHA ${unrelatedSha} is not an ancestor of HEAD.`,
      );
    } finally {
      error.mockRestore();
      log.mockRestore();
    }
  });
});
