import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  findMergedRunningSlices,
  runRebuildGraphReconcileCli,
  validateChangedPathOwnership,
  validateRepositoryClaims,
  type RepositoryFacts,
} from "./rebuild-graph-reconcile";

const BASE_SHA = "1111111111111111111111111111111111111111";
const EVIDENCE_SHA = "2222222222222222222222222222222222222222";
const MERGE_SHA = "3333333333333333333333333333333333333333";
const OTHER_SHA = "4444444444444444444444444444444444444444";
const TREE_SHA = "5555555555555555555555555555555555555555";
const OTHER_TREE_SHA = "6666666666666666666666666666666666666666";
const PR_URL = "https://github.com/otto-agent007/pp/pull/146";

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return result.stdout.trim();
}

function createSquashFixture() {
  const directory = mkdtempSync(join(tmpdir(), "rebuild-squash-"));
  git(directory, ["init", "-b", "main"]);
  git(directory, ["config", "user.email", "tests@example.com"]);
  git(directory, ["config", "user.name", "Rebuild Tests"]);
  writeFileSync(join(directory, "fixture.txt"), "base\n", "utf8");
  git(directory, ["add", "fixture.txt"]);
  git(directory, ["commit", "-m", "base"]);
  const baseSha = git(directory, ["rev-parse", "HEAD"]);

  git(directory, ["switch", "-c", "codex/rebuild-test-v1"]);
  writeFileSync(join(directory, "fixture.txt"), "source\n", "utf8");
  git(directory, ["add", "fixture.txt"]);
  git(directory, ["commit", "-m", "source evidence"]);
  const evidenceSha = git(directory, ["rev-parse", "HEAD"]);
  const sourceTreeSha = git(directory, ["rev-parse", "HEAD^{tree}"]);

  git(directory, ["switch", "main"]);
  git(directory, ["merge", "--squash", "codex/rebuild-test-v1"]);
  git(directory, ["commit", "-m", "squash merge"]);
  const mergeSha = git(directory, ["rev-parse", "HEAD"]);

  const graph = doneGraph();
  graph.nodes = graph.nodes.map((node) => ({
    ...node,
    baseSha,
    branch: "codex/rebuild-test-v1",
    evidence: node.evidence.map((evidence) => ({
      ...evidence,
      commitSha: evidenceSha,
    })),
    mergeSha,
  }));
  const graphPath = join(directory, "graph.json");
  writeFileSync(graphPath, JSON.stringify(graph), "utf8");

  return {
    baseSha,
    directory,
    evidenceSha,
    graphPath,
    mergeSha,
    sourceTreeSha,
  };
}

function createRunningSliceMergeFixture() {
  const directory = mkdtempSync(join(tmpdir(), "rebuild-running-merge-"));
  git(directory, ["init", "-b", "main"]);
  git(directory, ["config", "user.email", "tests@example.com"]);
  git(directory, ["config", "user.name", "Rebuild Tests"]);
  mkdirSync(join(directory, "tooling"), { recursive: true });
  writeFileSync(join(directory, "tooling", "check.ts"), "base\n", "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "base"]);
  const baseSha = git(directory, ["rev-parse", "HEAD"]);

  git(directory, ["switch", "-c", "codex/rebuild-test-v1"]);
  writeFileSync(join(directory, "tooling", "check.ts"), "slice change\n", "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "slice's own change"]);

  git(directory, ["switch", "main"]);
  mkdirSync(join(directory, "docs"), { recursive: true });
  writeFileSync(join(directory, "docs", "other.md"), "sibling change\n", "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "sibling PR already merged to main"]);

  git(directory, ["switch", "codex/rebuild-test-v1"]);
  git(directory, ["merge", "main", "--no-edit"]);

  const graph = runningGraph();
  graph.nodes = graph.nodes.map((node) => ({
    ...node,
    baseSha,
    branch: "codex/rebuild-test-v1",
    evidence: [],
  }));
  const graphPath = join(directory, "graph.json");
  writeFileSync(graphPath, JSON.stringify(graph), "utf8");

  return { baseSha, directory, graphPath };
}

/**
 * A branch that changes nothing under the rebuild graph, while the graph it
 * inherited from the default branch still names a running slice. This is every
 * unrelated pull request opened while a slice is in flight.
 */
function createInheritedGraphFixture() {
  const directory = mkdtempSync(join(tmpdir(), "rebuild-inherited-"));
  git(directory, ["init", "-b", "main"]);
  git(directory, ["config", "user.email", "tests@example.com"]);
  git(directory, ["config", "user.name", "Rebuild Tests"]);
  mkdirSync(join(directory, "docs", "rebuild"), { recursive: true });
  mkdirSync(join(directory, "tooling"), { recursive: true });
  writeFileSync(join(directory, "tooling", "check.ts"), "base\n", "utf8");
  const graph = runningGraph();
  const baseCommitGraph = {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      branch: "codex/rebuild-test-v1",
      evidence: [],
    })),
  };
  const graphPath = join(directory, "docs", "rebuild", "graph.json");
  writeFileSync(graphPath, JSON.stringify(baseCommitGraph), "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "base"]);
  const baseSha = git(directory, ["rev-parse", "HEAD"]);

  // An unrelated branch touches only its own files, never the graph.
  git(directory, ["switch", "-c", "codex/unrelated-v1"]);
  mkdirSync(join(directory, "tools", "other", "src"), { recursive: true });
  writeFileSync(
    join(directory, "tools", "other", "src", "client.ts"),
    "export {};\n",
    "utf8",
  );
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "unrelated work"]);

  const finalGraph = {
    ...baseCommitGraph,
    nodes: baseCommitGraph.nodes.map((node) => ({ ...node, baseSha })),
  };
  writeFileSync(graphPath, JSON.stringify(finalGraph), "utf8");
  git(directory, ["switch", "main"]);
  writeFileSync(graphPath, JSON.stringify(finalGraph), "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "record slice base"]);
  git(directory, ["switch", "codex/unrelated-v1"]);
  git(directory, ["merge", "main", "--no-edit"]);

  return { baseSha, directory, graphPath };
}

