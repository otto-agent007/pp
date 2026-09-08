# CR06 Durable Queue Relocation Plan

**Goal:** move the durable offline queue out of `packages/application` and into
`packages/sync`, so the package that owns provider-independent use cases stops
owning the mobile write path, and `packages/sync` becomes a real package rather
than a planned one.

**Controlled rebuild:** node `CR06` in `docs/rebuild/graph.json`. Base:
`bc543ac27d7f3c1382b23e7df871082cea8ab134`. Branch:
`codex/rebuild-cr06-sync-v1`.

**Approvals:** the controller scoped CR06 on 2026-09-08 as a pure relocation,
with CR04's `mutationOutcome` semantics left unwired so that a queue regression
stays attributable to one change or the other.

## What measurement found before any code moved

CR06 is the first slice in this chain that measurement found already correctly
specified in its substance. CR05 put the queue behind `OfflineSyncPort`, so
`packages/sync` never needs `api-client` — the edge absent from its allowlist,
and the one whose absence made this move impossible while it was still CR05's
problem.

| | |
|---|---|
| Move | `offlineSync.ts` — 10 functions, 484 lines — plus its 602-line test |
| App consumers | **1** — `apps/mobile/src/store/useQueueSync.ts`, one symbol |
| New dependencies | `application`, `domain`, `types` — all already allowed |
| Cycles introduced | **none**, by depth-first search over the live manifests |

Two things measurement did find:

**The declared ownership could not land the change.** CR06 owned
`apps/mobile/src/store/useQueueSync.ts` but not `apps/mobile/package.json`. A
source import with no matching manifest dependency is a
`missing-manifest-dependency` violation, so the import could not be repointed
without editing a file the node did not own — and the reconciler enforces
changed-path ownership for the running slice, so the gate would have caught it
at the end rather than the start. This is the sixth instance in this chain of a
requirement recorded somewhere the enforcement never reads, and the first that a
gate would have caught on its own.

**Four of the six required test dimensions were unaddressed.**
`docs/architecture.md` requires CR06 to provide package-local tests for durable
identity and state, persistence, restart replay, retry and backoff scheduling,
durable transitions, and stable identity across retry. The moved suite covers
per-action mapping and the backoff dimension. It never crosses a restart, never
drives `processOfflineQueueItems`, and never asserts that a replay is the same
logical write as the attempt it repeats.

## Steps

### 1. Move the files, and prove it was a move

`git mv` both files, then repoint the one import each needs — `OfflineSyncPort`
comes from `@pest-patrol/application` rather than a sibling module. Verify with
rename-detected `git diff -M --stat`: two files, one insertion and one deletion
each. Anything more is a rewrite wearing a move's clothes.

### 2. Make `packages/sync` a package

Manifest, tsconfig mirroring `packages/application` including `"types": ["node"]`,
and an explicit re-export barrel. Promote `packages/sync` from `planned` to
`required` in the boundary policy, add the path mapping, add the workspace
dependency to the mobile manifest, and install.

### 3. Cover the durability dimensions the move inherited

Write the tests for the four unaddressed dimensions in a separate file, so the
moved suite stays byte-comparable against its source. Persist through JSON
between passes: an item that cannot survive that round trip is not durable
whatever it does in memory.

### 4. Prove each new test fires

Inject a fault per dimension and require a named failure. A test that passes
against broken code has asserted nothing.

## What CR06 deliberately does not do

**It does not wire `mutationOutcome` into the retry path.** CR04 defined
conflict and terminal-failure semantics; the queue still uses its own
`maxAttempts` budget and its own reasons. Wiring them together changes queue
behaviour, and doing that in the same slice as the move would make any
regression attributable to either. That is a later slice.

**It does not touch `packages/domain`.** The queue's state transitions stay
where they are. CR07 owns the queue's action and payload type mapping.
