import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { delimiter, dirname, join, posix, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { validateChangedPathOwnership } from "./rebuild-graph-reconcile";

export type GateStatus = "MISSING" | "STALE" | "BLOCKED" | "FAIL" | "PASS";

export type VerificationGate = {
  id: string;
  command: string;
};

function isRepositoryRelativePath(value: string) {
  return (
    value.length > 0 &&
    !value.includes("\\") &&
    !posix.isAbsolute(value) &&
    !win32.isAbsolute(value) &&
    win32.parse(value).root.length === 0 &&
    value === posix.normalize(value) &&
    !value
      .split("/")
      .some((part) => part.length === 0 || part === "." || part === "..")
  );
}

function gateId(command: string) {
  return `gate-${createHash("sha256").update(command).digest("hex").slice(0, 12)}`;
}

// Gates are executed with `shell: true` (POSIX /bin/sh), so any changed-path
// segment interpolated into a gate command must be single-quoted to prevent
// shell metacharacters in a crafted filename from being interpreted.
function shellQuoteArgument(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function selectVerificationGates(
  changedPaths: readonly string[],
  declaredChecks: readonly string[],
  recoveryOwnership?: readonly string[],
  recoverySliceId?: string,
) {
  const commands = new Set(
    declaredChecks.map((command) => command.trim()).filter(Boolean),
  );

  for (const path of changedPaths) {
    if (!isRepositoryRelativePath(path)) {
      commands.add(`UNMAPPED changed path: ${path}`);
      continue;
    }
    let matched = false;
    if (
      path === "docs/rebuild/graph.json" ||
      path === "tooling/rebuild-graph.ts" ||
      path === "tooling/rebuild-graph.test.ts"
    ) {
      matched = true;
      commands.add("pnpm exec vitest run tooling/rebuild-graph.test.ts");
      commands.add("pnpm rebuild:graph:check");
    }
    if (
      path === "tooling/rebuild-graph-reconcile.ts" ||
      path === "tooling/rebuild-graph-reconcile.test.ts"
    ) {
      matched = true;
      commands.add(
        "pnpm exec vitest run tooling/rebuild-graph-reconcile.test.ts",
      );
      commands.add("pnpm rebuild:graph:reconcile -- --offline");
    }
    if (
      path === "tooling/rebuild-verification.ts" ||
      path === "tooling/rebuild-verification.test.ts"
    ) {
      matched = true;
      commands.add("pnpm exec vitest run tooling/rebuild-verification.test.ts");
    }
    const skillMatch = path.match(/^\.agents\/skills\/([^/]+)\/SKILL\.md$/);
    if (skillMatch) {
      matched = true;
      commands.add(
        `python3 $CODEX_SKILL_VALIDATOR ${shellQuoteArgument(`.agents/skills/${skillMatch[1]}`)}`,
      );
    }
    if (path.endsWith(".toml")) {
      matched = true;
      commands.add(
        `python3 -c "import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))" ${shellQuoteArgument(path)}`,
      );
    }
    if (
      path === "package.json" ||
      path === "pnpm-lock.yaml" ||
      path === "pnpm-workspace.yaml" ||
      path === ".npmrc" ||
      path.endsWith("/package.json")
    ) {
      matched = true;
      commands.add("pnpm security:baseline");
    }
    if (
      path.startsWith("apps/") ||
      path.startsWith("packages/") ||
      path.startsWith("tooling/")
    ) {
      matched = true;
      commands.add("pnpm test");
    }
    if (
      path.startsWith("docs/") ||
      path.startsWith("tasks/") ||
      path.startsWith(".github/") ||
      path.startsWith(".codex/") ||
      path === "AGENTS.md" ||
      path === "README.md" ||
      path === ".nvmrc" ||
      path === "package.json" ||
      path === "pnpm-lock.yaml" ||
      path === "pnpm-workspace.yaml" ||
      path === ".npmrc"
    ) {
      matched = true;
      commands.add("git diff --check");
    }
    if (path === ".nvmrc") {
      matched = true;
      commands.add(
        "node -e \"const pinned = require('node:fs').readFileSync('.nvmrc', 'utf8').trim(); if (process.version !== 'v' + pinned) { throw new Error(process.version + ' is not v' + pinned) }\"",
      );
    }
    if (!matched) {
      commands.add(`UNMAPPED changed path: ${path}`);
    }
  }

  if (recoveryOwnership) {
    for (const error of validateChangedPathOwnership(
      changedPaths,
      recoveryOwnership,
      recoverySliceId,
    )) {
      commands.add(`UNMAPPED recovery ownership: ${error}`);
    }
  }

  return [...commands].sort().map((command) => ({
    id: command.startsWith("UNMAPPED ")
      ? `missing-${gateId(command).slice("gate-".length)}`
      : gateId(command),
    command,
  }));
}

export function resolvePackageManager(
  declaration: string,
  candidates: readonly { path: string; version: string }[],
) {
  const match = declaration.match(/^pnpm@([^@]+)$/);
  if (!match) {
    return null;
  }
  const version = match[1];
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.path.length > 0 && candidate.version === version,
      )
      .map((candidate) => candidate.path)
      .sort()[0] ?? null
  );
}