/**
 * The default branch just after a slice merged, before its record caught up:
 * CR00 is still `running`, its pull request is merged, and an unrelated commit
 * the slice does not own has already landed on top of the merge.
 */
function createMergedRunningSliceFixture() {
  const directory = mkdtempSync(join(tmpdir(), "rebuild-merged-running-"));
  git(directory, ["init", "-b", "main"]);
  git(directory, ["config", "user.email", "tests@example.com"]);
  git(directory, ["config", "user.name", "Rebuild Tests"]);
  mkdirSync(join(directory, "tooling"), { recursive: true });
  writeFileSync(join(directory, "tooling", "check.ts"), "base\n", "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "base"]);
  const baseSha = git(directory, ["rev-parse", "HEAD"]);

  git(directory, ["switch", "-c", "codex/rebuild-test-v1"]);
  writeFileSync(join(directory, "tooling", "check.ts"), "slice\n", "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "slice change"]);
  const headSha = git(directory, ["rev-parse", "HEAD"]);

  git(directory, ["switch", "main"]);
  git(directory, ["merge", "--no-ff", "codex/rebuild-test-v1", "-m", "merge"]);
  const mergeSha = git(directory, ["rev-parse", "HEAD"]);

  // Unrelated work lands on top, outside the slice's ownership. While the
  // slice was in flight this was an ownership error; now it is meaningless.
  mkdirSync(join(directory, "tools", "other"), { recursive: true });
  writeFileSync(join(directory, "tools", "other", "client.ts"), "x\n", "utf8");
  const graph = runningGraph();
  graph.nodes = graph.nodes.map((node) => ({
    ...node,
    baseSha,
    branch: "codex/rebuild-test-v1",
    evidence: [],
  }));
  const graphPath = join(directory, "graph.json");
  writeFileSync(graphPath, JSON.stringify(graph), "utf8");
  git(directory, ["add", "."]);
  git(directory, ["commit", "-m", "unrelated work on top"]);

  return {
    baseSha,
    directory,
    graphPath,
    headSha,
    headTreeSha: git(directory, ["rev-parse", `${headSha}^{tree}`]),
    mergeSha,
    mergeTreeSha: git(directory, ["rev-parse", `${mergeSha}^{tree}`]),
  };
}

function mockMergedPullRequest(
  fixture: ReturnType<typeof createSquashFixture>,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/pulls/146")) {
      return new Response(
        JSON.stringify({
          head: { sha: fixture.evidenceSha },
          merged: true,
          merge_commit_sha: fixture.mergeSha,
          state: "closed",
        }),
        { status: 200 },
      );
    }
    if (url.includes("/pulls/146/commits")) {
      return new Response(JSON.stringify([{ sha: fixture.evidenceSha }]), {
        status: 200,
      });
    }
    if (url.endsWith(`/git/commits/${fixture.evidenceSha}`)) {
      return new Response(
        JSON.stringify({ tree: { sha: fixture.sourceTreeSha } }),
        { status: 200 },
      );
    }
    if (url.endsWith(`/git/commits/${fixture.mergeSha}`)) {
      return new Response(
        JSON.stringify({ tree: { sha: fixture.sourceTreeSha } }),
        { status: 200 },
      );
    }
    return new Response("not found", { status: 404 });
  });
}

