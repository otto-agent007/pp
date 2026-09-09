# Architecture

Pest Patrol OS is a full-stack pest-control operations platform. This document
is the canonical responsibility and workspace-dependency direction contract.
It describes the destination architecture; executable policy and the current
exception inventory are the source of truth for the repository's exact state.

## Platform context

The product includes a Next.js admin dashboard and customer portal, an Expo
technician mobile app, and provider-backed operational services. Mobile is
offline-first, eligible UI mutations are optimistic, and database integrity
controls remain provider concerns behind adapters.

## Target package direction

The target dependency direction is inward toward stable policy:

```text
@pest-patrol/types
        ^
        |
@pest-patrol/domain
        ^
        |
@pest-patrol/application
       ^             ^
       |             |
@pest-patrol/api-client   @pest-patrol/sync
              \           /
               app composition roots
```

| Workspace package | Allowed Pest Patrol workspace dependencies |
| --- | --- |
| `@pest-patrol/types` | none |
| `@pest-patrol/domain` | `@pest-patrol/types` |
| `@pest-patrol/application` | `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/api-client` | `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/sync` | `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/i18n` | none |
| `@pest-patrol/ui-tokens` | none |
| `@pest-patrol/ui` | `@pest-patrol/ui-tokens` |
| `@pest-patrol/ui-native` | `@pest-patrol/ui-tokens` |
| `@pest-patrol/web` | `@pest-patrol/api-client`, `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/i18n`, `@pest-patrol/sync`, `@pest-patrol/types`, `@pest-patrol/ui`, `@pest-patrol/ui-tokens` |
| `@pest-patrol/mobile` | `@pest-patrol/api-client`, `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/i18n`, `@pest-patrol/sync`, `@pest-patrol/types`, `@pest-patrol/ui-native`, `@pest-patrol/ui-tokens` |

An allowlist is permission, not a requirement that every listed edge already
exist. Every initial edge permits only `dependencies`; `devDependencies`,
`peerDependencies`, and `optionalDependencies` are never implicit
alternatives. A future policy change must explicitly permit the section for
that exact edge.

## Responsibilities

- `types` owns provider-independent shared contracts and has no Pest Patrol
  workspace dependency.
- `domain` owns pure business rules and depends only on `types`. It is
  provider-independent.
- `application` owns ports and use cases, coordinates domain behavior, and
  defines provider-independent conflict and terminal-failure semantics and
  policy.
- `api-client` owns provider and persistence adapters, including provider-SDK
  calls, mapping provider requests, responses, and errors to
  application-facing results, and idempotent delivery using stable intent
  identities. Adapter handling includes ambiguous provider responses.
- `sync` owns durable persisted intent identity and state, restart
  replay/recovery, retry and backoff scheduling, queue execution, and durable
  state transitions. Provider-adapter implementations are selected and wired
  at app composition roots.
- `i18n`, `ui-tokens`, `ui`, and `ui-native` are presentation libraries with
  explicit package-specific allowlists; they do not become application or
  provider layers.
- Web and mobile are app composition roots. They select implementations and
  wire dependencies rather than placing business rules or provider access in
  UI components. Mobile presentation also makes terminal failures visible and
  provides user recovery UI.

## Data flow

```text
UI/input -> app composition root -> application use case -> port -> adapter -> provider -> mapped result
```

Mobile writes use this canonical flow:

```text
UI/input -> durable offline queue -> optimistic projection -> sync/retry -> port/client adapter -> provider -> mapped result
```

This flow keeps policy and provider concerns separate. Domain code expresses
provider-independent rules; provider clients belong in adapter
implementations, never in domain code or UI components. Mobile remains
offline-first: a write is durably enqueued before its optimistic projection,
then the queue drives sync and retry rather than blocking field work on network
availability. Do not create optimistic-first or network-first mobile writes.
If a provider response is ambiguous, replay reuses the same stable intent
identity rather than creating a duplicate logical write.

## Future mobile-write evidence

CR04 (`packages/application`) must provide provider-independent conflict and
terminal-failure semantics and policy tests. CR05 (`packages/api-client`) must
provide adapter-mapping, stable-intent idempotency, and ambiguous-response
replay tests. CR06 (`packages/sync`) must provide package-local tests for
durable identity and state, persistence, restart replay, retry/backoff
scheduling, durable transitions, and stable identity across retry, using owned
package boundaries or fakes where needed. CR09 (`apps`) must provide the real
`apps/mobile` composition-root integration through durable enqueue, optimistic
projection, restart, sync, adapter/provider acknowledgment, plus a
terminal-failure visibility and user-recovery interaction test.

CR01 documents this target contract only. It creates no application or sync
package implementation and does not claim that these behaviors exist in the
current repository.

## Target versus current repository state

CR01 records the target direction without claiming that the current repository
already conforms. The versioned [boundary policy](../tooling/architecture-boundaries.json)
defines package allowlists and freezes the exact, expiring exceptions. Its
[checker](../tooling/architecture-boundaries.ts) validates them. Read those
artifacts for current exception facts and removal ownership; do not duplicate
them in prose.

### Where domain purity actually landed