export function digestInputTree(path: string): string {
  const records: Array<{
    type: "directory" | "file" | "symlink";
    path: string;
    bytes: Buffer;
  }> = [];

  function walk(absolutePath: string, relativePath: string) {
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      records.push({
        type: "symlink",
        path: relativePath,
        bytes: Buffer.from(readlinkSync(absolutePath)),
      });
      return;
    }
    if (stat.isDirectory()) {
      if (relativePath !== ".") {
        records.push({
          type: "directory",
          path: relativePath,
          bytes: Buffer.alloc(0),
        });
      }
      for (const entry of readdirSync(absolutePath).sort()) {
        walk(
          join(absolutePath, entry),
          relativePath === "." ? entry : posix.join(relativePath, entry),
        );
      }
      return;
    }
    if (stat.isFile()) {
      records.push({
        type: "file",
        path: relativePath,
        bytes: readFileSync(absolutePath),
      });
      return;
    }
    throw new Error(`unsupported input-tree entry: ${relativePath}`);
  }

  walk(path, ".");
  const hash = createHash("sha256");
  for (const record of records.sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    hash.update(record.type);
    hash.update(Buffer.from([0]));
    hash.update(record.path);
    hash.update(Buffer.from([0]));
    hash.update(String(record.bytes.length));
    hash.update(Buffer.from([0]));
    hash.update(record.bytes);
  }
  return hash.digest("hex");
}

export function classifyGate(input: {
  provenanceComplete: boolean;
  stale: boolean;
  launched: boolean;
  isolatedInfrastructureFailure: boolean;
  exitCode: number | null;
}): GateStatus {
  if (!input.provenanceComplete) {
    return "MISSING";
  }
  if (input.stale) {
    return "STALE";
  }
  if (!input.launched && input.isolatedInfrastructureFailure) {
    return "BLOCKED";
  }
  if (input.launched && input.exitCode !== 0) {
    return "FAIL";
  }
  return input.launched && input.exitCode === 0 ? "PASS" : "MISSING";
}

type VerificationGraph = {
  nodes: Array<{
    baseSha: string;
    checks: string[];
    id: string;
    kind: string;
    mergeSha: string;
    ownership: string[];
    status: string;
  }>;
};

type Identity = {
  head: string;
  tree: string;
  worktreeStatus: string;
  ignoredInputs: Array<{ path: string; digest: string | null }>;
};

