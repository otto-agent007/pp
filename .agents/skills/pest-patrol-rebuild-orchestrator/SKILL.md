---
name: pest-patrol-rebuild-orchestrator
description: Use when selecting, reconciling, or preparing one Pest Patrol controlled-rebuild graph node for bounded execution.
---

# Pest Patrol Rebuild Orchestrator

Treat `docs/rebuild/graph.json` as the scheduler and
`docs/rebuild/README.md` as its operating contract. Produce evidence and a
bounded proposal; only the controller can authorize implementation or mutate
branches, GitHub, providers, environments, preview data, or production.

## Reconcile and select

1. Read the root and `docs/AGENTS.md`, the runbook, graph,
   `docs/CODEX_OPERATING_PLAN.md`, `tasks/in-progress.md`, and protected
   worktree status.
2. Run a fresh deterministic graph check before selection. Resolve the
   package manager and version from the repository's `packageManager` field;
   try Corepack or a matching installed executable first. Before using a
   registry-dependent runner, obtain the npm cache root with
   `npm config get cache`; inspect
   `<cache>/_npx/*/node_modules/pnpm/package.json` in lexical order, verify its
   `version` exactly matches the declared version, then invoke that entry's
   sibling `<cache>/_npx/<entry>/node_modules/.bin/pnpm`. A PATH miss alone
   does not prove the declared tool is unavailable. Record the exact command,
   exit code, and result. Stop selection when validation fails.
3. Reconcile at most one node. An unresolved `running` node takes precedence.
   When PR or merge state matters, query GitHub read-only and label that
   evidence as live. Label local branch, ref, and commit evidence as local;
   never infer a live merge, review, or PR state from it. If live evidence is
   unavailable, say so and do not promote the node.
4. If no node is running, select at most one candidate in
   `preferredPrOrder` whose dependencies are `done`, conflicts are clear, and
   graph status permits the transition. Do not silently edit state or start a
   second slice.
5. Copy ownership, deliverables, checks, approvals, evidence, branch, and PR
   values from verified sources. Never invent values for empty fields. Report
   each missing field as an explicit scope gap; an incomplete candidate gets
   a planning-only handoff, not implementation clearance.

## Bounded handoff

Emit one consistent handoff with:

- node ID, current state, and graph-validation evidence;
- prerequisite and live/local reconciliation evidence;
- goal and deliverables;
- owned paths exactly as approved;
- exclusions and authority boundaries;
- intended base and branch, or `unresolved` with the missing decision;
- focused and repository-level tests exactly as approved;
- risks and required approvals; and
- proposed graph and task-document updates, clearly marked as proposals.

End with a gate result: `blocked`, `planning-ready`, or
`controller-approval-required`. The handoff never creates implementation
authority, supplies missing approval, or authorizes commits, pushes, PRs,
migrations, security decisions, provider changes, or production actions.
