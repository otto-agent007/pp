import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { validateRebuildGraph } from "./rebuild-graph";

export type PullRequestFact = {
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  mergeSha: string | null;
};

export type RepositoryFacts = {
  changedPaths: string[];
  existingCommits: string[];
  ancestorPairs: Array<{ ancestor: string; descendant: string }>;
  pullRequests: PullRequestFact[];
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

export function validateChangedPathOwnership(
  changedPaths: readonly string[],
  ownership: readonly string[],
) {
  const errors: string[] = [];
  const validOwnership = ownership.filter((path) => {
    if (!isRepositoryRelativePath(path)) {
      errors.push(
        `ownership path must be normalized and repository-relative: ${JSON.stringify(path)}`,
      );
      return false;
    }
    return true;
  });

  for (const changedPath of changedPaths) {
    if (!isRepositoryRelativePath(changedPath)) {
      errors.push(
        `changed path must be normalized and repository-relative: ${JSON.stringify(changedPath)}`,
      );
      continue;
    }
    if (
      !validOwnership.some(
        (ownedPath) =>
          changedPath === ownedPath || changedPath.startsWith(`${ownedPath}/`),
      )
    ) {
      errors.push(
        `changed path ${changedPath} is outside running-node ownership`,
      );
    }
  }

  return [...new Set(errors)].sort();
}

export function validateRepositoryClaims(
  graph: unknown,
  facts: RepositoryFacts,
): string[] {
  return validateRepositoryClaimsWithOptions(graph, facts, true);
}

function validateRepositoryClaimsWithOptions(
  graph: unknown,
  facts: RepositoryFacts,
  checkPullRequests: boolean,
) {
  const structuralErrors = validateRebuildGraph(graph);
  if (structuralErrors.length > 0) {
    return structuralErrors.map((error) => `graph: ${error}`).sort();
  }

  const graphRecord = graph as {
    repository: { defaultBranch: string };
    nodes: Array<{
      baseSha: string;
      evidence: Array<{ commitSha: string }>;
      id: string;
      kind: string;
      mergeSha: string;
      ownership: string[];
      pr: string;
      status: string;
    }>;
  };
  const errors: string[] = [];
  const existingCommits = new Set(facts.existingCommits);
  const ancestorPairs = new Set(
    facts.ancestorPairs.map(
      ({ ancestor, descendant }) => `${ancestor}\u0000${descendant}`,
    ),
  );
  const pullRequests = new Map(facts.pullRequests.map((pr) => [pr.url, pr]));
  const isAncestor = (ancestor: string, descendant: string) =>
    ancestorPairs.has(`${ancestor}\u0000${descendant}`);

  for (const node of graphRecord.nodes) {
    let evidenceDescendant: string | null = null;
    if (node.kind === "slice" && node.status === "done") {
      evidenceDescendant = node.mergeSha;
      if (checkPullRequests) {
        const pullRequest = pullRequests.get(node.pr);
        if (!pullRequest) {
          errors.push(
            `done slice ${node.id} pull request does not exist: ${node.pr}`,
          );
        } else if (pullRequest.state !== "MERGED") {
          errors.push(
            `done slice ${node.id} pull request is ${pullRequest.state}, not MERGED: ${node.pr}`,
          );
        } else if (pullRequest.mergeSha !== node.mergeSha) {
          errors.push(
            `done slice ${node.id} merge SHA ${node.mergeSha} does not match pull request merge SHA ${String(pullRequest.mergeSha)}`,
          );
        }
      }

      if (!existingCommits.has(node.mergeSha)) {
        errors.push(
          `done slice ${node.id} merge SHA does not exist: ${node.mergeSha}`,
        );
      }
      if (!isAncestor(node.mergeSha, graphRecord.repository.defaultBranch)) {
        errors.push(
          `done slice ${node.id} merge SHA ${node.mergeSha} is not an ancestor of ${graphRecord.repository.defaultBranch}`,
        );
      }
    } else if (node.kind === "slice" && node.status === "running") {
      evidenceDescendant = "HEAD";
      if (checkPullRequests && node.pr.length > 0) {
        const pullRequest = pullRequests.get(node.pr);
        if (!pullRequest) {
          errors.push(
            `running slice ${node.id} pull request does not exist: ${node.pr}`,
          );
        } else if (pullRequest.state !== "OPEN") {
          errors.push(
            `running slice ${node.id} pull request is ${pullRequest.state}, not OPEN: ${node.pr}`,
          );
        }
      }
      if (!existingCommits.has(node.baseSha)) {
        errors.push(
          `running slice ${node.id} base SHA does not exist: ${node.baseSha}`,
        );
      }
      if (!isAncestor(node.baseSha, "HEAD")) {
        errors.push(
          `running slice ${node.id} base SHA ${node.baseSha} is not an ancestor of HEAD`,
        );
      }
      errors.push(
        ...validateChangedPathOwnership(facts.changedPaths, node.ownership),
      );
    } else if (node.status === "abandoned" || node.status === "superseded") {
      evidenceDescendant = "HEAD";
    } else if (node.status === "done") {
      evidenceDescendant = graphRecord.repository.defaultBranch;
    }

    if (evidenceDescendant !== null) {
      for (const evidence of node.evidence) {
        if (!existingCommits.has(evidence.commitSha)) {
          errors.push(
            `node ${node.id} evidence commit does not exist: ${evidence.commitSha}`,
          );
        }
        if (!isAncestor(evidence.commitSha, evidenceDescendant)) {
          errors.push(
            `node ${node.id} evidence commit ${evidence.commitSha} is not an ancestor of ${evidenceDescendant}`,
          );
        }
      }
    }
  }

  return [...new Set(errors)].sort();
}

type ReconciliationGraph = {
  repository: { slug: string; defaultBranch: string };
  nodes: Array<{
    baseSha: string;
    evidence: Array<{ commitSha: string }>;
    id: string;
    kind: string;
    mergeSha: string;
    ownership: string[];
    pr: string;
    status: string;
  }>;
};

function runGit(cwd: string, args: readonly string[]) {
  return spawnSync("git", [...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolveDefaultBranchRef(cwd: string, defaultBranch: string) {
  for (const candidate of [defaultBranch, `origin/${defaultBranch}`]) {
    if (
      runGit(cwd, ["rev-parse", "--verify", `${candidate}^{commit}`]).status ===
      0
    ) {
      return candidate;
    }
  }
  return defaultBranch;
}

function collectLocalRepositoryFacts(graph: ReconciliationGraph, cwd: string) {
  const errors: string[] = [];
  const facts: RepositoryFacts = {
    changedPaths: [],
    existingCommits: [],
    ancestorPairs: [],
    pullRequests: [],
  };
  const relevantNodes = graph.nodes.filter((node) =>
    ["running", "done", "abandoned", "superseded"].includes(node.status),
  );
  const commits = new Set<string>();
  for (const node of relevantNodes) {
    if (node.kind === "slice" && node.status === "running") {
      commits.add(node.baseSha);
    } else if (node.kind === "slice" && node.status === "done") {
      commits.add(node.mergeSha);
    }
    for (const evidence of node.evidence) {
      commits.add(evidence.commitSha);
    }
  }

  for (const commit of [...commits].sort()) {
    if (runGit(cwd, ["cat-file", "-e", `${commit}^{commit}`]).status === 0) {
      facts.existingCommits.push(commit);
    }
  }

  const defaultBranchRef = resolveDefaultBranchRef(
    cwd,
    graph.repository.defaultBranch,
  );
  const requiredPairs: Array<{
    ancestor: string;
    descendant: string;
    gitDescendant: string;
  }> = [];
  for (const node of relevantNodes) {
    if (node.kind === "slice" && node.status === "running") {
      requiredPairs.push({
        ancestor: node.baseSha,
        descendant: "HEAD",
        gitDescendant: "HEAD",
      });
      for (const evidence of node.evidence) {
        requiredPairs.push({
          ancestor: evidence.commitSha,
          descendant: "HEAD",
          gitDescendant: "HEAD",
        });
      }

      const diff = runGit(cwd, [
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        `${node.baseSha}...HEAD`,
      ]);
      if (diff.status === 0) {
        facts.changedPaths.push(
          ...diff.stdout.split(/\r?\n/).filter((path) => path.length > 0),
        );
      } else {
        errors.push(
          `unable to list changed paths for running slice ${node.id}`,
        );
      }
    } else if (node.kind === "slice" && node.status === "done") {
      requiredPairs.push({
        ancestor: node.mergeSha,
        descendant: graph.repository.defaultBranch,
        gitDescendant: defaultBranchRef,
      });
      for (const evidence of node.evidence) {
        requiredPairs.push({
          ancestor: evidence.commitSha,
          descendant: node.mergeSha,
          gitDescendant: node.mergeSha,
        });
      }
    } else {
      const descendant =
        node.status === "abandoned" || node.status === "superseded"
          ? "HEAD"
          : graph.repository.defaultBranch;
      const gitDescendant = descendant === "HEAD" ? "HEAD" : defaultBranchRef;
      for (const evidence of node.evidence) {
        requiredPairs.push({
          ancestor: evidence.commitSha,
          descendant,
          gitDescendant,
        });
      }
    }
  }

  const uniquePairs = new Map(
    requiredPairs.map((pair) => [
      `${pair.ancestor}\u0000${pair.descendant}`,
      pair,
    ]),
  );
  for (const pair of uniquePairs.values()) {
    const result = runGit(cwd, [
      "merge-base",
      "--is-ancestor",
      pair.ancestor,
      pair.gitDescendant,
    ]);
    if (result.status === 0) {
      facts.ancestorPairs.push({
        ancestor: pair.ancestor,
        descendant: pair.descendant,
      });
    } else if (result.status !== 1) {
      errors.push(
        `unable to test ancestry ${pair.ancestor} -> ${pair.descendant}`,
      );
    }
  }

  facts.changedPaths = [...new Set(facts.changedPaths)].sort();
  facts.existingCommits.sort();
  facts.ancestorPairs.sort((left, right) =>
    `${left.ancestor}\u0000${left.descendant}`.localeCompare(
      `${right.ancestor}\u0000${right.descendant}`,
    ),
  );
  return { errors: [...new Set(errors)].sort(), facts };
}

async function collectPullRequestFacts(
  graph: ReconciliationGraph,
  environment: NodeJS.ProcessEnv,
) {
  const token = environment.GITHUB_TOKEN ?? environment.GH_TOKEN;
  if (!token) {
    return {
      errors: [
        "Live pull-request claims are unverified: GITHUB_TOKEN or GH_TOKEN is required for live reconciliation",
      ],
      pullRequests: [] as PullRequestFact[],
    };
  }

  const errors: string[] = [];
  const pullRequests: PullRequestFact[] = [];
  const urls = [
    ...new Set(
      graph.nodes
        .filter(
          (node) =>
            node.kind === "slice" &&
            (node.status === "done" || node.status === "running") &&
            node.pr.length > 0,
        )
        .map((node) => node.pr),
    ),
  ].sort();
  for (const url of urls) {
    const number = new URL(url).pathname.split("/").at(-1);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${graph.repository.slug}/pulls/${number}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "pest-patrol-rebuild-reconciler",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        errors.push(
          `unable to read pull request ${url}: GitHub returned ${response.status}`,
        );
        continue;
      }
      const body = (await response.json()) as {
        merged?: boolean;
        merge_commit_sha?: string | null;
        state?: string;
      };
      pullRequests.push({
        url,
        state: body.merged
          ? "MERGED"
          : body.state === "open"
            ? "OPEN"
            : "CLOSED",
        mergeSha: body.merge_commit_sha ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.name : "unknown error";
      errors.push(`unable to read pull request ${url}: ${message}`);
    }
  }
  return { errors: [...new Set(errors)].sort(), pullRequests };
}

export async function runRebuildGraphReconcileCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
) {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : [...args];
  const offline = normalizedArgs.includes("--offline");
  const pathArgs = normalizedArgs.filter((arg) => arg !== "--offline");
  if (pathArgs.length > 1) {
    console.error(
      "Usage: rebuild:graph:reconcile [--offline] [path-to-graph.json]",
    );
    return 1;
  }

  const inputPath = pathArgs[0] ?? "docs/rebuild/graph.json";
  let graph: unknown;
  try {
    graph = JSON.parse(readFileSync(resolve(cwd, inputPath), "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to read rebuild graph ${inputPath}: ${message}`);
    return 1;
  }

  const structuralErrors = validateRebuildGraph(graph);
  if (structuralErrors.length > 0) {
    structuralErrors.forEach((error) => console.error(error));
    return 1;
  }

  const typedGraph = graph as ReconciliationGraph;
  const local = collectLocalRepositoryFacts(typedGraph, cwd);
  let checkPullRequests = false;
  if (!offline) {
    const remote = await collectPullRequestFacts(typedGraph, environment);
    local.errors.push(...remote.errors);
    local.facts.pullRequests = remote.pullRequests;
    checkPullRequests = remote.errors.length === 0;
  }
  const claimErrors = validateRepositoryClaimsWithOptions(
    graph,
    local.facts,
    checkPullRequests,
  );
  const errors = [...new Set([...local.errors, ...claimErrors])].sort();
  if (errors.length > 0) {
    errors.forEach((error) => console.error(error));
    return 1;
  }

  console.log(`Rebuild graph repository facts are valid: ${inputPath}`);
  if (offline) {
    console.log("Live pull-request checks were not requested (--offline).");
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runRebuildGraphReconcileCli().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Rebuild graph reconciliation failed: ${message}`);
      process.exitCode = 1;
    },
  );
}
