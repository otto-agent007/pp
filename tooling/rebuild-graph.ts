import { readFileSync } from "node:fs";
import { posix, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = new Set(["slice", "task", "gate"]);
const STATUSES = new Set(["planned", "ready", "running", "blocked", "done"]);
const FROZEN_TARGET_MATRIX = {
  node: "Node 24 LTS",
  pnpm: "latest stable pnpm 11 patch",
  next: "Next.js 16 stable",
  expoPolicy:
    "SDK 54, SDK 55, SDK 56, and SDK 57 are separate one-SDK migration slices",
} as const;
const REQUIRED_NODE_FIELDS = [
  "id",
  "kind",
  "status",
  "parent",
  "dependencies",
  "conflicts",
  "ownership",
  "deliverables",
  "checks",
  "approvals",
  "evidence",
  "branch",
  "pr",
  "mergeSha",
] as const;

type GraphNode = {
  id: string;
  kind: string;
  status: string;
  parent: string | null;
  dependencies: string[];
  conflicts: string[];
  ownership: string[];
  deliverables: unknown;
  checks: unknown;
  approvals: unknown;
  evidence: unknown;
  branch: unknown;
  pr: unknown;
  mergeSha: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function nodeLabel(node: Record<string, unknown>, index: number) {
  return typeof node.id === "string" && node.id.length > 0
    ? `node ${node.id}`
    : `node at index ${index}`;
}

function hasNonEmptyEvidence(evidence: unknown) {
  return (
    isStringArray(evidence) && evidence.some((entry) => entry.trim().length > 0)
  );
}

function isPrUrl(value: unknown) {
  return (
    typeof value === "string" &&
    /^https:\/\/github\.com\/otto-agent007\/pp\/pull\/[1-9][0-9]*$/.test(value)
  );
}

function isMergeSha(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
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

function ownershipPathsOverlap(left: string, right: string) {
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`)
  );
}

function validateTopLevelGraphFields(
  graph: Record<string, unknown>,
  nodes: readonly GraphNode[],
  errors: string[],
) {
  const order = graph.preferredPrOrder;
  if (!isStringArray(order)) {
    errors.push("preferredPrOrder must be an array of CR node IDs");
  } else {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const orderIds = new Set(order);
    if (
      orderIds.size !== order.length ||
      orderIds.size !== nodeIds.size ||
      [...orderIds].some((id) => !nodeIds.has(id))
    ) {
      errors.push("preferredPrOrder must contain each node exactly once");
    }

    const orderIndex = new Map(order.map((id, index) => [id, index]));
    for (const node of [...nodes].sort((left, right) =>
      left.id.localeCompare(right.id),
    )) {
      for (const dependency of [...node.dependencies].sort()) {
        const nodeIndex = orderIndex.get(node.id);
        const dependencyIndex = orderIndex.get(dependency);
        if (
          nodeIndex !== undefined &&
          dependencyIndex !== undefined &&
          nodeIndex < dependencyIndex
        ) {
          errors.push(
            `preferredPrOrder places ${node.id} before dependency ${dependency}`,
          );
        }
      }
    }
  }

  if (!isRecord(graph.targetMatrix)) {
    errors.push("targetMatrix must be an object");
    return;
  }

  for (const field of ["node", "pnpm", "next", "prereleases"] as const) {
    if (
      typeof graph.targetMatrix[field] !== "string" ||
      graph.targetMatrix[field].trim().length === 0
    ) {
      errors.push(`targetMatrix.${field} must be a non-empty string`);
    }
  }
  for (const field of ["node", "pnpm", "next"] as const) {
    if (
      typeof graph.targetMatrix[field] === "string" &&
      graph.targetMatrix[field] !== FROZEN_TARGET_MATRIX[field]
    ) {
      errors.push(
        `targetMatrix.${field} must equal ${FROZEN_TARGET_MATRIX[field]}`,
      );
    }
  }
  if (graph.targetMatrix.prereleases !== "forbidden") {
    errors.push("targetMatrix.prereleases must be forbidden");
  }

  const expo = graph.targetMatrix.expo;
  if (!isRecord(expo)) {
    errors.push("targetMatrix.expo must be an object");
    return;
  }
  if (typeof expo.policy !== "string" || expo.policy.trim().length === 0) {
    errors.push("targetMatrix.expo.policy must be a non-empty string");
  } else if (expo.policy !== FROZEN_TARGET_MATRIX.expoPolicy) {
    errors.push(
      `targetMatrix.expo.policy must equal ${FROZEN_TARGET_MATRIX.expoPolicy}`,
    );
  }

  const expectedExpoSlices = [
    ["CR13", 54],
    ["CR14", 55],
    ["CR15", 56],
    ["CR16", 57],
  ] as const;
  if (
    !Array.isArray(expo.slices) ||
    expo.slices.length !== expectedExpoSlices.length ||
    !expo.slices.every(
      (slice, index) =>
        isRecord(slice) &&
        slice.id === expectedExpoSlices[index][0] &&
        slice.sdk === expectedExpoSlices[index][1],
    )
  ) {
    errors.push(
      "targetMatrix.expo.slices must map CR13=54, CR14=55, CR15=56, and CR16=57",
    );
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const [id] of expectedExpoSlices) {
    const node = nodesById.get(id);
    if (!node) {
      errors.push(
        `targetMatrix.expo.slices references missing slice node ${id}`,
      );
    } else if (node.kind !== "slice") {
      errors.push(`targetMatrix.expo.slices node ${id} must have kind slice`);
    }
  }
}

function findCycles(
  nodes: readonly GraphNode[],
  edgesForNode: (node: GraphNode) => readonly string[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const cycles = new Set<string>();

  function visit(id: string, trail: string[]) {
    if (visiting.has(id)) {
      const start = trail.indexOf(id);
      cycles.add([...trail.slice(start), id].join(" -> "));
      return;
    }
    if (visited.has(id)) {
      return;
    }

    const node = nodesById.get(id);
    if (!node) {
      return;
    }

    visiting.add(id);
    for (const edge of [...edgesForNode(node)].sort()) {
      if (nodesById.has(edge)) {
        visit(edge, [...trail, id]);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of [...nodes].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    visit(node.id, []);
  }

  return [...cycles].sort();
}

/**
 * Validates the versioned controlled-rebuild dependency graph without reading
 * files or modifying process state. Errors are stable and safe to print as CLI
 * output.
 */
export function validateRebuildGraph(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return ["graph must be an object"];
  }

  if (value.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }

  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    errors.push("nodes must be a non-empty array");
    validateTopLevelGraphFields(value, [], errors);
    return [...new Set(errors)].sort();
  }

  const validNodes: GraphNode[] = [];
  const ids = new Set<string>();

  value.nodes.forEach((rawNode, index) => {
    if (!isRecord(rawNode)) {
      errors.push(`node at index ${index} must be an object`);
      return;
    }

    const label = nodeLabel(rawNode, index);
    for (const field of REQUIRED_NODE_FIELDS) {
      if (!(field in rawNode)) {
        errors.push(`${label} must include ${field}`);
      }
    }

    if (typeof rawNode.id !== "string" || rawNode.id.trim().length === 0) {
      errors.push(`${label} must have a non-empty string id`);
      return;
    }
    if (ids.has(rawNode.id)) {
      errors.push(`node ID ${rawNode.id} is duplicated`);
      return;
    }
    ids.add(rawNode.id);

    if (!KINDS.has(rawNode.kind as string)) {
      errors.push(`${label} has unsupported kind ${String(rawNode.kind)}`);
    }
    if (!STATUSES.has(rawNode.status as string)) {
      errors.push(`${label} has unsupported status ${String(rawNode.status)}`);
    }
    if (rawNode.parent !== null && typeof rawNode.parent !== "string") {
      errors.push(`${label} parent must be a node ID or null`);
    }

    for (const field of ["dependencies", "conflicts", "ownership"] as const) {
      if (!isStringArray(rawNode[field])) {
        errors.push(`${label} ${field} must be an array of strings`);
      }
    }
    for (const field of [
      "deliverables",
      "checks",
      "approvals",
      "evidence",
    ] as const) {
      if (!Array.isArray(rawNode[field])) {
        errors.push(`${label} ${field} must be an array`);
      }
    }
    for (const field of ["branch", "pr", "mergeSha"] as const) {
      if (typeof rawNode[field] !== "string") {
        errors.push(`${label} ${field} must be a string`);
      }
    }

    if (
      typeof rawNode.kind === "string" &&
      typeof rawNode.status === "string" &&
      (rawNode.parent === null || typeof rawNode.parent === "string") &&
      isStringArray(rawNode.dependencies) &&
      isStringArray(rawNode.conflicts) &&
      isStringArray(rawNode.ownership)
    ) {
      validNodes.push({
        id: rawNode.id,
        kind: rawNode.kind,
        status: rawNode.status,
        parent: rawNode.parent,
        dependencies: rawNode.dependencies,
        conflicts: rawNode.conflicts,
        ownership: rawNode.ownership,
        deliverables: rawNode.deliverables,
        checks: rawNode.checks,
        approvals: rawNode.approvals,
        evidence: rawNode.evidence,
        branch: rawNode.branch,
        pr: rawNode.pr,
        mergeSha: rawNode.mergeSha,
      });
    }
  });

  const nodesById = new Map(validNodes.map((node) => [node.id, node]));
  validateTopLevelGraphFields(value, validNodes, errors);
  for (const node of validNodes) {
    if (node.parent === node.id) {
      errors.push(`node ${node.id} cannot parent itself`);
    } else if (node.parent !== null && !nodesById.has(node.parent)) {
      errors.push(`node ${node.id} references missing parent ${node.parent}`);
    }

    for (const dependency of node.dependencies) {
      if (dependency === node.id) {
        errors.push(`node ${node.id} cannot depend on itself`);
      } else if (!nodesById.has(dependency)) {
        errors.push(
          `node ${node.id} references missing dependency ${dependency}`,
        );
      }
    }
    for (const conflict of node.conflicts) {
      if (conflict === node.id) {
        errors.push(`node ${node.id} cannot conflict with itself`);
      } else if (!nodesById.has(conflict)) {
        errors.push(`node ${node.id} references missing conflict ${conflict}`);
      }
    }
    for (const ownershipPath of node.ownership) {
      if (!isRepositoryRelativePath(ownershipPath)) {
        errors.push(
          `node ${node.id} ownership path must be a normalized repository-relative path: ${JSON.stringify(ownershipPath)}`,
        );
      }
    }
  }

  for (const cycle of findCycles(validNodes, (node) => node.dependencies)) {
    errors.push(`dependency graph contains a cycle: ${cycle}`);
  }
  for (const cycle of findCycles(validNodes, (node) =>
    node.parent === null ? [] : [node.parent],
  )) {
    errors.push(`parent graph contains a cycle: ${cycle}`);
  }

  const runningSlices = validNodes
    .filter((node) => node.kind === "slice" && node.status === "running")
    .map((node) => node.id)
    .sort();
  if (runningSlices.length > 1) {
    errors.push(
      `only one slice may be running; found ${runningSlices.join(", ")}`,
    );
  }

  const activeConflicts = new Set<string>();
  for (const node of [...validNodes]
    .filter((candidate) => candidate.status === "running")
    .sort((left, right) => left.id.localeCompare(right.id))) {
    for (const conflict of [...node.conflicts].sort()) {
      const conflictNode = nodesById.get(conflict);
      if (conflict !== node.id && conflictNode?.status === "running") {
        const [left, right] = [node.id, conflict].sort();
        activeConflicts.add(`${left}\u0000${right}`);
      }
    }
  }
  for (const conflict of [...activeConflicts].sort()) {
    const [left, right] = conflict.split("\u0000");
    errors.push(`running nodes ${left} and ${right} have an active conflict`);
  }

  const runningWriteTasks = validNodes
    .filter(
      (node) =>
        node.kind === "task" &&
        node.status === "running" &&
        node.ownership.length > 0,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  for (let index = 0; index < runningWriteTasks.length; index += 1) {
    for (
      let otherIndex = index + 1;
      otherIndex < runningWriteTasks.length;
      otherIndex += 1
    ) {
      const task = runningWriteTasks[index];
      const otherTask = runningWriteTasks[otherIndex];
      for (const path of [...task.ownership].sort()) {
        for (const otherPath of [...otherTask.ownership].sort()) {
          if (ownershipPathsOverlap(path, otherPath)) {
            const overlap =
              path === otherPath ? path : `${path} and ${otherPath}`;
            errors.push(
              `running write tasks ${task.id} and ${otherTask.id} overlap on ownership ${overlap}`,
            );
          }
        }
      }
    }
  }

  for (const node of validNodes) {
    if (
      node.status === "ready" ||
      node.status === "running" ||
      node.status === "done"
    ) {
      for (const dependency of node.dependencies) {
        const dependencyNode = nodesById.get(dependency);
        if (dependencyNode && dependencyNode.status !== "done") {
          errors.push(
            `${node.status} node ${node.id} depends on ${dependency} with status ${dependencyNode.status}, not done`,
          );
        }
      }
    }

    if (node.status === "done" && !hasNonEmptyEvidence(node.evidence)) {
      errors.push(`done node ${node.id} must include non-empty evidence`);
    }
    if (node.kind === "slice" && node.status === "done") {
      if (!isPrUrl(node.pr)) {
        errors.push(
          `done slice ${node.id} must include the canonical GitHub pull request URL`,
        );
      }
      if (!isMergeSha(node.mergeSha)) {
        errors.push(
          `done slice ${node.id} must include a 40-character hexadecimal merge SHA`,
        );
      }
    }
  }

  return [...new Set(errors)].sort();
}

export function runRebuildGraphCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
) {
  const pathArgs = args[0] === "--" ? args.slice(1) : args;
  if (pathArgs.length > 1) {
    console.error("Usage: rebuild:graph:check [path-to-graph.json]");
    return 1;
  }

  const inputPath = pathArgs[0] ?? "docs/rebuild/graph.json";
  const resolvedPath = resolve(cwd, inputPath);
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to read rebuild graph ${inputPath}: ${message}`);
    return 1;
  }

  const errors = validateRebuildGraph(value);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    return 1;
  }

  console.log(`Rebuild graph is valid: ${inputPath}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runRebuildGraphCli();
}