function doneGraph() {
  return {
    schemaVersion: 1,
    repository: { slug: "otto-agent007/pp", defaultBranch: "main" },
    targetPolicy: { prereleases: "forbidden", refreshAt: "slice-start" },
    preferredPrOrder: ["CR00"],
    nodes: [
      {
        baseSha: BASE_SHA,
        id: "CR00",
        kind: "slice",
        status: "done",
        parent: null,
        dependencies: [],
        conflicts: [],
        ownership: ["tooling", ".github/workflows/ci.yml"],
        deliverables: ["control plane"],
        checks: ["pnpm test"],
        approvals: [],
        evidence: [
          {
            kind: "command",
            summary: "tests passed",
            command: "pnpm test",
            exitCode: 0,
            commitSha: EVIDENCE_SHA,
            recordedAt: "2026-08-24T20:00:00Z",
          },
        ],
        branch: "codex/rebuild-cr00-control-plane-v1",
        pr: PR_URL,
        mergeSha: MERGE_SHA,
        supersededBy: null,
        target: null,
      },
    ],
  };
}

function matchingFacts(
  overrides: Partial<RepositoryFacts> = {},
): RepositoryFacts {
  return {
    changedPaths: [],
    existingCommits: [BASE_SHA, EVIDENCE_SHA, MERGE_SHA],
    ancestorPairs: [
      { ancestor: MERGE_SHA, descendant: "main" },
      { ancestor: EVIDENCE_SHA, descendant: MERGE_SHA },
    ],
    pullRequests: [{ url: PR_URL, state: "MERGED", mergeSha: MERGE_SHA }],
    sliceSources: [
      {
        url: PR_URL,
        headSha: OTHER_SHA,
        headTreeSha: TREE_SHA,
        mergeTreeSha: TREE_SHA,
        commitShas: [EVIDENCE_SHA, OTHER_SHA],
      },
    ],
    ...overrides,
  };
}

function runningGraph() {
  const graph = doneGraph();
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      status: "running",
      mergeSha: "",
    })),
  };
}

describe("rebuild graph inherited from the default branch", () => {
  it("does not hold a branch to a running node it did not touch", () => {
    const facts: RepositoryFacts = {
      ...matchingFacts(),
      changedPaths: ["tools/other/src/client.ts"],
      graphInheritedFromDefaultBranch: true,
    };

    expect(validateRepositoryClaims(runningGraph(), facts)).toEqual([]);
  });

  it("still holds a branch that changes the graph to the running node", () => {
    const facts: RepositoryFacts = {
      ...matchingFacts(),
      changedPaths: ["tools/other/src/client.ts"],
      // The slice is genuinely in flight here. `matchingFacts` describes a
      // merged pull request, which is now a skipped state, so this case has to
      // say that the slice is still open for the ownership check to apply.
      pullRequests: [{ url: PR_URL, state: "OPEN", mergeSha: null }],
      graphInheritedFromDefaultBranch: false,
    };

    expect(validateRepositoryClaims(runningGraph(), facts)).toContain(
      "changed path tools/other/src/client.ts is outside running-node ownership",
    );
  });
});

