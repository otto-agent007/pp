import { describe, expect, it } from "vitest";

import {
  validateChangedPathOwnership,
  validateRepositoryClaims,
  type RepositoryFacts,
} from "./rebuild-graph-reconcile";

const BASE_SHA = "1111111111111111111111111111111111111111";
const EVIDENCE_SHA = "2222222222222222222222222222222222222222";
const MERGE_SHA = "3333333333333333333333333333333333333333";
const OTHER_SHA = "4444444444444444444444444444444444444444";
const PR_URL = "https://github.com/otto-agent007/pp/pull/146";

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

  it("rejects missing and non-ancestor evidence commits", () => {
    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({ existingCommits: [BASE_SHA, MERGE_SHA] }),
      ),
    ).toContain(`node CR00 evidence commit does not exist: ${EVIDENCE_SHA}`);

    expect(
      validateRepositoryClaims(
        doneGraph(),
        matchingFacts({
          ancestorPairs: [{ ancestor: MERGE_SHA, descendant: "main" }],
        }),
      ),
    ).toContain(
      `node CR00 evidence commit ${EVIDENCE_SHA} is not an ancestor of ${MERGE_SHA}`,
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
      pullRequests: [],
    });
    expect(validateRepositoryClaims(runningGraph(), facts)).toEqual([]);

    expect(
      validateRepositoryClaims(
        runningGraph(),
        matchingFacts({
          changedPaths: ["app/outside.ts"],
          existingCommits: [EVIDENCE_SHA],
          ancestorPairs: [{ ancestor: EVIDENCE_SHA, descendant: "HEAD" }],
          pullRequests: [],
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
});
