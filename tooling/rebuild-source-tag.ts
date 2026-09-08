import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Publishing a slice's immutable source tag, which `docs/rebuild/README.md`
 * requires at the canonical pull-request head before a slice may be recorded
 * `done`. Offline reconciliation reconstructs provenance from that tag and
 * never from a retained branch, so the tag has to exist even after GitHub
 * deletes the source branch.
 *
 * This module only decides *whether* a merged pull request is a slice and what
 * its tag is called. Creating the tag, and refusing to move an existing one,
 * belongs to the caller.
 */

const SLICE_ID = /^CR[0-9]{2}$/;

export function sourceTagRefFor(nodeId: string) {
  if (!SLICE_ID.test(nodeId)) {
    throw new Error(`refusing to build a source tag for node ID: ${nodeId}`);
  }
  return `refs/tags/rebuild/${nodeId.toLowerCase()}-source`;
}

export type MergedPullRequest = {
  url: string;
  headRef: string;
};

/**
 * The running slice a just-merged pull request belongs to, or null.
 *
 * Both the pull request URL and the head branch must match the node. The branch
 * is not redundant: between a slice merging and its record catching up, the
 * default branch's graph still names that slice as running, so a control-plane
 * pull request merged in that window would otherwise look like the slice.
 */
export function resolveSourceTagForMergedPullRequest(
  graph: unknown,
  pullRequest: MergedPullRequest,
): { nodeId: string; ref: string } | null {
  if (typeof graph !== "object" || graph === null) {
    return null;
  }
  const nodes = (graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return null;
  }
  for (const node of nodes) {
    if (typeof node !== "object" || node === null) {
      continue;
    }
    const { id, kind, status, branch, pr } = node as Record<string, unknown>;
    if (kind !== "slice" || status !== "running") {
      continue;
    }
    if (typeof id !== "string" || typeof pr !== "string") {
      continue;
    }
    if (pr !== pullRequest.url || branch !== pullRequest.headRef) {
      continue;
    }
    if (!SLICE_ID.test(id)) {
      return null;
    }
    return { nodeId: id, ref: sourceTagRefFor(id) };
  }
  return null;
}

export function runRebuildSourceTagCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
) {
  const [url, headRef, graphArg] = args;
  if (!url || !headRef) {
    console.error(
      "Usage: rebuild:source-tag <pull-request-url> <head-ref> [path-to-graph.json]",
    );
    return 1;
  }
  const inputPath = graphArg ?? "docs/rebuild/graph.json";
  let graph: unknown;
  try {
    graph = JSON.parse(readFileSync(resolve(cwd, inputPath), "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to read rebuild graph ${inputPath}: ${message}`);
    return 1;
  }

  const resolved = resolveSourceTagForMergedPullRequest(graph, {
    url,
    headRef,
  });
  if (!resolved) {
    // Not a slice pull request. This is the common case — control-plane and
    // ordinary pull requests merge here too — so it is not an error. It goes to
    // stderr so stdout carries the machine-readable result and nothing else.
    console.error(`No running slice claims ${url} on branch ${headRef}.`);
    return 0;
  }
  console.log(`${resolved.nodeId} ${resolved.ref}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runRebuildSourceTagCli();
}