describe("rebuild graph running slice whose pull request already merged", () => {
  /**
   * The window between a slice merging and its record catching up. A pull
   * request becomes MERGED when no pull request is open to record it, so the
   * graph is necessarily one step behind. Failing that window is what forced a
   * dedicated reconciliation pull request after every slice.
   */
  function mergedRunningFacts(overrides: Partial<RepositoryFacts> = {}) {
    return {
      ...matchingFacts({
        // Paths that landed on the default branch after the slice merged, and
        // that the slice does not own. While the slice was in flight this was
        // a real error; once it has merged the question is meaningless.
        changedPaths: ["tools/other/src/client.ts"],
        existingCommits: [BASE_SHA, EVIDENCE_SHA, MERGE_SHA],
        ancestorPairs: [{ ancestor: MERGE_SHA, descendant: "main" }],
        pullRequests: [{ url: PR_URL, state: "MERGED", mergeSha: MERGE_SHA }],
      }),
      ...overrides,
    };
  }

  it("accepts a running slice whose merge landed on the default branch", () => {
    expect(
      validateRepositoryClaims(runningGraph(), mergedRunningFacts()),
    ).toEqual([]);
  });

  it("reports the slices whose record is behind", () => {
    expect(
      findMergedRunningSlices(runningGraph(), mergedRunningFacts()),
    ).toEqual(["CR00"]);
    expect(
      findMergedRunningSlices(runningGraph(), mergedRunningFacts(), false),
    ).toEqual([]);
    expect(findMergedRunningSlices(doneGraph(), mergedRunningFacts())).toEqual(
      [],
    );
  });

  it("still rejects a merge that has not landed on the default branch", () => {
    expect(
      validateRepositoryClaims(
        runningGraph(),
        mergedRunningFacts({ ancestorPairs: [] }),
      ),
    ).toContain(
      `running slice CR00 pull request is MERGED as ${MERGE_SHA}, which has not landed on main: ${PR_URL}`,
    );
  });

  it("still rejects a merged pull request with no merge commit", () => {
    expect(
      validateRepositoryClaims(
        runningGraph(),
        mergedRunningFacts({
          pullRequests: [{ url: PR_URL, state: "MERGED", mergeSha: null }],
        }),
      ),
    ).toContain(
      `running slice CR00 pull request is MERGED without a merge commit: ${PR_URL}`,
    );
  });

  it("still rejects a pull request closed without merging", () => {
    expect(
      validateRepositoryClaims(
        runningGraph(),
        mergedRunningFacts({
          pullRequests: [{ url: PR_URL, state: "CLOSED", mergeSha: null }],
        }),
      ),
    ).toContain(
      `running slice CR00 pull request is CLOSED, not OPEN: ${PR_URL}`,
    );
  });
});

describe("rebuild graph changed-path ownership", () => {
  it("accepts exact files and descendants of declared directories", () => {
    expect(
      validateChangedPathOwnership(
        [".github/workflows/ci.yml", "tooling/nested/check.ts"],
        [".github/workflows/ci.yml", "tooling"],
      ),
    ).toEqual([]);
  });

  it("rejects prefix lookalikes and undeclared workflow changes", () => {
    expect(
      validateChangedPathOwnership(
        ["tooling-old/file.ts", ".github/workflows/ci.yml"],
        ["tooling"],
      ),
    ).toEqual([
      "changed path .github/workflows/ci.yml is outside running-node ownership",
      "changed path tooling-old/file.ts is outside running-node ownership",
    ]);
  });

  it("rejects non-normalized changed and ownership paths", () => {
    expect(
      validateChangedPathOwnership(
        ["tooling/../secrets.txt", "tooling/check.ts"],
        ["tooling/../tooling"],
      ),
    ).toEqual([
      'changed path must be normalized and repository-relative: "tooling/../secrets.txt"',
      "changed path tooling/check.ts is outside running-node ownership",
      'ownership path must be normalized and repository-relative: "tooling/../tooling"',
    ]);
  });

  it("accepts standing slice ownership for shared control files and its own plan", () => {
    expect(
      validateChangedPathOwnership(
        [
          "docs/rebuild/graph.json",
          "tasks/in-progress.md",
          "docs/superpowers/plans/2026-08-31-controlled-rebuild-cr06.md",
          "pnpm-lock.yaml",
        ],
        [],
        "CR06",
      ),
    ).toEqual([]);
  });

  it("keeps standing slice ownership bounded to exact files and its own plan", () => {
    expect(
      validateChangedPathOwnership(
        [
          "docs/superpowers/plans/2026-08-31-controlled-rebuild-cr09.md",
          "pnpm-lock.yaml.backup",
          "packages/sync/src/index.ts",
        ],
        [],
        "CR06",
      ),
    ).toEqual([
      "changed path docs/superpowers/plans/2026-08-31-controlled-rebuild-cr09.md is outside running-node ownership",
      "changed path packages/sync/src/index.ts is outside running-node ownership",
      "changed path pnpm-lock.yaml.backup is outside running-node ownership",
    ]);
  });
});

