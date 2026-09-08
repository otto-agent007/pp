import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runRebuildGraphCli, validateRebuildGraph } from "./rebuild-graph";

const temporaryDirectories: string[] = [];

const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";
const preferredPrOrder = ["CR00", "CR13", "CR14", "CR15", "CR16"];
const repository = {
  slug: "otto-agent007/pp",
  defaultBranch: "main",
};
const targetPolicy = {
  prereleases: "forbidden",
  refreshAt: "slice-start",
};

const targetSliceNodes = [
  { constraint: "54", id: "CR13" },
  { constraint: "55", id: "CR14" },
  { constraint: "56", id: "CR15" },
  { constraint: "57", id: "CR16" },
].map(({ constraint, id }) => ({
  baseSha: "",
  id,
  kind: "slice",
  status: "planned",
  parent: "CR00",
  dependencies: [],
  conflicts: [],
  ownership: [],
  deliverables: ["target migration"],
  checks: ["vitest"],
  approvals: [],
  evidence: [],
  branch: "",
  pr: "",
  mergeSha: "",
  supersededBy: null,
  target: {
    product: "expo",
    constraint,
    selection: "exact-sdk-major",
    resolvedVersion: "",
  },
}));

function graphWith(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    preferredPrOrder,
    repository,
    targetPolicy,
    nodes: [
      {
        baseSha: FULL_SHA,
        id: "CR00",
        kind: "slice",
        status: "running",
        parent: null,
        dependencies: [],
        conflicts: [],
        ownership: ["tooling"],
        deliverables: ["control plane"],
        checks: ["vitest"],
        approvals: [],
        evidence: [],
        branch: "codex/rebuild-cr00-control-plane-v1",
        pr: "",
        mergeSha: "",
        supersededBy: null,
        target: null,
      },
      ...targetSliceNodes.map((node) => ({ ...node })),
    ],
    ...overrides,
  };
}

function nodeWith(overrides: Record<string, unknown> = {}) {
  return {
    baseSha: "",
    id: "CR01",
    kind: "task",
    status: "planned",
    parent: "CR00",
    dependencies: [],
    conflicts: [],
    ownership: [],
    deliverables: ["next slice"],
    checks: ["vitest"],
    approvals: [],
    evidence: [],
    branch: "",
    pr: "",
    mergeSha: "",
    supersededBy: null,
    target: null,
    ...overrides,
  };
}

function doneSliceWith(overrides: Record<string, unknown> = {}) {
  return nodeWith({
    baseSha: FULL_SHA,
    branch: "codex/rebuild-test-v1",
    checks: ["pnpm test"],
    evidence: [commandEvidence()],
    kind: "slice",
    mergeSha: FULL_SHA,
    ownership: ["tooling"],
    parent: null,
    pr: "https://github.com/otto-agent007/pp/pull/7",
    status: "done",
    ...overrides,
  });
}

function commandEvidence(overrides: Record<string, unknown> = {}) {
  return {
    kind: "command",
    summary: "focused tests passed",
    command: "pnpm test",
    exitCode: 0,
    commitSha: FULL_SHA,
    recordedAt: "2026-08-24T20:00:00Z",
    ...overrides,
  };
}

function claimEvidence(overrides: Record<string, unknown> = {}) {
  return {
    kind: "review",
    summary: "controller reviewed the transition",
    commitSha: FULL_SHA,
    recordedAt: "2026-08-24T20:00:00Z",
    ...overrides,
  };
}

function executionReadyNode(overrides: Record<string, unknown> = {}) {
  return nodeWith({
    baseSha: FULL_SHA,
    checks: ["pnpm test"],
    ownership: ["tooling"],
    status: "ready",
    ...overrides,
  });
}

function doneNodeWith(overrides: Record<string, unknown> = {}) {
  return executionReadyNode({
    evidence: [commandEvidence()],
    status: "done",
    ...overrides,
  });
}

function errorsFor(value: unknown) {
  return validateRebuildGraph(value).join("\n");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
  vi.restoreAllMocks();
});

