# Controlled rebuild operator runbook

`graph.json` is the versioned, machine-validated source of truth for the
Pest Patrol OS controlled-rebuild schedule. Run
`pnpm rebuild:graph:check` before treating a graph edit as valid.

## Scope and current target matrix

CR00 is the active control-plane slice. It establishes the schedule and
operator rules; it does not implement the application destination, migrate a
runtime, change an app, modify a dependency, or mutate a provider,
environment, preview, or production state.

The target matrix is refreshed at the start of the applicable version slice
and then frozen for that slice's implementation and review:

- Node 24 LTS.
- The latest stable patch in pnpm 11.
- Next.js 16 stable.
- Expo SDK 54, 55, 56, and 57, each in its own one-SDK migration slice.

Prereleases are not eligible targets. A refresh records the current released
stable target and its evidence before any implementation. Once the controller
approves that selection, the branch, PR, lockfile, and verification evidence
use that exact version; the target is not refreshed again during the slice.

## Scheduling and state transitions

Use `planned` for an unstarted node, `ready` only after every dependency is
`done`, `running` for the one active implementation slice, `blocked` when an
external decision or failed gate prevents progress, and `done` only after the
node's evidence is recorded. A done slice must also record its merged PR URL
and merge SHA. Dependencies, conflicts, and the preferred numeric PR order in
the graph govern promotion; the preferred order is CR00 through CR18.

Only one implementation slice and one draft PR may be active at a time.
Read-only preparation is allowed for a dependency-ready future node, but it
must not change tracked files, claim `running`, create a branch, or open a PR.
The controller must resolve a running node before another implementation slice
starts.

Graph conflicts are active only when both referenced nodes would be `running`
implementation work. They prohibit that concurrent run; a conflict involving a
`planned`, `ready`, `blocked`, or `done` node is scheduling context, not an
active conflict claim. In particular, `ready` is read-only preparation rather
than an implementation claim, so it cannot activate a conflict. Dependencies
still control promotion to `ready`.

## Branch, approval, and evidence rules

Start each implementation slice from its intended base on a fresh, correctly
named `codex/*` branch. Do not reuse a merged, unrelated, or mismatched
branch. Keep each branch inside the graph node's approved ownership and record
the branch and draft PR in the graph as soon as they exist.

Before promoting a node, record fresh command output, review findings, and
any required approval in its evidence. Never record credentials, tokens,
provider values, raw portal links, or other secrets. Security, migration,
provider, environment, preview, production, push, and PR decisions remain
controller-approved boundaries.

Live GitHub state wins over stale tracked graph status. Before a new slice
starts, reconcile its predecessor against live GitHub evidence. The first
commit of the new slice must record that reconciliation of the previous node;
do not defer it to the end of the new slice.

## Architecture destination

The controlled rebuild is headed toward bounded-context types and compatibility
exports in `packages/types`; pure business rules in `packages/domain`; ports
and use cases in `packages/application`; demo and Supabase adapters in
`packages/api-client`; a durable offline queue in `packages/sync`; and apps
that compose those packages into UI. UI components do not access Supabase
directly, and mobile writes remain queue-first. This is a destination for the
future dependency-ready slices, not work implemented by CR00.
