import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix, relative, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import { validateRebuildGraph } from "./rebuild-graph";

export type PullRequestFact = {
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  mergeSha: string | null;
};

export type SliceSourceFact = {
  url: string;
  headSha: string;
  headTreeSha: string;
  mergeTreeSha: string;
  commitShas: string[];
};

export type RepositoryFacts = {
  /**
   * True when HEAD is not the default branch and its rebuild graph is byte for
   * byte the default branch's. Such a tree cannot resolve a running slice it
   * merely inherited, so it is not held to one.
   */
  graphInheritedFromDefaultBranch?: boolean;
  changedPaths: string[];
  existingCommits: string[];
  ancestorPairs: Array<{ ancestor: string; descendant: string }>;
  pullRequests: PullRequestFact[];
  sliceSources: SliceSourceFact[];
};

function sourceTagRef(nodeId: string) {
  return `refs/tags/rebuild/${nodeId.toLowerCase()}-source`;
}

/**
 * Whether a running slice's pull request has already merged and landed on the
 * default branch.
 *
 * A pull request becomes MERGED at the one moment when no pull request is open
 * to record it, so the graph is necessarily one step behind at that point. The
 * window is expected rather than a defect: nothing depends on the record being
 * fresh until the next slice is promoted, and `pnpm rebuild:graph:check`
 * already refuses to promote a dependent while this node is not done. Treating
 * it as a failure is what forced a separate reconciliation pull request after
 * every slice, and turned the default branch red until it merged.
 *
 * A merge that has not landed is a different thing entirely and stays an
 * error, as does a pull request closed without merging.
 */
function isMergedAndLanded(
  pullRequest: PullRequestFact | undefined,
  defaultBranch: string,
  isAncestor: (ancestor: string, descendant: string) => boolean,
) {
  if (!pullRequest || pullRequest.state !== "MERGED") {
    return false;
  }
  const mergeSha = pullRequest.mergeSha ?? "";
  return mergeSha.length > 0 && isAncestor(mergeSha, defaultBranch);
}

/**
 * Whether a node is in flight on this branch and must answer for it.
 *
 * Write tasks are held to exactly what a slice is held to. The graph validator
 * has always accepted `kind: "task"` and forbids two running tasks from owning
 * overlapping paths, but every enforcement below used to ask for `kind ===
 * "slice"`, so a running task passed reconciliation in silence: no ownership
 * boundary, no pull-request state, no base-SHA ancestry. That is the failure
 * this repository keeps rediscovering — a requirement recorded where the
 * enforcement never reads it — and decomposing a slice into tasks would have
 * been the first time it disabled the gate rather than merely failed to add one.
 *
 * One branch resolves at most one running node, so this needs no notion of
 * which task a tree belongs to: a promotion commit that sets a node to
 * `running` lives on that node's own branch, and siblings are still `planned`
 * in the graph this tree carries.
 */
function isRunningWriteNode(node: { kind: string; status: string }) {
  return (
    (node.kind === "slice" || node.kind === "task") && node.status === "running"
  );
}

/**
 * Running slices and write tasks whose pull request has already merged into the
 * default branch, so the caller can report that the record is behind without
 * failing.
 */
export function findMergedRunningSlices(
  graph: unknown,
  facts: RepositoryFacts,
  checkPullRequests = true,
): string[] {
  if (!checkPullRequests || validateRebuildGraph(graph).length > 0) {
    return [];
  }
  const graphRecord = graph as {
    repository: { defaultBranch: string };
    nodes: Array<{ id: string; kind: string; pr: string; status: string }>;
  };
  const pullRequests = new Map(facts.pullRequests.map((pr) => [pr.url, pr]));
  const ancestorPairs = new Set(
    facts.ancestorPairs.map(
      ({ ancestor, descendant }) => `${ancestor}\u0000${descendant}`,
    ),
  );
  const isAncestor = (ancestor: string, descendant: string) =>
    ancestorPairs.has(`${ancestor}\u0000${descendant}`);

  return graphRecord.nodes
    .filter(
      (node) =>
        isRunningWriteNode(node) &&
        node.pr.length > 0 &&
        isMergedAndLanded(
          pullRequests.get(node.pr),
          graphRecord.repository.defaultBranch,
          isAncestor,
        ),
    )
    .map((node) => node.id);
}

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

const STANDING_SLICE_OWNERSHIP = new Set([
  "docs/rebuild/graph.json",
  "pnpm-lock.yaml",
  "tasks/in-progress.md",
]);