describe("controlled rebuild graph validator", () => {
  it("accepts the checked-in rebuild graph", () => {
    const graph = JSON.parse(
      readFileSync(resolve(process.cwd(), "docs/rebuild/graph.json"), "utf8"),
    );
    expect(validateRebuildGraph(graph)).toEqual([]);
  });

  it("accepts a graph whose declared control-plane invariants are satisfied", () => {
    expect(validateRebuildGraph(graphWith())).toEqual([]);
  });

  it("rejects an unsupported schema version", () => {
    expect(errorsFor(graphWith({ schemaVersion: 2 }))).toContain(
      "schemaVersion must be 1",
    );
  });

  it("rejects a node missing a required control-plane field", () => {
    const node: Partial<ReturnType<typeof nodeWith>> = nodeWith();
    delete node.approvals;

    expect(errorsFor(graphWith({ nodes: [node] }))).toContain(
      "node CR01 must include approvals",
    );
  });

  it("rejects duplicate node IDs", () => {
    expect(
      errorsFor(graphWith({ nodes: [nodeWith({ id: "CR01" }), nodeWith()] })),
    ).toContain("node ID CR01 is duplicated");
  });

  it("requires a unique, exhaustive preferred PR order", () => {
    expect(
      validateRebuildGraph(
        graphWith({
          nodes: [
            graphWith().nodes[0],
            nodeWith({ id: "CR01", parent: "CR00" }),
          ],
          preferredPrOrder: ["CR01", "CR00"],
        }),
      ),
    ).not.toContain("preferredPrOrder must be in numeric CR order");
    expect(
      errorsFor(graphWith({ preferredPrOrder: ["CR00", "CR00"] })),
    ).toContain("preferredPrOrder must contain each node exactly once");
    expect(errorsFor(graphWith({ preferredPrOrder: ["CR01"] }))).toContain(
      "preferredPrOrder must contain each node exactly once",
    );
  });

  it("requires repository identity and the target policy", () => {
    expect(
      errorsFor(
        graphWith({
          repository: { slug: "not-a-slug", defaultBranch: "" },
          targetPolicy: { prereleases: "allowed", refreshAt: "whenever" },
        }),
      ),
    ).toContain("repository.slug must be an owner/name GitHub slug");
    expect(
      errorsFor(
        graphWith({
          repository: { slug: "not-a-slug", defaultBranch: "" },
          targetPolicy: { prereleases: "allowed", refreshAt: "whenever" },
        }),
      ),
    ).toContain("repository.defaultBranch must be a non-empty branch name");
    expect(
      errorsFor(
        graphWith({
          repository: { slug: "not-a-slug", defaultBranch: "" },
          targetPolicy: { prereleases: "allowed", refreshAt: "whenever" },
        }),
      ),
    ).toContain("targetPolicy.prereleases must be forbidden");
    expect(
      errorsFor(
        graphWith({
          repository: { slug: "not-a-slug", defaultBranch: "" },
          targetPolicy: { prereleases: "allowed", refreshAt: "whenever" },
        }),
      ),
    ).toContain("targetPolicy.refreshAt must be slice-start");
  });

  it("collects sorted top-level errors even when nodes is empty", () => {
    expect(
      validateRebuildGraph({
        repository: null,
        schemaVersion: 2,
        preferredPrOrder: {},
        targetPolicy: null,
        nodes: [],
      }),
    ).toEqual([
      "nodes must be a non-empty array",
      "preferredPrOrder must be an array of CR node IDs",
      "repository must be an object",
      "schemaVersion must be 1",
      "targetPolicy must be an object",
    ]);
  });

  it("derives canonical PR URLs from graph repository data", () => {
    expect(
      errorsFor({
        ...graphWith(),
        repository: { slug: "example/fork", defaultBranch: "trunk" },
        nodes: [
          doneSliceWith({
            pr: "https://github.com/otto-agent007/pp/pull/7",
          }),
        ],
        preferredPrOrder: ["CR01"],
      }),
    ).toContain(
      "done slice CR01 must include a pull request URL for example/fork",
    );
  });

  it("accepts node-local targets without hardcoded slice IDs or versions", () => {
    expect(
      validateRebuildGraph(
        graphWith({
          nodes: [
            nodeWith({
              id: "MOBILE-A",
              kind: "slice",
              parent: null,
              target: {
                product: "expo",
                constraint: "58",
                selection: "exact-sdk-major",
                resolvedVersion: "",
              },
            }),
          ],
          preferredPrOrder: ["MOBILE-A"],
        }),
      ),
    ).toEqual([]);
  });

  it("rejects unsupported node kinds and statuses", () => {
    expect(
      errorsFor(
        graphWith({ nodes: [nodeWith({ kind: "phase", status: "queued" })] }),
      ),
    ).toContain("node CR01 has unsupported kind phase");
    expect(
      errorsFor(
        graphWith({ nodes: [nodeWith({ kind: "phase", status: "queued" })] }),
      ),
    ).toContain("node CR01 has unsupported status queued");
  });

  it("rejects parent, dependency, and conflict references to missing nodes", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR97"],
              dependencies: ["CR98"],
              parent: "CR99",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 references missing parent CR99");
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR97"],
              dependencies: ["CR98"],
              parent: "CR99",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 references missing dependency CR98");
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR97"],
              dependencies: ["CR98"],
              parent: "CR99",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 references missing conflict CR97");
  });

  it("rejects self-referential parent, dependency, and conflict edges", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR01"],
              dependencies: ["CR01"],
              parent: "CR01",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 cannot parent itself");
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR01"],
              dependencies: ["CR01"],
              parent: "CR01",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 cannot depend on itself");
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              conflicts: ["CR01"],
              dependencies: ["CR01"],
              parent: "CR01",
            }),
          ],
        }),
      ),
    ).toContain("node CR01 cannot conflict with itself");
  });

  it("rejects dependency cycles", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({ dependencies: ["CR02"] }),
            nodeWith({ dependencies: ["CR01"], id: "CR02" }),
          ],
        }),
      ),
    ).toContain("dependency graph contains a cycle: CR01 -> CR02 -> CR01");
  });

  it("rejects parent cycles", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({ id: "CR01", parent: "CR02" }),
            nodeWith({ id: "CR02", parent: "CR01" }),
          ],
          preferredPrOrder: ["CR01", "CR02"],
        }),
      ),
    ).toContain("parent graph contains a cycle: CR01 -> CR02 -> CR01");
  });

  it("rejects a preferred PR order that places a node before its dependency", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({ id: "CR01", dependencies: ["CR02"] }),
            nodeWith({ id: "CR02" }),
          ],
          preferredPrOrder: ["CR01", "CR02"],
        }),
      ),
    ).toContain("preferredPrOrder places CR01 before dependency CR02");
  });

  it("allows no more than one running slice", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            graphWith().nodes[0],
            nodeWith({ id: "CR01", kind: "slice", status: "running" }),
          ],
        }),
      ),
    ).toContain("only one slice may be running; found CR00, CR01");
  });

  it("rejects a deduplicated active conflict between running nodes", () => {
    const activeConflictErrors = validateRebuildGraph(
      graphWith({
        nodes: [
          nodeWith({
            conflicts: ["CR02"],
            id: "CR01",
            parent: null,
            status: "running",
          }),
          nodeWith({
            conflicts: ["CR01"],
            id: "CR02",
            parent: null,
            status: "running",
          }),
        ],
      }),
    ).filter((error) => error.includes("active conflict"));

    expect(activeConflictErrors).toEqual([
      "running nodes CR01 and CR02 have an active conflict",
    ]);
  });

  it("rejects unsafe ownership and overlapping running write paths", () => {
    const unsafeOwnershipErrors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            id: "CR01",
            parent: null,
            ownership: [
              "",
              "/tmp/graph.ts",
              "C:\\\\graph.ts",
              "C:graph.ts",
              "../graph.ts",
              "tooling/../graph.ts",
            ],
            status: "running",
          }),
          nodeWith({
            id: "CR02",
            parent: null,
            ownership: ["tooling", "tooling/rebuild-graph.ts"],
            status: "running",
          }),
        ],
      }),
    );
    for (const path of [
      "",
      "/tmp/graph.ts",
      "C:\\\\graph.ts",
      "C:graph.ts",
      "../graph.ts",
      "tooling/../graph.ts",
    ]) {
      expect(unsafeOwnershipErrors).toContain(
        `node CR01 ownership path must be a normalized repository-relative path: ${JSON.stringify(path)}`,
      );
    }
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              id: "CR01",
              parent: null,
              ownership: ["tooling"],
              status: "running",
            }),
            nodeWith({
              id: "CR02",
              parent: null,
              ownership: ["tooling/rebuild-graph.ts"],
              status: "running",
            }),
          ],
        }),
      ),
    ).toContain(
      "running write tasks CR01 and CR02 overlap on ownership tooling and tooling/rebuild-graph.ts",
    );
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              id: "CR01",
              parent: null,
              ownership: ["tooling/rebuild-graph.ts"],
              status: "running",
            }),
            nodeWith({
              id: "CR02",
              parent: null,
              ownership: ["tooling/rebuild-graph.ts"],
              status: "running",
            }),
          ],
        }),
      ),
    ).toContain(
      "running write tasks CR01 and CR02 overlap on ownership tooling/rebuild-graph.ts",
    );
  });

  it("allows ready and running nodes only when every dependency is done", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              id: "CR00",
              kind: "slice",
              parent: null,
              status: "running",
            }),
            nodeWith({ dependencies: ["CR00"], status: "ready" }),
          ],
        }),
      ),
    ).toContain(
      "ready node CR01 depends on CR00 with status running, not done",
    );
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              id: "CR00",
              kind: "slice",
              parent: null,
              status: "running",
            }),
            nodeWith({ dependencies: ["CR00"], status: "running" }),
          ],
        }),
      ),
    ).toContain(
      "running node CR01 depends on CR00 with status running, not done",
    );
  });

  it("rejects a done node whose dependency is not done", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({ id: "CR00", kind: "slice", parent: null }),
            nodeWith({
              dependencies: ["CR00"],
              evidence: ["verified"],
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain("done node CR01 depends on CR00 with status planned, not done");
  });

  it("requires non-empty evidence for done nodes", () => {
    expect(
      errorsFor(graphWith({ nodes: [nodeWith({ status: "done" })] })),
    ).toContain("done node CR01 must include successful command evidence");
  });

  it("rejects free-form evidence on done nodes", () => {
    expect(
      errorsFor(graphWith({ nodes: [doneNodeWith({ evidence: ["x"] })] })),
    ).toContain(
      "node CR01 evidence entry 0 must be a structured evidence record",
    );
  });

  it("requires execution-ready fields before promotion", () => {
    const errors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            baseSha: "",
            checks: [],
            ownership: [],
            status: "ready",
          }),
        ],
      }),
    );

    expect(errors).toContain("ready node CR01 must include ownership");
    expect(errors).toContain("ready node CR01 must include checks");
    expect(errors).toContain("ready node CR01 must include a full base SHA");
  });

  it("rejects malformed structured evidence fields", () => {
    const errors = errorsFor(
      graphWith({
        nodes: [
          doneNodeWith({
            evidence: [
              {
                kind: "command",
                summary: "",
                command: "",
                exitCode: 0.5,
                commitSha: "bad",
                recordedAt: "yesterday",
                url: "http://example.test/evidence",
              },
            ],
          }),
        ],
      }),
    );

    expect(errors).toContain(
      "node CR01 evidence entry 0 summary must be non-empty",
    );
    expect(errors).toContain(
      "node CR01 evidence entry 0 command must be non-empty",
    );
    expect(errors).toContain(
      "node CR01 evidence entry 0 exitCode must be an integer",
    );
    expect(errors).toContain(
      "node CR01 evidence entry 0 commitSha must be a full commit SHA",
    );
    expect(errors).toContain(
      "node CR01 evidence entry 0 recordedAt must be a UTC timestamp",
    );
    expect(errors).toContain(
      "node CR01 evidence entry 0 url must be an HTTPS URL",
    );
  });

  it("rejects unsupported structured evidence kinds", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            doneNodeWith({
              evidence: [claimEvidence({ kind: "note" })],
            }),
          ],
        }),
      ),
    ).toContain("node CR01 evidence entry 0 has unsupported kind");
  });

  it("requires successful command evidence for done nodes", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [doneNodeWith({ evidence: [claimEvidence()] })],
        }),
      ),
    ).toContain("done node CR01 must include successful command evidence");
  });

  it("requires deliverables before promotion", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [executionReadyNode({ deliverables: [] })],
        }),
      ),
    ).toContain("ready node CR01 must include deliverables");
  });

  it("requires correctly named branches for running slices", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            executionReadyNode({
              branch: "feature/rebuild",
              kind: "slice",
              parent: null,
              status: "running",
            }),
          ],
        }),
      ),
    ).toContain(
      "running slice CR01 must include a correctly named codex branch",
    );
  });

  it("requires stable target resolution and approval before promotion", () => {
    const unresolved = errorsFor(
      graphWith({
        nodes: [
          executionReadyNode({
            target: {
              product: "expo",
              constraint: "54",
              selection: "exact-sdk-major",
              resolvedVersion: "",
            },
          }),
        ],
      }),
    );
    expect(unresolved).toContain(
      "ready node CR01 target must include a resolved stable version",
    );

    const unapproved = errorsFor(
      graphWith({
        nodes: [
          executionReadyNode({
            target: {
              product: "expo",
              constraint: "54",
              selection: "exact-sdk-major",
              resolvedVersion: "54.0.0",
            },
          }),
        ],
      }),
    );
    expect(unapproved).toContain(
      "ready node CR01 target must include approval evidence",
    );

    const prerelease = errorsFor(
      graphWith({
        nodes: [
          executionReadyNode({
            evidence: [claimEvidence({ kind: "approval" })],
            target: {
              product: "expo",
              constraint: "54",
              selection: "exact-sdk-major",
              resolvedVersion: "54.0.0-beta.1",
            },
          }),
        ],
      }),
    );
    expect(prerelease).toContain(
      "ready node CR01 target resolvedVersion must not be a prerelease",
    );
  });

  it("rejects empty target identifiers", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              target: {
                product: "",
                constraint: "",
                selection: "exact-sdk-major",
                resolvedVersion: "",
              },
            }),
          ],
        }),
      ),
    ).toContain("node CR01 target.product must be non-empty");
  });

  it("does not let abandoned dependencies satisfy promotion", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: [claimEvidence()],
              id: "CR00",
              kind: "slice",
              parent: null,
              status: "abandoned",
            }),
            executionReadyNode({ dependencies: ["CR00"] }),
          ],
          preferredPrOrder: ["CR00", "CR01"],
        }),
      ),
    ).toContain("ready node CR01 depends on abandoned node CR00");
  });

  it("requires acyclic superseded replacement chains ending in done", () => {
    const unresolved = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            evidence: [claimEvidence()],
            id: "CR00",
            parent: null,
            status: "superseded",
            supersededBy: "CR02",
          }),
          executionReadyNode({ dependencies: ["CR00"] }),
          nodeWith({ id: "CR02", status: "planned" }),
        ],
        preferredPrOrder: ["CR00", "CR02", "CR01"],
      }),
    );
    expect(unresolved).toContain(
      "ready node CR01 resolves superseded dependency CR00 to CR02 with status planned, not done",
    );

    const cycle = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            evidence: [claimEvidence()],
            id: "CR01",
            parent: null,
            status: "superseded",
            supersededBy: "CR02",
          }),
          nodeWith({
            evidence: [claimEvidence()],
            id: "CR02",
            parent: null,
            status: "superseded",
            supersededBy: "CR01",
          }),
        ],
        preferredPrOrder: ["CR01", "CR02"],
      }),
    );
    expect(cycle).toContain(
      "replacement graph contains a cycle: CR01 -> CR02 -> CR01",
    );
  });

  it("accepts promotion through a done superseding replacement", () => {
    expect(
      validateRebuildGraph(
        graphWith({
          nodes: [
            nodeWith({
              evidence: [claimEvidence()],
              id: "CR00",
              parent: null,
              status: "superseded",
              supersededBy: "CR02",
            }),
            executionReadyNode({ dependencies: ["CR00"] }),
            doneNodeWith({ id: "CR02" }),
          ],
          preferredPrOrder: ["CR00", "CR02", "CR01"],
        }),
      ),
    ).toEqual([]);
  });

  it("detects dependency cycles after superseded nodes are resolved", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: [claimEvidence()],
              id: "CR00",
              parent: null,
              status: "superseded",
              supersededBy: "CR02",
            }),
            nodeWith({ dependencies: ["CR00"], id: "CR01" }),
            doneNodeWith({ dependencies: ["CR01"], id: "CR02" }),
          ],
          preferredPrOrder: ["CR00", "CR01", "CR02"],
        }),
      ),
    ).toContain(
      "resolved dependency graph contains a cycle: CR01 -> CR02 -> CR01",
    );
  });

  it("orders dependencies against their resolved replacements", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: [claimEvidence()],
              id: "CR00",
              parent: null,
              status: "superseded",
              supersededBy: "CR02",
            }),
            nodeWith({ dependencies: ["CR00"], id: "CR01" }),
            doneNodeWith({ id: "CR02" }),
          ],
          preferredPrOrder: ["CR00", "CR01", "CR02"],
        }),
      ),
    ).toContain("preferredPrOrder places CR01 before dependency CR02");
  });

  it("requires evidence and a valid replacement for terminal lifecycle states", () => {
    const errors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({ id: "CR01", parent: null, status: "abandoned" }),
          nodeWith({
            evidence: [claimEvidence()],
            id: "CR02",
            parent: null,
            status: "superseded",
            supersededBy: null,
          }),
        ],
        preferredPrOrder: ["CR01", "CR02"],
      }),
    );
    expect(errors).toContain("abandoned node CR01 must include evidence");
    expect(errors).toContain("superseded node CR02 must name a replacement");
  });

  it("requires canonical GitHub PR metadata and a full merge SHA for done slices", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              baseSha: FULL_SHA,
              branch: "codex/rebuild-test-v1",
              evidence: [commandEvidence()],
              kind: "slice",
              mergeSha: "0123456",
              ownership: ["tooling"],
              parent: null,
              pr: "http://github.com/otto-agent007/pp/pull/145",
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain(
      "done slice CR01 must include a pull request URL for otto-agent007/pp",
    );
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              baseSha: FULL_SHA,
              branch: "codex/rebuild-test-v1",
              evidence: [commandEvidence()],
              kind: "slice",
              mergeSha: "0123456",
              ownership: ["tooling"],
              parent: null,
              pr: "http://github.com/otto-agent007/pp/pull/145",
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain(
      "done slice CR01 must include a 40-character hexadecimal merge SHA",
    );
    const validDoneSliceGraph = graphWith();
    expect(
      validateRebuildGraph({
        ...validDoneSliceGraph,
        nodes: [
          ...validDoneSliceGraph.nodes,
          doneSliceWith({
            pr: "https://github.com/otto-agent007/pp/pull/145",
          }),
        ],
        preferredPrOrder: ["CR00", "CR01", "CR13", "CR14", "CR15", "CR16"],
      }),
    ).toEqual([]);
  });

  it("requires a node that defers work in prose to record where it went", () => {
    // The failure this catches: CR05 and CR06 each put off wiring
    // mutationOutcome into the queue, in an approval string and nowhere else.
    // No node owned it, no gate asked for it, and each following slice
    // rediscovered it.
    const errors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            id: "CR01",
            parent: null,
            approvals: ["the singleton is wrapped, with removal deferred"],
          }),
        ],
        preferredPrOrder: ["CR01", "CR13", "CR14", "CR15", "CR16"],
      }),
    );

    expect(errors).toContain(
      'node CR01 defers work in prose but records no defers entry: "the singleton is wrapped, with removal deferred"',
    );
  });

  it("accepts prose deferral once the handoff is recorded", () => {
    const base = graphWith();
    expect(
      validateRebuildGraph({
        ...base,
        nodes: [
          ...base.nodes,
          nodeWith({
            id: "CR01",
            approvals: ["the singleton is wrapped, with removal deferred"],
            defers: [{ to: "CR02", summary: "removing the singleton" }],
          }),
          nodeWith({ id: "CR02" }),
        ],
        preferredPrOrder: [
          "CR00",
          "CR01",
          "CR02",
          "CR13",
          "CR14",
          "CR15",
          "CR16",
        ],
      }),
    ).toEqual([]);
  });

  it("rejects a deferral that names no live destination", () => {
    const errors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            id: "CR01",
            parent: null,
            defers: [
              { to: "CR01", summary: "itself" },
              { to: "CR99", summary: "a node that does not exist" },
              { to: "CR02", summary: "an abandoned node" },
              { to: "CR03", summary: "a node superseded into nothing" },
            ],
          }),
          nodeWith({
            id: "CR02",
            parent: null,
            status: "abandoned",
            evidence: ["abandoned"],
          }),
          nodeWith({
            id: "CR03",
            parent: null,
            status: "superseded",
            supersededBy: "CR03",
            evidence: ["superseded"],
          }),
        ],
        preferredPrOrder: [
          "CR01",
          "CR02",
          "CR03",
          "CR13",
          "CR14",
          "CR15",
          "CR16",
        ],
      }),
    );

    expect(errors).toContain("node CR01 cannot defer work to itself");
    expect(errors).toContain("node CR01 defers work to missing node CR99");
    expect(errors).toContain("node CR01 defers work to abandoned node CR02");
    expect(errors).toContain(
      "node CR01 defers work to CR03, which is superseded into nothing",
    );
  });

  it("refuses to hand work to a node that has already finished", () => {
    const finished = {
      nodes: [
        nodeWith({
          id: "CR01",
          parent: null,
          defers: [{ to: "CR02", summary: "work nobody will now pick up" }],
        }),
        doneSliceWith({ id: "CR02", parent: null }),
      ],
      preferredPrOrder: ["CR01", "CR02", "CR13", "CR14", "CR15", "CR16"],
    };

    expect(errorsFor(graphWith(finished))).toContain(
      "node CR01 defers work to CR02, which is already done",
    );

    // A node that is itself done recording where it handed work off is
    // history, not a promise, so it stays legal.
    expect(
      errorsFor(
        graphWith({
          ...finished,
          nodes: [
            doneSliceWith({
              id: "CR01",
              parent: null,
              defers: [{ to: "CR02", summary: "what CR02 went on to do" }],
            }),
            doneSliceWith({ id: "CR02", parent: null }),
          ],
        }),
      ),
    ).not.toContain("defers work to CR02");
  });

  it("rejects malformed deferral records", () => {
    const errors = errorsFor(
      graphWith({
        nodes: [
          nodeWith({ id: "CR01", parent: null, defers: "CR02" }),
          nodeWith({
            id: "CR02",
            parent: null,
            defers: [
              "CR03",
              { to: "   ", summary: "no destination" },
              { to: "CR03", summary: "  " },
            ],
          }),
          nodeWith({ id: "CR03", parent: null }),
        ],
        preferredPrOrder: [
          "CR01",
          "CR02",
          "CR03",
          "CR13",
          "CR14",
          "CR15",
          "CR16",
        ],
      }),
    );

    expect(errors).toContain("node CR01 defers must be an array");
    expect(errors).toContain(
      "node CR02 deferral 0 must be a structured deferral record",
    );
    expect(errors).toContain("node CR02 deferral 1 to must name a node");
    expect(errors).toContain("node CR02 deferral 2 summary must be non-empty");
  });

  it("uses an optional path and prints every validation error from the CLI", () => {
    const directory = mkdtempSync(join(tmpdir(), "pp-rebuild-graph-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "invalid.json");
    writeFileSync(path, JSON.stringify({ schemaVersion: 2, nodes: [] }));

    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(runRebuildGraphCli([path])).toBe(1);
    expect(runRebuildGraphCli(["--", path])).toBe(1);
    expect(error).toHaveBeenCalledWith("schemaVersion must be 1");
    expect(error).toHaveBeenCalledWith("nodes must be a non-empty array");
    expect(error).not.toHaveBeenCalledWith(
      "Usage: rebuild:graph:check [path-to-graph.json]",
    );
  });

  it("fails clearly when the default graph input is missing", () => {
    const directory = mkdtempSync(join(tmpdir(), "pp-rebuild-graph-empty-"));
    temporaryDirectories.push(directory);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(runRebuildGraphCli([], directory)).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        "Unable to read rebuild graph docs/rebuild/graph.json:",
      ),
    );
  });
});