describe("rebuild graph repository claims", () => {
  it("accepts matching merged PR, commit, evidence, and ancestry facts", () => {
    expect(validateRepositoryClaims(doneGraph(), matchingFacts())).toEqual([]);
  });

  it("rejects a missing or non-merged PR", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({ pullRequests: [] }),
      ),
    ).toContain(`done slice CR00 pull request does not exist: ${PR_URL}`);

    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          pullRequests: [{ url: PR_URL, state: "CLOSED", mergeSha: null }],
        }),
      ),
    ).toContain(
      `done slice CR00 pull request is CLOSED, not MERGED: ${PR_URL}`,
    );
  });

  it("rejects mismatched, missing, and non-ancestor merge SHAs", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          pullRequests: [{ url: PR_URL, state: "MERGED", mergeSha: OTHER_SHA }],
        }),
      ),
    ).toContain(
      `done slice CR00 merge SHA ${MERGE_SHA} does not match pull request merge SHA ${OTHER_SHA}`,
    );

    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          existingCommits: [BASE_SHA, EVIDENCE_SHA],
          ancestorPairs: [{ ancestor: EVIDENCE_SHA, descendant: MERGE_SHA }],
        }),
      ),
    ).toContain(`done slice CR00 merge SHA does not exist: ${MERGE_SHA}`);

    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          ancestorPairs: [{ ancestor: EVIDENCE_SHA, descendant: MERGE_SHA }],
        }),
      ),
    ).toContain(
      `done slice CR00 merge SHA ${MERGE_SHA} is not an ancestor of main`,
    );
  });

  it("accepts original PR evidence after a tree-identical squash merge", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          existingCommits: [BASE_SHA, MERGE_SHA],
          ancestorPairs: [{ ancestor: MERGE_SHA, descendant: "main" }],
        }),
      ),
    ).toEqual([]);
  });

  it("rejects evidence outside the merged pull request commit set", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          sliceSources: [
            {
              url: PR_URL,
              headSha: OTHER_SHA,
              headTreeSha: TREE_SHA,
              mergeTreeSha: TREE_SHA,
              commitShas: [OTHER_SHA],
            },
          ],
        }),
      ),
    ).toContain(
      `node CR00 evidence commit ${EVIDENCE_SHA} is not part of merged pull request ${PR_URL}`,
    );
  });

  it("rejects a merged tree that differs from the pull request head", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          sliceSources: [
            {
              url: PR_URL,
              headSha: OTHER_SHA,
              headTreeSha: TREE_SHA,
              mergeTreeSha: OTHER_TREE_SHA,
              commitShas: [EVIDENCE_SHA, OTHER_SHA],
            },
          ],
        }),
      ),
    ).toContain(
      `done slice CR00 merged tree ${OTHER_TREE_SHA} does not match pull request head tree ${TREE_SHA}`,
    );
  });

  it("rejects an incomplete pull request commit set", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          sliceSources: [
            {
              url: PR_URL,
              headSha: OTHER_SHA,
              headTreeSha: TREE_SHA,
              mergeTreeSha: TREE_SHA,
              commitShas: [EVIDENCE_SHA],
            },
          ],
        }),
      ),
    ).toContain(
      `done slice CR00 pull request head commit is missing from source history: ${OTHER_SHA}`,
    );
  });

  it("validates running-slice base ancestry and changed-path ownership", () => {
    const facts = matchingFacts({
      changedPaths: ["tasks/in-progress.md", "tooling/check.ts"],
      existingCommits: [BASE_SHA, EVIDENCE_SHA],
      ancestorPairs: [
        { ancestor: BASE_SHA, descendant: "HEAD" },
        { ancestor: EVIDENCE_SHA, descendant: "HEAD" },
      ],
      pullRequests: [{ url: PR_URL, state: "OPEN", mergeSha: null }],
    });
    expect(validateRepositoryClaims(runningGraph(), facts)).toEqual([]);

    expect(
      validateRepositoryClaims(
        runningGraph(),
        matchingFacts({
          changedPaths: ["app/outside.ts"],
          existingCommits: [EVIDENCE_SHA],
          ancestorPairs: [{ ancestor: EVIDENCE_SHA, descendant: "HEAD" }],
          pullRequests: [{ url: PR_URL, state: "OPEN", mergeSha: null }],
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "changed path app/outside.ts is outside running-node ownership",
        `running slice CR00 base SHA does not exist: ${BASE_SHA}`,
        `running slice CR00 base SHA ${BASE_SHA} is not an ancestor of HEAD`,
      ]),
    );
  });

  it("requires a running slice's declared PR to exist and remain open", () => {
    const localFacts = matchingFacts({
      existingCommits: [BASE_SHA, EVIDENCE_SHA],
      ancestorPairs: [
        { ancestor: BASE_SHA, descendant: "HEAD" },
        { ancestor: EVIDENCE_SHA, descendant: "HEAD" },
      ],
      pullRequests: [],
    });
    expect(validateRepositoryClaims(runningGraph(), localFacts)).toContain(
      `running slice CR00 pull request does not exist: ${PR_URL}`,
    );
    expect(
      validateRepositoryClaims(runningGraph(), {
        ...localFacts,
        pullRequests: [{ url: PR_URL, state: "CLOSED", mergeSha: null }],
      }),
    ).toContain(
      `running slice CR00 pull request is CLOSED, not OPEN: ${PR_URL}`,
    );
  });

  it("validates terminal lifecycle evidence against HEAD", () => {
    const graph = runningGraph();
    graph.nodes = graph.nodes.map((node) => ({
      ...node,
      status: "abandoned",
      supersededBy: null,
    }));
    expect(
      validateRepositoryClaims(
        graph,
        matchingFacts({
          existingCommits: [EVIDENCE_SHA],
          ancestorPairs: [{ ancestor: EVIDENCE_SHA, descendant: "HEAD" }],
          pullRequests: [],
        }),
      ),
    ).toEqual([]);
    expect(
      validateRepositoryClaims(
        graph,
        matchingFacts({
          existingCommits: [],
          ancestorPairs: [],
          pullRequests: [],
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        `node CR00 evidence commit does not exist: ${EVIDENCE_SHA}`,
        `node CR00 evidence commit ${EVIDENCE_SHA} is not an ancestor of HEAD`,
      ]),
    );
  });
});