function isStandingSliceOwnership(path: string, sliceId: string) {
  if (STANDING_SLICE_OWNERSHIP.has(path)) {
    return true;
  }
  if (!path.startsWith("docs/superpowers/plans/") || !path.endsWith(".md")) {
    return false;
  }

  const escapedSliceId = sliceId
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|-)${escapedSliceId}(?:-|\\.md$)`).test(
    posix.basename(path),
  );
}

export function validateChangedPathOwnership(
  changedPaths: readonly string[],
  ownership: readonly string[],
  sliceId?: string,
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
      !(
        (sliceId && isStandingSliceOwnership(changedPath, sliceId)) ||
        validOwnership.some(
          (ownedPath) =>
            changedPath === ownedPath ||
            changedPath.startsWith(`${ownedPath}/`),
        )
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
  const sliceSources = new Map(
    facts.sliceSources.map((source) => [source.url, source]),
  );
  const isAncestor = (ancestor: string, descendant: string) =>
    ancestorPairs.has(`${ancestor}\u0000${descendant}`);

  for (const node of graphRecord.nodes) {
    let evidenceDescendant: string | null = null;
    let sourceEvidenceCommits: Set<string> | null = null;
    if (node.kind === "slice" && node.status === "done") {
      const source = sliceSources.get(node.pr);
      if (!source) {
        errors.push(
          `done slice ${node.id} source tag ${sourceTagRef(node.id)} is unavailable; fetch tags or run live reconciliation`,
        );
      } else {
        sourceEvidenceCommits = new Set(source.commitShas);
        if (!sourceEvidenceCommits.has(source.headSha)) {
          errors.push(
            `done slice ${node.id} pull request head commit is missing from source history: ${source.headSha}`,
          );
        }
        if (source.headTreeSha !== source.mergeTreeSha) {
          errors.push(
            `done slice ${node.id} merged tree ${source.mergeTreeSha} does not match pull request head tree ${source.headTreeSha}`,
          );
        }
      }
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
    } else if (isRunningWriteNode(node)) {
      if (facts.graphInheritedFromDefaultBranch) {
        // Every check below asks whether *this* branch is the running slice:
        // its pull request open, its base an ancestor of HEAD, its evidence
        // present, its changed paths within the slice's ownership. A branch
        // that leaves the graph exactly as the default branch wrote it is not
        // that slice and cannot make any of them true. Failing it reports a
        // problem only the default branch can fix, and takes every unrelated
        // pull request down with it.
        continue;
      }
      if (checkPullRequests && node.pr.length > 0) {
        const pullRequest = pullRequests.get(node.pr);
        if (!pullRequest) {
          errors.push(
            `running ${node.kind} ${node.id} pull request does not exist: ${node.pr}`,
          );
        } else if (pullRequest.state === "MERGED") {
          // The record is one step behind, which is expected. Every remaining
          // check below asks whether this slice is still in flight — its base
          // an ancestor of HEAD, its changed paths inside its ownership, its
          // evidence an ancestor of HEAD — and none of them are answerable
          // once the slice has merged and other work has landed on top. The
          // node is validated in full, and more strictly, once it is recorded
          // as done.
          const mergeSha = pullRequest.mergeSha ?? "";
          if (mergeSha.length === 0) {
            errors.push(
              `running ${node.kind} ${node.id} pull request is MERGED without a merge commit: ${node.pr}`,
            );
          } else if (
            !isAncestor(mergeSha, graphRecord.repository.defaultBranch)
          ) {
            errors.push(
              `running ${node.kind} ${node.id} pull request is MERGED as ${mergeSha}, which has not landed on ${graphRecord.repository.defaultBranch}: ${node.pr}`,
            );
          } else {
            continue;
          }
        } else if (pullRequest.state !== "OPEN") {
          errors.push(
            `running ${node.kind} ${node.id} pull request is ${pullRequest.state}, not OPEN: ${node.pr}`,
          );
        }
      }
      evidenceDescendant = "HEAD";
      if (!existingCommits.has(node.baseSha)) {
        errors.push(
          `running ${node.kind} ${node.id} base SHA does not exist: ${node.baseSha}`,
        );
      }
      if (!isAncestor(node.baseSha, "HEAD")) {
        errors.push(
          `running ${node.kind} ${node.id} base SHA ${node.baseSha} is not an ancestor of HEAD`,
        );
      }
      errors.push(
        ...validateChangedPathOwnership(
          facts.changedPaths,
          node.ownership,
          node.id,
        ),
      );
    } else if (node.status === "abandoned" || node.status === "superseded") {
      evidenceDescendant = "HEAD";
    } else if (node.status === "done") {
      evidenceDescendant = graphRecord.repository.defaultBranch;
    }

    if (sourceEvidenceCommits !== null) {
      for (const evidence of node.evidence) {
        if (!sourceEvidenceCommits.has(evidence.commitSha)) {
          errors.push(
            `node ${node.id} evidence commit ${evidence.commitSha} is not part of merged pull request ${node.pr}`,
          );
        }
      }
    } else if (evidenceDescendant !== null) {
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
    branch: string;
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

/**
 * Whether this tree merely inherited its rebuild graph. True when HEAD is not
 * the default branch's tip and the graph file is unchanged against it. A graph
 * outside the repository, or one the default branch does not track, is treated
 * as changed so a fixture or a new graph is still fully validated.
 */
function isGraphInheritedFromDefaultBranch(
  cwd: string,
  defaultBranchRef: string,
  graphPath: string,
) {
  const head = runGit(cwd, ["rev-parse", "HEAD"]);
  const base = runGit(cwd, ["rev-parse", defaultBranchRef]);
  if (head.status !== 0 || base.status !== 0) {
    return false;
  }
  if (head.stdout.trim() === base.stdout.trim()) {
    return false;
  }
  const relativePath = relative(resolve(cwd), resolve(cwd, graphPath));
  if (relativePath.length === 0 || relativePath.startsWith("..")) {
    return false;
  }
  const tracked = runGit(cwd, [
    "cat-file",
    "-e",
    `${defaultBranchRef}:${relativePath}`,
  ]);
  if (tracked.status !== 0) {
    return false;
  }
  const diff = runGit(cwd, [
    "diff",
    "--name-only",
    `${defaultBranchRef}...HEAD`,
    "--",
    relativePath,
  ]);
  return diff.status === 0 && diff.stdout.trim().length === 0;
}

function resolveDefaultBranchRef(cwd: string, defaultBranch: string) {
  for (const candidate of [`origin/${defaultBranch}`, defaultBranch]) {
    if (
      runGit(cwd, ["rev-parse", "--verify", `${candidate}^{commit}`]).status ===
      0
    ) {
      return candidate;
    }
  }
  return defaultBranch;
}

function resolveSourceTagRef(cwd: string, nodeId: string) {
  const candidate = sourceTagRef(nodeId);
  return runGit(cwd, ["rev-parse", "--verify", `${candidate}^{commit}`])
    .status === 0
    ? candidate
    : null;
}

function collectLocalRepositoryFacts(
  graph: ReconciliationGraph,
  cwd: string,
  graphInheritedFromDefaultBranch = false,
) {
  const errors: string[] = [];
  const facts: RepositoryFacts = {
    graphInheritedFromDefaultBranch,
    changedPaths: [],
    existingCommits: [],
    ancestorPairs: [],
    pullRequests: [],
    sliceSources: [],
  };
  const relevantNodes = graph.nodes.filter((node) =>
    ["running", "done", "abandoned", "superseded"].includes(node.status),
  );
  const commits = new Set<string>();
  for (const node of relevantNodes) {
    if (isRunningWriteNode(node)) {
      commits.add(node.baseSha);
    } else if (node.kind === "slice" && node.status === "done") {
      commits.add(node.mergeSha);
    }
    for (const evidence of node.evidence) {
      commits.add(evidence.commitSha);
    }
  }

  for (const node of relevantNodes) {
    if (node.kind !== "slice" || node.status !== "done") {
      continue;
    }
    const sourceRef = resolveSourceTagRef(cwd, node.id);
    if (!sourceRef) {
      errors.push(
        `done slice ${node.id} source tag ${sourceTagRef(node.id)} is unavailable; fetch tags or run live reconciliation`,
      );
      continue;
    }
    const headSha = runGit(cwd, ["rev-parse", `${sourceRef}^{commit}`]);
    const headTreeSha = runGit(cwd, ["rev-parse", `${sourceRef}^{tree}`]);
    const mergeTreeSha = runGit(cwd, ["rev-parse", `${node.mergeSha}^{tree}`]);
    const commitShas = runGit(cwd, [
      "rev-list",
      "--reverse",
      `${node.baseSha}..${sourceRef}`,
    ]);
    if (
      [headSha, headTreeSha, mergeTreeSha, commitShas].some(
        (result) => result.status !== 0,
      )
    ) {
      errors.push(
        `unable to reconstruct source provenance for done slice ${node.id}`,
      );
      continue;
    }
    facts.sliceSources.push({
      url: node.pr,
      headSha: headSha.stdout.trim(),
      headTreeSha: headTreeSha.stdout.trim(),
      mergeTreeSha: mergeTreeSha.stdout.trim(),
      commitShas: commitShas.stdout
        .split(/\r?\n/)
        .filter((sha) => sha.length > 0),
    });
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
    if (isRunningWriteNode(node)) {
      if (facts.graphInheritedFromDefaultBranch) {
        continue;
      }
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
        `${defaultBranchRef}...HEAD`,
      ]);
      if (diff.status === 0) {
        facts.changedPaths.push(
          ...diff.stdout.split(/\r?\n/).filter((path) => path.length > 0),
        );
      } else {
        errors.push(
          `unable to list changed paths for running ${node.kind} ${node.id}`,
        );
      }
    } else if (node.kind === "slice" && node.status === "done") {
      requiredPairs.push({
        ancestor: node.mergeSha,
        descendant: graph.repository.defaultBranch,
        gitDescendant: defaultBranchRef,
      });
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
  facts.sliceSources.sort((left, right) => left.url.localeCompare(right.url));
  facts.ancestorPairs.sort((left, right) =>
    `${left.ancestor}\u0000${left.descendant}`.localeCompare(
      `${right.ancestor}\u0000${right.descendant}`,
    ),
  );
  return { errors: [...new Set(errors)].sort(), facts };
}

/**
 * Ancestry for a merged pull request's merge commit.
 *
 * The local pass cannot know this pair: a running node records no merge SHA of
 * its own, so the SHA only arrives with the live pull-request facts. Without it
 * a merged running slice looks like a merge that never landed.
 */
function appendMergedRunningSliceAncestry(
  graph: ReconciliationGraph,
  facts: RepositoryFacts,
  cwd: string,
) {
  const errors: string[] = [];
  const defaultBranchRef = resolveDefaultBranchRef(
    cwd,
    graph.repository.defaultBranch,
  );
  const pullRequests = new Map(facts.pullRequests.map((pr) => [pr.url, pr]));
  const known = new Set(
    facts.ancestorPairs.map(
      ({ ancestor, descendant }) => `${ancestor}\u0000${descendant}`,
    ),
  );
  for (const node of graph.nodes) {
    if (
      node.kind !== "slice" ||
      node.status !== "running" ||
      node.pr.length === 0
    ) {
      continue;
    }
    const pullRequest = pullRequests.get(node.pr);
    if (!pullRequest || pullRequest.state !== "MERGED") {
      continue;
    }
    const mergeSha = pullRequest.mergeSha ?? "";
    const key = `${mergeSha}\u0000${graph.repository.defaultBranch}`;
    if (mergeSha.length === 0 || known.has(key)) {
      continue;
    }
    const result = runGit(cwd, [
      "merge-base",
      "--is-ancestor",
      mergeSha,
      defaultBranchRef,
    ]);
    if (result.status === 0) {
      facts.ancestorPairs.push({
        ancestor: mergeSha,
        descendant: graph.repository.defaultBranch,
      });
      known.add(key);
    } else if (result.status !== 1) {
      errors.push(
        `unable to test ancestry ${mergeSha} -> ${graph.repository.defaultBranch}`,
      );
    }
  }
  return errors;
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
      sliceSources: [] as SliceSourceFact[],
    };
  }

  const errors: string[] = [];
  const pullRequests: PullRequestFact[] = [];
  const sliceSources: SliceSourceFact[] = [];
  const request = (url: string) =>
    fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "pest-patrol-rebuild-reconciler",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    });
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
      const response = await request(
        `https://api.github.com/repos/${graph.repository.slug}/pulls/${number}`,
      );
      if (!response.ok) {
        errors.push(
          `unable to read pull request ${url}: GitHub returned ${response.status}`,
        );
        continue;
      }
      const body = (await response.json()) as {
        head?: { sha?: string };
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
      if (!body.merged) {
        continue;
      }

      const headSha = body.head?.sha;
      const mergeSha = body.merge_commit_sha;
      if (!headSha || !mergeSha) {
        errors.push(`unable to read merged source identity for ${url}`);
        continue;
      }

      const commitShas: string[] = [];
      for (let page = 1; page <= 100; page += 1) {
        const commitsResponse = await request(
          `https://api.github.com/repos/${graph.repository.slug}/pulls/${number}/commits?per_page=100&page=${page}`,
        );
        if (!commitsResponse.ok) {
          errors.push(
            `unable to read pull request commits ${url}: GitHub returned ${commitsResponse.status}`,
          );
          break;
        }
        const commitsBody = (await commitsResponse.json()) as Array<{
          sha?: string;
        }>;
        if (!Array.isArray(commitsBody)) {
          errors.push(
            `unable to read pull request commits ${url}: malformed response`,
          );
          break;
        }
        commitShas.push(
          ...commitsBody
            .map((commit) => commit.sha)
            .filter((sha): sha is string => typeof sha === "string"),
        );
        if (commitsBody.length < 100) {
          break;
        }
        if (page === 100) {
          errors.push(`pull request commit pagination exceeded limit: ${url}`);
        }
      }
      if (!commitShas.includes(headSha)) {
        errors.push(
          `pull request head commit is missing from commit list: ${url}`,
        );
        continue;
      }

      const [headResponse, mergeResponse] = await Promise.all([
        request(
          `https://api.github.com/repos/${graph.repository.slug}/git/commits/${headSha}`,
        ),
        request(
          `https://api.github.com/repos/${graph.repository.slug}/git/commits/${mergeSha}`,
        ),
      ]);
      if (!headResponse.ok || !mergeResponse.ok) {
        errors.push(`unable to read pull request tree identities: ${url}`);
        continue;
      }
      const headCommit = (await headResponse.json()) as {
        tree?: { sha?: string };
      };
      const mergeCommit = (await mergeResponse.json()) as {
        tree?: { sha?: string };
      };
      const headTreeSha = headCommit.tree?.sha;
      const mergeTreeSha = mergeCommit.tree?.sha;
      if (!headTreeSha || !mergeTreeSha) {
        errors.push(`pull request tree identities are malformed: ${url}`);
        continue;
      }
      sliceSources.push({
        url,
        headSha,
        headTreeSha,
        mergeTreeSha,
        commitShas,
      });
    } catch (error) {
      const message = error instanceof Error ? error.name : "unknown error";
      errors.push(`unable to read pull request ${url}: ${message}`);
    }
  }
  return {
    errors: [...new Set(errors)].sort(),
    pullRequests,
    sliceSources,
  };
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
  const graphInherited = isGraphInheritedFromDefaultBranch(
    cwd,
    resolveDefaultBranchRef(cwd, typedGraph.repository.defaultBranch),
    inputPath,
  );
  const local = collectLocalRepositoryFacts(typedGraph, cwd, graphInherited);
  let checkPullRequests = false;
  if (!offline) {
    const remote = await collectPullRequestFacts(typedGraph, environment);
    local.errors.push(...remote.errors);
    local.facts.pullRequests = remote.pullRequests;
    local.errors.push(
      ...appendMergedRunningSliceAncestry(typedGraph, local.facts, cwd),
    );
    const localSources = new Map(
      local.facts.sliceSources.map((source) => [source.url, source]),
    );
    for (const remoteSource of remote.sliceSources) {
      const localSource = localSources.get(remoteSource.url);
      if (!localSource || localSource.headSha === remoteSource.headSha) {
        continue;
      }
      const node = typedGraph.nodes.find(
        (candidate) => candidate.pr === remoteSource.url,
      );
      if (node) {
        local.errors.push(
          `done slice ${node.id} source tag ${sourceTagRef(node.id)} points to ${localSource.headSha}, not pull request head ${remoteSource.headSha}`,
        );
      }
    }
    local.facts.sliceSources = [
      ...new Map(
        [...local.facts.sliceSources, ...remote.sliceSources].map((source) => [
          source.url,
          source,
        ]),
      ).values(),
    ];
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
  if (graphInherited) {
    console.log(
      "Running-node checks were skipped: this branch's rebuild graph is inherited unchanged from the default branch.",
    );
  }
  const mergedRunning = findMergedRunningSlices(
    graph,
    local.facts,
    checkPullRequests,
  );
  if (mergedRunning.length > 0) {
    console.log(
      `Running-node checks were skipped for ${mergedRunning.join(", ")}: the pull request has already merged, so the graph record is one step behind. Record the node as done before promoting a dependent.`,
    );
  }
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