function runGit(cwd: string, args: readonly string[]) {
  return spawnSync("git", [...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitOutput(cwd: string, args: readonly string[]) {
  const result = runGit(cwd, args);
  return result.status === 0 ? result.stdout.trimEnd() : "";
}

function captureIdentity(
  cwd: string,
  ignoredInputs: readonly string[],
): Identity {
  return {
    head: gitOutput(cwd, ["rev-parse", "HEAD"]),
    tree: gitOutput(cwd, ["rev-parse", "HEAD^{tree}"]),
    worktreeStatus: gitOutput(cwd, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]),
    ignoredInputs: [...ignoredInputs].sort().map((path) => {
      const absolutePath = resolve(cwd, path);
      return {
        path,
        digest: existsSync(absolutePath) ? digestInputTree(absolutePath) : null,
      };
    }),
  };
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function executablePaths(name: string, environment: NodeJS.ProcessEnv) {
  const suffixes = process.platform === "win32" ? [".cmd", ".exe", ""] : [""];
  const paths = (environment.PATH ?? "").split(delimiter).filter(Boolean);
  const candidates: string[] = [];
  for (const directory of paths) {
    for (const suffix of suffixes) {
      const candidate = join(directory, `${name}${suffix}`);
      if (existsSync(candidate)) {
        candidates.push(candidate);
      }
    }
  }
  return [...new Set(candidates)].sort();
}

export function readPackageManagerVersion(
  launcherPath: string,
  reportedVersion: string,
) {
  if (reportedVersion.trim().length > 0) {
    return reportedVersion.trim();
  }
  try {
    let directory = dirname(realpathSync(launcherPath));
    for (let depth = 0; depth < 4; depth += 1) {
      const manifestPath = join(directory, "package.json");
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
          name?: unknown;
          version?: unknown;
        };
        if (manifest.name === "pnpm" && typeof manifest.version === "string") {
          return manifest.version;
        }
      }
      const parent = dirname(directory);
      if (parent === directory) {
        break;
      }
      directory = parent;
    }
  } catch {
    return "";
  }
  return "";
}

function discoverPackageManagerCandidates(
  explicitPath: string | null,
  environment: NodeJS.ProcessEnv,
) {
  const probes: Array<{
    display: string;
    command: string;
    args: string[];
  }> = [];
  if (explicitPath) {
    probes.push({
      display: shellQuote(explicitPath),
      command: explicitPath,
      args: [],
    });
  } else {
    for (const path of executablePaths("pnpm", environment)) {
      probes.push({ display: shellQuote(path), command: path, args: [] });
    }
    for (const path of executablePaths("corepack", environment)) {
      probes.push({
        display: `${shellQuote(path)} pnpm`,
        command: path,
        args: ["pnpm"],
      });
    }

    const npmCache =
      environment.npm_config_cache ??
      (environment.HOME ? join(environment.HOME, ".npm") : null);
    if (npmCache) {
      const npxRoot = join(npmCache, "_npx");
      if (existsSync(npxRoot)) {
        for (const entry of readdirSync(npxRoot).sort()) {
          const candidate = join(
            npxRoot,
            entry,
            "node_modules",
            ".bin",
            "pnpm",
          );
          if (existsSync(candidate)) {
            probes.push({
              display: shellQuote(candidate),
              command: candidate,
              args: [],
            });
          }
        }
      }
    }
  }

  return probes.map((probe) => {
    const result = spawnSync(probe.command, [...probe.args, "--version"], {
      encoding: "utf8",
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      candidate: {
        path: probe.display,
        version:
          result.status === 0
            ? readPackageManagerVersion(probe.command, result.stdout)
            : "",
      },
      executableDirectory: dirname(probe.command),
    };
  });
}

export function withPackageManagerPath(
  environment: NodeJS.ProcessEnv,
  executableDirectory: string | null,
) {
  if (!executableDirectory) {
    return { ...environment };
  }
  return {
    ...environment,
    PATH: [executableDirectory, environment.PATH]
      .filter(Boolean)
      .join(delimiter),
  };
}

function resolveSkillValidator(environment: NodeJS.ProcessEnv) {
  const codexRoot =
    environment.CODEX_HOME ??
    (environment.HOME ? join(environment.HOME, ".codex") : null);
  if (!codexRoot) {
    return null;
  }
  const path = join(
    codexRoot,
    "skills",
    ".system",
    "skill-creator",
    "scripts",
    "quick_validate.py",
  );
  return existsSync(path) ? path : null;
}

export function aggregateGateStatus(
  statuses: readonly GateStatus[],
): GateStatus {
  if (
    statuses.some(
      (status) =>
        status === "FAIL" || status === "MISSING" || status === "STALE",
    )
  ) {
    return "FAIL";
  }
  if (statuses.some((status) => status === "BLOCKED")) {
    return "BLOCKED";
  }
  return statuses.length > 0 ? "PASS" : "MISSING";
}

export function resolveVerificationCommand(
  command: string,
  identities: { baseSha: string; packageManager: string | null },
) {
  if (command === "git diff --check") {
    return `git diff --check ${identities.baseSha}...HEAD`;
  }
  if (/^pnpm(?:\s|$)/.test(command) && identities.packageManager) {
    return command.replace(/^pnpm(?=\s|$)/, identities.packageManager);
  }
  return command;
}

export function runRebuildVerificationCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
) {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : [...args];
  const ignoredInputs: string[] = [];
  let graphPath = "docs/rebuild/graph.json";
  let explicitPackageManager: string | null = null;
  let recoverySliceId: string | null = null;
  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const argument = normalizedArgs[index];
    const value = normalizedArgs[index + 1];
    if (argument === "--ignored-input" && value) {
      ignoredInputs.push(value);
      index += 1;
    } else if (argument === "--graph" && value) {
      graphPath = value;
      index += 1;
    } else if (argument === "--package-manager" && value) {
      explicitPackageManager = value;
      index += 1;
    } else if (argument === "--recovery-slice" && value) {
      recoverySliceId = value;
      index += 1;
    } else {
      console.error(
        "Usage: rebuild:verify [--graph path] [--package-manager path] [--ignored-input path] [--recovery-slice id]",
      );
      return 1;
    }
  }

  let graph: VerificationGraph;
  let packageDeclaration: string;
  try {
    graph = JSON.parse(
      readFileSync(resolve(cwd, graphPath), "utf8"),
    ) as VerificationGraph;
    packageDeclaration = (
      JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8")) as {
        packageManager: string;
      }
    ).packageManager;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to load rebuild verification inputs: ${message}`);
    return 1;
  }

  const runningNode = graph.nodes.find(
    (node) => node.kind === "slice" && node.status === "running",
  );
  let verificationNode = runningNode;
  let verificationBaseSha = runningNode?.baseSha ?? "";
  let mode = "running-slice";
  if (recoverySliceId) {
    if (runningNode) {
      console.error(
        "Post-merge recovery verification is unavailable while a slice is running.",
      );
      return 1;
    }
    verificationNode = graph.nodes.find(
      (node) =>
        node.kind === "slice" &&
        node.id === recoverySliceId &&
        node.status === "done",
    );
    if (
      !verificationNode ||
      !/^[0-9a-f]{40}$/.test(verificationNode.mergeSha)
    ) {
      console.error(
        `Post-merge recovery requires done slice ${recoverySliceId} with a full merge SHA.`,
      );
      return 1;
    }
    verificationBaseSha = verificationNode.mergeSha;
    mode = "post-merge-recovery";
    if (
      runGit(cwd, ["merge-base", "--is-ancestor", verificationBaseSha, "HEAD"])
        .status !== 0
    ) {
      console.error(
        `Post-merge recovery merge SHA ${verificationBaseSha} is not an ancestor of HEAD.`,
      );
      return 1;
    }
  } else if (!verificationNode) {
    console.error("Rebuild verification requires one running slice.");
    return 1;
  }
  const changedPaths = gitOutput(cwd, [
    "diff",
    "--name-only",
    `${verificationBaseSha}...HEAD`,
  ])
    .split(/\r?\n/)
    .filter(Boolean);
  const gates = selectVerificationGates(
    changedPaths,
    verificationNode.checks,
    recoverySliceId ? verificationNode.ownership : undefined,
    recoverySliceId ? verificationNode.id : undefined,
  );
  const discoveredCandidates = discoverPackageManagerCandidates(
    explicitPackageManager,
    environment,
  );
  const packageManager = resolvePackageManager(
    packageDeclaration,
    discoveredCandidates.map((entry) => entry.candidate),
  );
  const packageManagerDirectory =
    discoveredCandidates.find(
      (entry) => entry.candidate.path === packageManager,
    )?.executableDirectory ?? null;
  const skillValidator = resolveSkillValidator(environment);
  const executionEnvironment = {
    ...withPackageManagerPath(environment, packageManagerDirectory),
    ...(skillValidator ? { CODEX_SKILL_VALIDATOR: skillValidator } : {}),
  };
  const startedAt = new Date().toISOString();
  const pre = captureIdentity(cwd, ignoredInputs);
  const attempts = gates.map((gate) => {
    const needsPackageManager = /^pnpm(?:\s|$)/.test(gate.command);
    const resolvedCommand = resolveVerificationCommand(gate.command, {
      baseSha: verificationBaseSha,
      packageManager,
    });
    if (gate.id.startsWith("missing-")) {
      return {
        ...gate,
        resolvedCommand,
        launched: false,
        isolatedInfrastructureFailure: false,
        exitCode: null,
      };
    }
    if (needsPackageManager && !packageManager) {
      return {
        ...gate,
        resolvedCommand,
        launched: false,
        isolatedInfrastructureFailure: true,
        exitCode: null,
      };
    }
    if (gate.command.includes("$CODEX_SKILL_VALIDATOR") && !skillValidator) {
      return {
        ...gate,
        resolvedCommand,
        launched: false,
        isolatedInfrastructureFailure: true,
        exitCode: null,
      };
    }
    const result = spawnSync(resolvedCommand, {
      cwd,
      encoding: "utf8",
      env: executionEnvironment,
      shell: true,
      stdio: "inherit",
    });
    return {
      ...gate,
      resolvedCommand,
      launched: result.error === undefined,
      isolatedInfrastructureFailure: result.error !== undefined,
      exitCode: result.status,
    };
  });
  const post = captureIdentity(cwd, ignoredInputs);
  const finishedAt = new Date().toISOString();
  const stale =
    pre.head !== post.head ||
    pre.tree !== post.tree ||
    JSON.stringify(pre.ignoredInputs) !== JSON.stringify(post.ignoredInputs);
  const provenanceComplete =
    pre.head.length > 0 &&
    pre.tree.length > 0 &&
    pre.worktreeStatus.length === 0 &&
    post.worktreeStatus.length === 0 &&
    pre.ignoredInputs.every((input) => input.digest !== null) &&
    post.ignoredInputs.every((input) => input.digest !== null);
  const gateResults = attempts.map((attempt) => ({
    id: attempt.id,
    command: attempt.command,
    resolvedCommand: attempt.resolvedCommand,
    exitCode: attempt.exitCode,
    status: classifyGate({
      provenanceComplete,
      stale,
      launched: attempt.launched,
      isolatedInfrastructureFailure: attempt.isolatedInfrastructureFailure,
      exitCode: attempt.exitCode,
    }),
  }));
  const status = aggregateGateStatus(gateResults.map((gate) => gate.status));
  const identityPayload = JSON.stringify({
    baseSha: verificationBaseSha,
    finishedAt,
    gates: gateResults,
    mode,
    post,
    pre,
    startedAt,
  });
  const result = {
    schemaVersion: 1,
    evidenceSetId: createHash("sha256").update(identityPayload).digest("hex"),
    slice: verificationNode.id,
    baseSha: verificationBaseSha,
    mode,
    startedAt,
    finishedAt,
    pre,
    post,
    gates: gateResults,
    status,
  };
  console.log(JSON.stringify(result, null, 2));
  console.error(
    `Rebuild verification ${status}: ${gateResults.filter((gate) => gate.status === "PASS").length}/${gateResults.length} gates passed.`,
  );
  return status === "PASS" ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runRebuildVerificationCli();
}
