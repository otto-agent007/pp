import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
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
      changedPaths: ["tooling/check.ts"],
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
  it("reconstructs squash provenance from the local source branch", async () => {
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

  it("prefers the remote default branch over a stale local branch", async () => {
    const fixture = createSquashFixture();
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
    git(fixture.directory, ["branch", "-D", "codex/rebuild-test-v1"]);
    const graph = JSON.parse(
      readFileSync(fixture.graphPath, "utf8"),
    ) as ReturnType<typeof doneGraph>;
    graph.nodes = graph.nodes.map((node) => ({
      ...node,
      evidence: node.evidence.map((evidence) => ({
        ...evidence,
        commitSha: EVIDENCE_SHA,
      })),
    }));
    writeFileSync(fixture.graphPath, JSON.stringify(graph), "utf8");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/pulls/146")) {
          return new Response(
            JSON.stringify({
              head: { sha: EVIDENCE_SHA },
              merged: true,
              merge_commit_sha: fixture.mergeSha,
              state: "closed",
            }),
            { status: 200 },
          );
        }
        if (url.includes("/pulls/146/commits")) {
          return new Response(JSON.stringify([{ sha: EVIDENCE_SHA }]), {
            status: 200,
          });
        }
        if (url.endsWith(`/git/commits/${EVIDENCE_SHA}`)) {
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
});