`packages/domain` depends only on `@pest-patrol/types`, and
`pnpm architecture:check` records **zero exceptions**. It took three slices, and
the order was forced rather than chosen.

CR03 declared and guarded the seam between pure policy and adapter
orchestration, in [`module-roles.json`](../packages/domain/module-roles.json).
It could not remove the coupling, because the orchestration had nowhere to go
until `packages/application` existed and CR04 creates it.

CR04 lifted 88 declarations through that seam — 21% of what those modules
export, since the seam runs *inside* modules rather than between them. That move
created a second forbidden edge rather than resolving one: the use cases still
called adapters, and this package may not depend on `api-client`. CR04 recorded
it as debt with an owner and a deadline.

CR05 paid it, by putting ports between them. It also absorbed `offlineSync`,
which CR04 had deferred to CR06 as a `sync` concern. That reading was right
about ownership and wrong about ordering: `api-client -> application` plus the
surviving `domain -> api-client` closes a cycle, so CR05 could not complete
while any domain module still reached an adapter.

CR06 relocated the durable queue from `packages/application` into
`packages/sync` using those ports — a move, not another extraction. Both files
travel byte-identical apart from one import line each, which rename-detected
diff statistics show directly. `packages/sync` depends on `application`,
`domain` and `types`; it never needs `api-client`, which is why this move became
possible only after CR05 put the queue behind `OfflineSyncPort`.

The relocation inherited a test suite that covered per-action mapping and
backoff, and left four of the six dimensions above unaddressed: it never crossed
a restart, never drove the plural entry point the mobile store calls, and never
asserted that a replay is the same logical write as the attempt it repeats.
CR06 added those, and required each to fail against an injected fault before
recording it as covered.

### The queue's action decides its payload

`OfflineQueueAction` and the seven `*QueuePayload` envelopes used to be two
independent lists that happened to line up, and `OfflineQueueItem` defaulted its
payload to `Record<string, unknown>`, so nothing checked that an item's payload
suited its action. CR07 replaced the standalone action union with
[`OfflineQueuePayloadByAction`](../packages/types/offlineQueue.ts), a total map
from action to envelope, and derived the action union from its keys. The item
and input types distribute over the action, so the pairing is now a compile
error rather than a convention.

Two consequences worth naming. The generic parameter's meaning changed from
payload to action, which is why every call site moved even though no behaviour
did. And `getOfflineQueueItemLabel`'s map, which covered five of seven actions
with the other two subtracted by hand through `Exclude<…>` and re-attached at
the call site, is now total: a newly added action fails to compile where the
labels live instead of rendering `undefined`.

CR07 changed no behaviour by design. `apps/mobile` still reads its persisted
queue straight into `OfflineQueueItem[]` without validating it — a cast that was
unsound before this slice and is no more sound after it. What changed is that
there is now a mapping to validate against, and CR09 owns doing so.

### The queue acts on what a failure meant

CR04 defined conflict and terminal-failure semantics in
[`mutationOutcome.ts`](../packages/application/mutationOutcome.ts) and nothing
consumed them; CR05 and CR06 each declined to wire them, correctly, because a
behavioural change on top of a move makes a regression unattributable. CR19
wired them.

The queue used to count attempts and treat every thrown value alike, so a write
the provider will never accept was retried as often as one that failed because
a tunnel dropped. Adapters in `packages/api-client` now map a provider failure
onto a `MutationFailureReason` and throw a `MutationFailure` carrying it;
`packages/sync` resolves that into an outcome and records it on the item. A
conflict or a terminal reason stops the queue immediately rather than spending
the remaining budget, which makes a failure the technician has to act on surface
sooner even though the budget itself rose from three attempts to five.

Three consequences worth naming. The budget was previously declared twice, at
five in the policy and three in the queue, and no test observed the
disagreement because every one passed `maxAttempts` explicitly; the policy is
now the only declaration. `MutationFailureReason` and `MutationOutcomeKind` live
in `packages/types` rather than `packages/application`, because
`OfflineQueueItem` records the outcome and `packages/types` may depend on
nothing. And the outcome is stored on the item rather than in the process
summary, because the mobile store persists the items and discards the summary,
so an outcome kept only there would not survive a restart.

`packages/api-client` is the only module allowed to know what a PostgREST code
means, and one case is uncomfortable there. `update_assigned_job_status`
enforces its precondition with a bare `raise exception`, which arrives as
SQLSTATE `P0001` carrying only message text, so a lost race is told apart from
an invalid intent by matching an English string. The fragility is confined to
the package that is permitted to know about the provider, and the queue never
sees it. Removing it means giving those RPCs distinct SQLSTATEs, which is a
database migration that no rebuild node currently owns.

### Provider selection is only half real until CR09

`packages/api-client/supabase.ts` creates a client at import time from
environment variables. Of its adapters, those that accept a client are genuinely
selected at a composition root; the rest close over that singleton, so their
"selection" is nominal. Removing it is a CR09 deliverable, and until then this
distinction is a recorded limitation rather than an oversight.

Use the [controlled rebuild runbook](rebuild/README.md) for scheduler,
lifecycle, verification, and publication rules.
