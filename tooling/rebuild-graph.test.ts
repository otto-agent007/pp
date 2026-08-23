import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runRebuildGraphCli, validateRebuildGraph } from "./rebuild-graph";

const temporaryDirectories: string[] = [];

function graphWith(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
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

  it("rejects overlapping ownership between running write tasks", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              id: "CR01",
              ownership: ["tooling/rebuild-graph.ts"],
              status: "running",
            }),
            nodeWith({
              id: "CR02",
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

  it("allows ready nodes only when every dependency is done", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({ id: "CR00", kind: "slice", status: "running" }),
            nodeWith({ dependencies: ["CR00"], status: "ready" }),
          ],
        }),
      ),
    ).toContain(
      "ready node CR01 depends on CR00 with status running, not done",
    );
  });

  it("requires non-empty evidence for done nodes", () => {
    expect(
      errorsFor(graphWith({ nodes: [nodeWith({ status: "done" })] })),
    ).toContain("done node CR01 must include non-empty evidence");
  });

  it("requires a PR URL and merge SHA for done slices", () => {
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: ["test output"],
              kind: "slice",
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain("done slice CR01 must include a PR URL");
    expect(
      errorsFor(
        graphWith({
          nodes: [
            nodeWith({
              evidence: ["test output"],
              kind: "slice",
              status: "done",
            }),
          ],
        }),
      ),
    ).toContain("done slice CR01 must include a merge SHA");
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
