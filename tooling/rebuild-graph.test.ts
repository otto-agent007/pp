import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runRebuildGraphCli, validateRebuildGraph } from "./rebuild-graph";

const temporaryDirectories: string[] = [];

const preferredPrOrder = ["CR00", "CR13", "CR14", "CR15", "CR16"];
const targetMatrix = {
  node: "Node 24 LTS",
  pnpm: "latest stable pnpm 11 patch",
  next: "Next.js 16 stable",
  prereleases: "forbidden",
  expo: {
    policy:
      "SDK 54, SDK 55, SDK 56, and SDK 57 are separate one-SDK migration slices",
    slices: [
      { id: "CR13", sdk: 54 },
      { id: "CR14", sdk: 55 },
      { id: "CR15", sdk: 56 },
      { id: "CR16", sdk: 57 },
    ],
  },
};

const targetMatrixSliceNodes = targetMatrix.expo.slices.map(({ id }) => ({
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
}));

function graphWith(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    preferredPrOrder,
    targetMatrix,
    nodes: [
      {
        id: "CR00",
        kind: "slice",
        status: "running",
        parent: null,
        dependencies: [],
        conflicts: [],
        ownership: [],
        deliverables: ["control plane"],
        checks: ["vitest"],
        approvals: [],
        evidence: [],
        branch: "codex/rebuild-cr00-control-plane-v1",
        pr: "",
        mergeSha: "",
      },
      ...targetMatrixSliceNodes.map((node) => ({ ...node })),
    ],
    ...overrides,
  };
}

function nodeWith(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
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
  it("accepts a graph whose declared control-plane invariants are satisfied", () => {
    expect(validateRebuildGraph(graphWith())).toEqual([]);
  });

  it("rejects an unsupported schema version", () => {
    expect(errorsFor(graphWith({ schemaVersion: 2 }))).toContain(
      "schemaVersion must be 1",
    );
  });

  it("rejects a node missing a required control-plane field", () => {
    const node = nodeWith();
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

  it("requires a unique, exhaustive numeric CR preferred PR order", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            graphWith().nodes[0],
            nodeWith({ id: "CR01", parent: "CR00" }),
          ],
          preferredPrOrder: ["CR01", "CR00"],
        }),
      ),
    ).toContain("preferredPrOrder must be in numeric CR order");
    expect(
      errorsFor(graphWith({ preferredPrOrder: ["CR00", "CR00"] })),
    ).toContain("preferredPrOrder must contain each node exactly once");
    expect(errorsFor(graphWith({ preferredPrOrder: ["CR01"] }))).toContain(
      "preferredPrOrder must contain each node exactly once",
    );
  });

  it("requires the frozen target matrix strings, prerelease policy, and Expo mapping", () => {
    expect(
      errorsFor(
        graphWith({
          targetMatrix: {
            ...targetMatrix,
            node: 24,
            prereleases: "allowed",
            expo: {
              ...targetMatrix.expo,
              slices: [{ id: "CR13", sdk: 55 }],
            },
          },
        }),
      ),
    ).toContain("targetMatrix.node must be a non-empty string");
    expect(
      errorsFor(
        graphWith({
          targetMatrix: {
            ...targetMatrix,
            node: 24,
            prereleases: "allowed",
            expo: {
              ...targetMatrix.expo,
              slices: [{ id: "CR13", sdk: 55 }],
            },
          },
        }),
      ),
    ).toContain("targetMatrix.prereleases must be forbidden");
    expect(
      errorsFor(
        graphWith({
          targetMatrix: {
            ...targetMatrix,
            node: 24,
            prereleases: "allowed",
            expo: {
              ...targetMatrix.expo,
              slices: [{ id: "CR13", sdk: 55 }],
            },
          },
        }),
      ),
    ).toContain(
      "targetMatrix.expo.slices must map CR13=54, CR14=55, CR15=56, and CR16=57",
    );
  });

  it("requires the frozen target matrix policy values exactly", () => {
    expect(
      errorsFor(
        graphWith({ targetMatrix: { ...targetMatrix, node: "Node 25 LTS" } }),
      ),
    ).toContain("targetMatrix.node must equal Node 24 LTS");
    expect(
      errorsFor(
        graphWith({
          targetMatrix: { ...targetMatrix, pnpm: "pnpm 11" },
        }),
      ),
    ).toContain("targetMatrix.pnpm must equal latest stable pnpm 11 patch");
    expect(
      errorsFor(
        graphWith({
          targetMatrix: { ...targetMatrix, next: "Next.js 17 stable" },
        }),
      ),
    ).toContain("targetMatrix.next must equal Next.js 16 stable");
    expect(
      errorsFor(
        graphWith({
          targetMatrix: {
            ...targetMatrix,
            expo: { ...targetMatrix.expo, policy: "one migration" },
          },
        }),
      ),
    ).toContain(
      "targetMatrix.expo.policy must equal SDK 54, SDK 55, SDK 56, and SDK 57 are separate one-SDK migration slices",
    );
  });

  it("collects sorted top-level errors even when nodes is empty", () => {
    expect(
      validateRebuildGraph({
        schemaVersion: 2,
        preferredPrOrder: {},
        targetMatrix: null,
        nodes: [],
      }),
    ).toEqual([
      "nodes must be a non-empty array",
      "preferredPrOrder must be an array of CR node IDs",
      "schemaVersion must be 1",
      "targetMatrix must be an object",
    ]);
  });

  it("requires each Expo target mapping to name an existing slice node", () => {
    const graph = graphWith();
    expect(
      errorsFor({
        ...graph,
        nodes: graph.nodes.filter((node) => node.id !== "CR13"),
        preferredPrOrder: ["CR00", "CR14", "CR15", "CR16"],
      }),
    ).toContain("targetMatrix.expo.slices references missing slice node CR13");
    expect(
      errorsFor({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === "CR13" ? { ...node, kind: "task" } : node,
        ),
      }),
    ).toContain("targetMatrix.expo.slices node CR13 must have kind slice");
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

  it("requires non-empty evidence for done nodes", () => {
    expect(
      errorsFor(graphWith({ nodes: [nodeWith({ status: "done" })] })),
    ).toContain("done node CR01 must include non-empty evidence");
  });

  it("requires canonical GitHub PR metadata and a full merge SHA for done slices", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: ["test output"],
              kind: "slice",
              mergeSha: "0123456",
              parent: null,
              pr: "http://github.com/otto-agent007/pp/pull/145",
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain(
      "done slice CR01 must include the canonical GitHub pull request URL",
    );
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: ["test output"],
              kind: "slice",
              mergeSha: "0123456",
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
          nodeWith({
            evidence: ["test output"],
            kind: "slice",
            mergeSha: "0123456789abcdef0123456789abcdef01234567",
            parent: null,
            pr: "https://github.com/otto-agent007/pp/pull/145",
            status: "done",
          }),
        ],
        preferredPrOrder: ["CR00", "CR01", "CR13", "CR14", "CR15", "CR16"],
      }),
    ).toEqual([]);
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
