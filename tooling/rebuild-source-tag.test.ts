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

  it("ignores a node that is not running", () => {
    for (const status of ["planned", "done", "blocked", "abandoned"]) {
      expect(
        resolveSourceTagForMergedPullRequest(graphWith({ status }), {
          url: PR,
          headRef: "codex/rebuild-cr15-expo-57-v1",
        }),
      ).toBeNull();
    }
  });

  it("ignores a node kind that ships no pull request", () => {
    expect(
      resolveSourceTagForMergedPullRequest(graphWith({ kind: "gate" }), {
        url: PR,
        headRef: "codex/rebuild-cr15-expo-57-v1",
      }),
    ).toBeNull();
  });

  /**
   * A write task is tagged on the same terms as a slice. It ships its own pull
   * request and is recorded `done` from its own merge, so offline
   * reconciliation needs its provenance for the same reason. This used to
   * assert the opposite, which would have left the first decomposed slice with
   * no source tag and no way to reach `done`.
   */
  it("resolves a running write task whose pull request just merged", () => {
    expect(
      resolveSourceTagForMergedPullRequest(
        graphWith({
          id: "CR09A",
          kind: "task",
          branch: "codex/rebuild-cr09a-singleton-v1",
        }),
        { url: PR, headRef: "codex/rebuild-cr09a-singleton-v1" },
      ),
    ).toEqual({ nodeId: "CR09A", ref: "refs/tags/rebuild/cr09a-source" });
  });

  it("names a write task's tag from its suffixed ID", () => {
    expect(sourceTagRefFor("CR09A")).toBe("refs/tags/rebuild/cr09a-source");
    expect(sourceTagRefFor("CR09B")).toBe("refs/tags/rebuild/cr09b-source");
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

  it("rejects a node ID that would escape the tag namespace", () => {
    expect(() => sourceTagRefFor("../evil")).toThrow();
    expect(() => sourceTagRefFor("CR15 extra")).toThrow();
    expect(() => sourceTagRefFor("")).toThrow();
    expect(() => sourceTagRefFor("CR09AB")).toThrow();
    expect(() => sourceTagRefFor("CR09a")).toThrow();
  });
});
