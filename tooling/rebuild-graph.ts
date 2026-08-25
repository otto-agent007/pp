import { readFileSync } from "node:fs";
import { posix, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = new Set(["slice", "task", "gate"]);
const STATUSES = new Set([
  "planned",
  "ready",
  "running",
  "blocked",
  "done",
  "abandoned",
  "superseded",
]);
const TARGET_SELECTIONS = new Set([
  "lts-major",
  "latest-stable-patch",
  "stable-major",
  "exact-sdk-major",
]);
const REQUIRED_NODE_FIELDS = [
  "baseSha",
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
  "supersededBy",
  "target",
] as const;

type GraphNode = {
  baseSha: unknown;
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
  supersededBy: string | null;
  target: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nodeLabel(node: Record<string, unknown>, index: number) {
  return typeof node.id === "string" && node.id.length > 0
    ? `node ${node.id}`
    : `node at index ${index}`;
}

function isPrUrl(value: unknown, repositorySlug: string) {
  return (
    typeof value === "string" &&
    new RegExp(
      `^https://github\\.com/${repositorySlug.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/pull/[1-9][0-9]*$`,
    ).test(value)
  );
}

function isMergeSha(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function isUtcTimestamp(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function hasSuccessfulCommandEvidence(evidence: unknown) {
  return (
    Array.isArray(evidence) &&
    evidence.some(
      (entry) =>
        isRecord(entry) &&
        entry.kind === "command" &&
        entry.exitCode === 0 &&
        isMergeSha(entry.commitSha),
    )
  );
}

function hasApprovalEvidence(evidence: unknown) {
  return (
    Array.isArray(evidence) &&
    evidence.some(
      (entry) =>
        isRecord(entry) &&
        entry.kind === "approval" &&
        isMergeSha(entry.commitSha),
    )
  );
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
  }

  if (!isRecord(graph.repository)) {
    errors.push("repository must be an object");
  } else {
    if (
      typeof graph.repository.slug !== "string" ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(graph.repository.slug)
    ) {
      errors.push("repository.slug must be an owner/name GitHub slug");
    }
    if (
      typeof graph.repository.defaultBranch !== "string" ||
      graph.repository.defaultBranch.trim().length === 0
    ) {
      errors.push("repository.defaultBranch must be a non-empty branch name");
    }
  }

  if (!isRecord(graph.targetPolicy)) {
    errors.push("targetPolicy must be an object");
  } else {
    if (graph.targetPolicy.prereleases !== "forbidden") {
      errors.push("targetPolicy.prereleases must be forbidden");
    }
    if (graph.targetPolicy.refreshAt !== "slice-start") {
      errors.push("targetPolicy.refreshAt must be slice-start");
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

function resolveSupersededNode(
  node: GraphNode,
  nodesById: ReadonlyMap<string, GraphNode>,
) {
  const visited = new Set<string>();
  let current: GraphNode | undefined = node;

  while (current?.status === "superseded") {
    if (visited.has(current.id) || current.supersededBy === null) {
      return undefined;
    }
    visited.add(current.id);
    current = nodesById.get(current.supersededBy);
  }

  return current;
}

function resolvedDependencyIds(
  node: GraphNode,
  nodesById: ReadonlyMap<string, GraphNode>,
) {
  return node.dependencies.map((dependency) => {
    const dependencyNode = nodesById.get(dependency);
    return dependencyNode
      ? (resolveSupersededNode(dependencyNode, nodesById)?.id ?? dependency)
      : dependency;
  });
}

function validatePreferredOrder(
  order: unknown,
  nodes: readonly GraphNode[],
  nodesById: ReadonlyMap<string, GraphNode>,
  errors: string[],
) {
  if (!isStringArray(order)) {
    return;
  }

  const orderIndex = new Map(order.map((id, index) => [id, index]));
  for (const node of [...nodes].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    for (const dependency of [
      ...resolvedDependencyIds(node, nodesById),
    ].sort()) {
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
    if (
      rawNode.supersededBy !== null &&
      typeof rawNode.supersededBy !== "string"
    ) {
      errors.push(`${label} supersededBy must be a node ID or null`);
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
    if (Array.isArray(rawNode.evidence)) {
      rawNode.evidence.forEach((entry, evidenceIndex) => {
        const evidenceLabel = `${label} evidence entry ${evidenceIndex}`;
        if (!isRecord(entry)) {
          errors.push(`${evidenceLabel} must be a structured evidence record`);
          return;
        }
        if (
          entry.kind !== "command" &&
          entry.kind !== "review" &&
          entry.kind !== "approval" &&
          entry.kind !== "github"
        ) {
          errors.push(`${evidenceLabel} has unsupported kind`);
        }
        if (typeof entry.summary !== "string" || entry.summary.trim() === "") {
          errors.push(`${evidenceLabel} summary must be non-empty`);
        }
        if (!isMergeSha(entry.commitSha)) {
          errors.push(`${evidenceLabel} commitSha must be a full commit SHA`);
        }
        if (!isUtcTimestamp(entry.recordedAt)) {
          errors.push(`${evidenceLabel} recordedAt must be a UTC timestamp`);
        }
        if (entry.kind === "command") {
          if (
            typeof entry.command !== "string" ||
            entry.command.trim() === ""
          ) {
            errors.push(`${evidenceLabel} command must be non-empty`);
          }
          if (!Number.isInteger(entry.exitCode)) {
            errors.push(`${evidenceLabel} exitCode must be an integer`);
          }
        }
        if (
          "url" in entry &&
          (typeof entry.url !== "string" || !/^https:\/\//.test(entry.url))
        ) {
          errors.push(`${evidenceLabel} url must be an HTTPS URL`);
        }
      });
    }
    for (const field of ["baseSha", "branch", "pr", "mergeSha"] as const) {
      if (typeof rawNode[field] !== "string") {
        errors.push(`${label} ${field} must be a string`);
      }
    }
    if (rawNode.target !== null) {
      if (!isRecord(rawNode.target)) {
        errors.push(`${label} target must be an object or null`);
      } else {
        for (const field of [
          "product",
          "constraint",
          "resolvedVersion",
        ] as const) {
          if (typeof rawNode.target[field] !== "string") {
            errors.push(`${label} target.${field} must be a string`);
          }
        }
        for (const field of ["product", "constraint"] as const) {
          if (
            typeof rawNode.target[field] === "string" &&
            rawNode.target[field].trim() === ""
          ) {
            errors.push(`${label} target.${field} must be non-empty`);
          }
        }
        if (!TARGET_SELECTIONS.has(rawNode.target.selection as string)) {
          errors.push(`${label} target.selection is unsupported`);
        }
      }
    }

    const parent = rawNode.parent;
    const supersededBy = rawNode.supersededBy;
    if (
      typeof rawNode.kind === "string" &&
      typeof rawNode.status === "string" &&
      isNullableString(parent) &&
      isNullableString(supersededBy) &&
      isStringArray(rawNode.dependencies) &&
      isStringArray(rawNode.conflicts) &&
      isStringArray(rawNode.ownership)
    ) {
      validNodes.push({
        baseSha: rawNode.baseSha,
        id: rawNode.id,
        kind: rawNode.kind,
        status: rawNode.status,
        parent,
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
        supersededBy,
        target: rawNode.target,
      });
    }
  });

  const nodesById = new Map(validNodes.map((node) => [node.id, node]));
  const repositorySlug =
    isRecord(value.repository) && typeof value.repository.slug === "string"
      ? value.repository.slug
      : "invalid/invalid";
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
    if (node.status === "superseded") {
      if (node.supersededBy === null || node.supersededBy.length === 0) {
        errors.push(`superseded node ${node.id} must name a replacement`);
      } else if (node.supersededBy === node.id) {
        errors.push(`node ${node.id} cannot supersede itself`);
      } else if (!nodesById.has(node.supersededBy)) {
        errors.push(
          `node ${node.id} references missing replacement ${node.supersededBy}`,
        );
      }
    } else if (node.supersededBy !== null) {
      errors.push(
        `node ${node.id} may name a replacement only when superseded`,
      );
    }
    for (const ownershipPath of node.ownership) {
      if (!isRepositoryRelativePath(ownershipPath)) {
        errors.push(
          `node ${node.id} ownership path must be a normalized repository-relative path: ${JSON.stringify(ownershipPath)}`,
        );
      }
    }
  }

  for (const cycle of findCycles(validNodes, (node) =>
    resolvedDependencyIds(node, nodesById),
  )) {
    errors.push(`resolved dependency graph contains a cycle: ${cycle}`);
  }
  for (const cycle of findCycles(validNodes, (node) =>
    node.parent === null ? [] : [node.parent],
  )) {
    errors.push(`parent graph contains a cycle: ${cycle}`);
  }
  for (const cycle of findCycles(validNodes, (node) =>
    node.status === "superseded" && node.supersededBy !== null
      ? [node.supersededBy]
      : [],
  )) {
    errors.push(`replacement graph contains a cycle: ${cycle}`);
  }
  validatePreferredOrder(value.preferredPrOrder, validNodes, nodesById, errors);

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
        if (dependencyNode?.status === "abandoned") {
          errors.push(
            `${node.status} node ${node.id} depends on abandoned node ${dependency}`,
          );
        } else if (dependencyNode?.status === "superseded") {
          const replacement = resolveSupersededNode(dependencyNode, nodesById);
          if (replacement && replacement.status !== "done") {
            errors.push(
              `${node.status} node ${node.id} resolves superseded dependency ${dependency} to ${replacement.id} with status ${replacement.status}, not done`,
            );
          }
        } else if (dependencyNode && dependencyNode.status !== "done") {
          errors.push(
            `${node.status} node ${node.id} depends on ${dependency} with status ${dependencyNode.status}, not done`,
          );
        }
      }
    }

    if (
      node.status === "ready" ||
      node.status === "running" ||
      node.status === "done"
    ) {
      if (node.ownership.length === 0) {
        errors.push(`${node.status} node ${node.id} must include ownership`);
      }
      if (!isStringArray(node.deliverables) || node.deliverables.length === 0) {
        errors.push(`${node.status} node ${node.id} must include deliverables`);
      }
      if (!isStringArray(node.checks) || node.checks.length === 0) {
        errors.push(`${node.status} node ${node.id} must include checks`);
      }
      if (!isMergeSha(node.baseSha)) {
        errors.push(
          `${node.status} node ${node.id} must include a full base SHA`,
        );
      }
      if (isRecord(node.target)) {
        if (
          typeof node.target.resolvedVersion !== "string" ||
          node.target.resolvedVersion.trim() === ""
        ) {
          errors.push(
            `${node.status} node ${node.id} target must include a resolved stable version`,
          );
        } else if (/-[0-9A-Za-z]/.test(node.target.resolvedVersion)) {
          errors.push(
            `${node.status} node ${node.id} target resolvedVersion must not be a prerelease`,
          );
        }
        if (!hasApprovalEvidence(node.evidence)) {
          errors.push(
            `${node.status} node ${node.id} target must include approval evidence`,
          );
        }
      }
    }

    if (
      (node.status === "abandoned" || node.status === "superseded") &&
      (!Array.isArray(node.evidence) || node.evidence.length === 0)
    ) {
      errors.push(`${node.status} node ${node.id} must include evidence`);
    }

    if (
      node.status === "done" &&
      !hasSuccessfulCommandEvidence(node.evidence)
    ) {
      errors.push(
        `done node ${node.id} must include successful command evidence`,
      );
    }
    if (node.kind === "slice" && node.status === "done") {
      if (
        typeof node.branch !== "string" ||
        !/^codex\/[a-z0-9][a-z0-9-]*$/.test(node.branch)
      ) {
        errors.push(
          `done slice ${node.id} must include a correctly named codex branch`,
        );
      }
      if (!isPrUrl(node.pr, repositorySlug)) {
        errors.push(
          `done slice ${node.id} must include a pull request URL for ${repositorySlug}`,
        );
      }
      if (!isMergeSha(node.mergeSha)) {
        errors.push(
          `done slice ${node.id} must include a 40-character hexadecimal merge SHA`,
        );
      }
    }
    if (node.kind === "slice" && node.status === "running") {
      if (
        typeof node.branch !== "string" ||
        !/^codex\/[a-z0-9][a-z0-9-]*$/.test(node.branch)
      ) {
        errors.push(
          `running slice ${node.id} must include a correctly named codex branch`,
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