describe("rebuild graph reconciliation CLI", () => {
  it("stays green on the default branch while a merged slice's record catches up", async () => {
    const fixture = createMergedRunningSliceFixture();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/pulls/146")) {
          return new Response(
            JSON.stringify({
              head: { sha: fixture.headSha },
              merged: true,
              merge_commit_sha: fixture.mergeSha,
              state: "closed",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/pulls/146/commits")) {
          return new Response(JSON.stringify([{ sha: fixture.headSha }]), {
            status: 200,
          });
        }
        if (url.endsWith(`/git/commits/${fixture.headSha}`)) {
          return new Response(
            JSON.stringify({ tree: { sha: fixture.headTreeSha } }),
            { status: 200 },
          );
        }
        if (url.endsWith(`/git/commits/${fixture.mergeSha}`)) {
          return new Response(
            JSON.stringify({ tree: { sha: fixture.mergeTreeSha } }),
            { status: 200 },
          );
        }
        return new Response("not found", { status: 404 });
      });
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        [fixture.graphPath],
        fixture.directory,
        { GITHUB_TOKEN: "test-token" },
      );

      expect(error).not.toHaveBeenCalled();
      expect(exitCode).toBe(0);
      expect(log.mock.calls.flat().join("\n")).toContain(
        "Running-slice checks were skipped for CR00: the pull request has already merged",
      );
    } finally {
      fetchSpy.mockRestore();
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("requires a durable source tag instead of a retained branch", async () => {
    const fixture = createSquashFixture();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );

      expect(exitCode).toBe(1);
      expect(error.mock.calls.flat().join("\n")).toContain(
        "done slice CR00 source tag refs/tags/rebuild/cr00-source is unavailable; fetch tags or run live reconciliation",
      );
    } finally {
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("reconstructs squash provenance from the durable source tag after branch deletion", async () => {
    const fixture = createSquashFixture();
    git(fixture.directory, [
      "tag",
      "rebuild/cr00-source",
      "codex/rebuild-test-v1",
    ]);
    git(fixture.directory, ["branch", "-D", "codex/rebuild-test-v1"]);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );

      expect(exitCode).toBe(0);
      expect(error).not.toHaveBeenCalled();
      expect(log.mock.calls.flat().join("\n")).toContain(
        "Rebuild graph repository facts are valid",
      );
    } finally {
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("does not diagnose a stale local source branch as merge tampering", async () => {
    const fixture = createSquashFixture();
    git(fixture.directory, [
      "branch",
      "-f",
      "codex/rebuild-test-v1",
      fixture.baseSha,
    ]);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );
      const stderr = error.mock.calls.flat().join("\n");

      expect(exitCode).toBe(1);
      expect(stderr).toContain(
        "done slice CR00 source tag refs/tags/rebuild/cr00-source is unavailable; fetch tags or run live reconciliation",
      );
      expect(stderr).not.toContain("does not match pull request head tree");
    } finally {
      error.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("prefers the remote default branch over a stale local branch", async () => {
    const fixture = createSquashFixture();
    git(fixture.directory, [
      "tag",
      "rebuild/cr00-source",
      "codex/rebuild-test-v1",
    ]);
    git(fixture.directory, ["switch", "-c", "codex/recovery-test-v1"]);
    git(fixture.directory, ["branch", "-f", "main", fixture.baseSha]);
    git(fixture.directory, [
      "update-ref",
      "refs/remotes/origin/main",
      fixture.mergeSha,
    ]);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );

      expect(exitCode).toBe(0);
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("reconstructs squash provenance from the merged pull request", async () => {
    const fixture = createSquashFixture();
    git(fixture.directory, [
      "tag",
      "rebuild/cr00-source",
      "codex/rebuild-test-v1",
    ]);
    git(fixture.directory, ["branch", "-D", "codex/rebuild-test-v1"]);
    const fetchMock = mockMergedPullRequest(fixture);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        [fixture.graphPath],
        fixture.directory,
        { GITHUB_TOKEN: "test-token" },
      );

      expect(exitCode).toBe(0);
      expect(error).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      error.mockRestore();
      fetchMock.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("rejects a source tag that does not point to the canonical pull request head", async () => {
    const fixture = createSquashFixture();
    git(fixture.directory, ["tag", "rebuild/cr00-source", fixture.baseSha]);
    git(fixture.directory, ["branch", "-D", "codex/rebuild-test-v1"]);
    const fetchMock = mockMergedPullRequest(fixture);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        [fixture.graphPath],
        fixture.directory,
        { GITHUB_TOKEN: "test-token" },
      );

      expect(exitCode).toBe(1);
      expect(error.mock.calls.flat().join("\n")).toContain(
        `done slice CR00 source tag refs/tags/rebuild/cr00-source points to ${fixture.baseSha}, not pull request head ${fixture.evidenceSha}`,
      );
    } finally {
      error.mockRestore();
      fetchMock.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("reports live pull-request claims as unverified when credentials are missing", async () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), "rebuild-reconcile-"));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      const graph = runningGraph();
      const graphPath = join(fixtureDirectory, "graph.json");
      writeFileSync(graphPath, JSON.stringify(graph), "utf8");

      const exitCode = await runRebuildGraphReconcileCli(
        [graphPath],
        process.cwd(),
        { GH_TOKEN: "", GITHUB_TOKEN: "" },
      );
      const stderr = error.mock.calls.flat().join("\n");

      expect(exitCode).toBe(1);
      expect(stderr).toContain(
        "Live pull-request claims are unverified: GITHUB_TOKEN or GH_TOKEN is required for live reconciliation",
      );
      expect(stderr).not.toContain("pull request does not exist");
    } finally {
      error.mockRestore();
      rmSync(fixtureDirectory, { force: true, recursive: true });
    }
  });

  it("leaves an unrelated branch alone when it inherits the running node from the default branch", async () => {
    const fixture = createInheritedGraphFixture();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );
      const stderr = error.mock.calls.flat().join("\n");

      expect(stderr).not.toContain("is outside running-node ownership");
      expect(log.mock.calls.flat().join("\n")).toContain(
        "inherited unchanged from the default branch",
      );
      expect(exitCode).toBe(0);
    } finally {
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });

  it("does not diagnose a sibling PR's already-merged changes as a running slice ownership violation", async () => {
    const fixture = createRunningSliceMergeFixture();
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const exitCode = await runRebuildGraphReconcileCli(
        ["--offline", fixture.graphPath],
        fixture.directory,
        {},
      );

      expect(error.mock.calls.flat().join("\n")).not.toContain(
        "is outside running-node ownership",
      );
      expect(exitCode).toBe(0);
    } finally {
      error.mockRestore();
      log.mockRestore();
      rmSync(fixture.directory, { force: true, recursive: true });
    }
  });
});
