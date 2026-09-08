# CR05 Ports and Adapters Plan

**Goal:** replace the application layer's direct adapter calls with ports, so
`packages/application` names no provider, and clear every remaining boundary
exception.

**Controlled rebuild:** node `CR05` in `docs/rebuild/graph.json`. Base:
`b98e6f6388051193f258d2e35bc9be0611418b57`. Branch:
`codex/rebuild-cr05-ports-v1`. Design:
[CR05 Ports and Adapters Design](../specs/2026-09-08-controlled-rebuild-cr05-ports-design.md).

**Approvals:** the controller scoped CR05 on 2026-09-08 — ports passed as a
parameter rather than a bound factory, and the `supabase` singleton wrapped
rather than removed with removal deferred to CR09 — then approved widening the
slice to all twenty app files, and approved absorbing `offlineSync` once the
dependency cycle made the original ordering impossible.

## Two scope corrections, both found by measurement

**The app surface was five files, then twenty.** The first scoping counted only
the files that pass an `AuthSupabaseClient`. But removing
`application-to-api-client` requires *every* use case to stop importing
api-client, and under parameter injection every caller must construct and pass a
port. The real numbers: **88 use cases, 20 app files**, not 15 and 5.

**`offlineSync` had to move here, not in CR06.** Adding `api-client ->
application` while `domain -> api-client` still existed closes a cycle that
turbo refuses outright. The design document explains why this is an ordering
fact rather than a preference. Moving it makes `packages/domain` depend on
`types` alone.

## Steps

### 1. Derive the port surface

Extract every adapter signature with the TypeScript compiler. Substitute a
public type name only where printed and candidate types are assignable in both
directions; decide the rest deliberately. See the design document for the six
that needed a decision.

### 2. Rewire the use cases

Transform each application module: drop the api-client import, add the port
import, give every adapter-reaching function a port parameter, and rewrite call
sites — dropping a client argument wherever the adapter took one. The client
appears first, second, third or not at all across the 76 adapters, so bind it by
position rather than by convention.

### 3. Implement the ports

Generate `packages/api-client/adapters.ts`: one factory per port, each binding a
client once and splicing it back at the position its adapter expects. Import the
port interfaces from `@pest-patrol/application` rather than restating them.

### 4. Absorb offlineSync

Extract its ten adapter-reaching declarations into `packages/application`, add
`OfflineSyncPort`, and reclassify the module in
`packages/domain/module-roles.json`. CR03's guard will fail first and name the
module — let it, then fix the manifest.

### 5. Composition roots

Construct each port once per file and pass it. Two things a transformer gets
wrong and a human must check:

- **Point-free references.** `mutationFn: archiveNotificationTemplate` is not a
  call expression, so a call-site rewriter misses it. Seven needed wrapping.
- **Per-request clients.** The two automation scheduler routes build a
  service-role client inside the handler. A module-scope port silently swaps it
  for the anon singleton — a real behavioural regression, caught by their tests.

### 6. Clear the exceptions, then the gates

All three exceptions become stale together; remove them and confirm
`architecture:check` reports zero. Then the full gate set, promotion commit,
`pnpm rebuild:verify` on a clean tree, and stop for merge approval.

## Ownership

```text
apps/mobile/src/store/*.ts
apps/web/app/**            (auth contexts, automation scheduler routes)
apps/web/hooks/*.ts
docs/architecture.md
docs/rebuild/graph.json
docs/superpowers/{plans,specs}/2026-09-08-controlled-rebuild-cr05-ports*.md
packages/api-client/**
packages/application/**
packages/domain/**
tooling/architecture-boundaries.json
tsconfig.base.json
pnpm-lock.yaml
tasks/in-progress.md
```

## What this slice leaves

- **The `supabase` singleton.** 47 adapters still use it, so composition-root
  selection is nominal for those. CR09 removes it; that is already a recorded
  CR09 deliverable.
- **`packages/sync`.** Still `planned`. CR06 relocates the durable queue from
  `packages/application` into it, using these ports.
