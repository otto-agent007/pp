import { describe, expect, it } from "vitest";

import {
  resolveSourceTagForMergedPullRequest,
  sourceTagRefFor,
} from "./rebuild-source-tag";

const PR = "https://github.com/otto-agent007/pp/pull/181";

function graphWith(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [
      {
        id: "CR15",
        kind: "slice",
        status: "running",
        branch: "codex/rebuild-cr15-expo-57-v1",
        pr: PR,
        ...overrides,
      },
    ],
  };
}

describe("rebuild source tag resolution", () => {
  it("names the tag from the slice ID in lowercase", () => {
    expect(sourceTagRefFor("CR15")).toBe("refs/tags/rebuild/cr15-source");
    expect(sourceTagRefFor("CR00")).toBe("refs/tags/rebuild/cr00-source");
  });

  it("resolves the running slice whose pull request just merged", () => {
    expect(
      resolveSourceTagForMergedPullRequest(graphWith(), {
        url: PR,
        headRef: "codex/rebuild-cr15-expo-57-v1",
      }),
    ).toEqual({ nodeId: "CR15", ref: "refs/tags/rebuild/cr15-source" });
  });

  it("ignores a pull request that no node claims", () => {
    expect(
      resolveSourceTagForMergedPullRequest(graphWith(), {
        url: "https://github.com/otto-agent007/pp/pull/999",
        headRef: "codex/unrelated-v1",
      }),
    ).toBeNull();
  });

  // A control-plane PR merged while a slice is running must not be tagged as
  // that slice. The branch is the guard: it is the one field that distinguishes
  // them when a graph names a running slice every open PR inherits.
  it("refuses when the merged branch is not the slice's branch", () => {
    expect(
      resolveSourceTagForMergedPullRequest(graphWith(), {
        url: PR,
        headRef: "codex/some-other-branch-v1",
      }),
    ).toBeNull();
  });

  it("ignores nodes that are not running slices", () => {
    for (const status of ["planned", "done", "blocked", "abandoned"]) {
      expect(
        resolveSourceTagForMergedPullRequest(graphWith({ status }), {
          url: PR,
          headRef: "codex/rebuild-cr15-expo-57-v1",
        }),
      ).toBeNull();
    }
    expect(
      resolveSourceTagForMergedPullRequest(graphWith({ kind: "task" }), {
        url: PR,
        headRef: "codex/rebuild-cr15-expo-57-v1",
      }),
    ).toBeNull();
  });

  it("ignores a malformed graph rather than throwing", () => {
    for (const graph of [null, {}, { nodes: "no" }, { nodes: [null] }]) {
      expect(
        resolveSourceTagForMergedPullRequest(graph, {
          url: PR,
          headRef: "codex/rebuild-cr15-expo-57-v1",
        }),
      ).toBeNull();
    }
  });

  it("rejects a slice ID that would escape the tag namespace", () => {
    expect(() => sourceTagRefFor("../evil")).toThrow();
    expect(() => sourceTagRefFor("CR15 extra")).toThrow();
    expect(() => sourceTagRefFor("")).toThrow();
  });
});
