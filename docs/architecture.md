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
package boundaries or fakes where needed. CR09B (`apps/mobile`,
`packages/domain`) must provide the real `apps/mobile` composition-root
integration through durable enqueue, optimistic projection, restart, sync,
adapter/provider acknowledgment, plus a terminal-failure visibility and
user-recovery interaction test. That requirement was CR09's until 2026-09-09,
when CR09 was decomposed into the write tasks CR09A and CR09B; it is named
against the task that owns the paths so it stays reachable from a node.

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

CR07 changed no behaviour by design. It left `apps/mobile` reading its persisted
queue straight into `OfflineQueueItem[]` — a cast that was unsound before that
slice and no more sound after it — because what the slice produced was a mapping
to validate against. CR09B does the validating.

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
means. CR19 left one uncomfortable case there and CR20 closed it: both
technician RPCs raised bare exceptions, arriving as SQLSTATE `P0001` with only
message text, so a lost race was told apart from an invalid intent by matching
an English string — and two different geofence failures could not be told apart
at all, because they raise the same sentence.

Both RPCs now raise an application code: `PP400` invalid-intent, `PP401`
unauthorized, `PP404` target-missing, `PP409` precondition-conflict. Class `PP`
is unused by PostgreSQL, whose PL/pgSQL codes are class `P0`, and is not one of
the `PT` codes PostgREST reinterprets as an HTTP status. The client reads the
code first and falls back to matching text only for a database that has not yet
applied the migration, since an app and a database deploy independently. That
fallback is a compatibility path rather than the mechanism, and its removal is
not scheduled, because the condition for removing it — no client older than the
migration still running — is not observable from this repository. The migration
changed no message, so the other skew direction needs nothing.

### Provider selection is real at every composition root

CR09A removed the client `packages/api-client/supabase.ts` used to create at
import time from environment variables. Until then, adapters that accepted a
client were genuinely selected at a composition root and the rest closed over
that singleton, so their "selection" was nominal — an `apps/web` limitation,
because `apps/mobile` already passed its own client everywhere, while the web
auth contexts imported the singleton and passed it back in and the hooks passed
nothing at all.

Every record function and every adapter factory now takes its client as a
required argument, and `apps/web/lib/supabase-browser.ts` is the browser
composition root that supplies it — the web counterpart of
`apps/mobile/src/lib/supabase.ts`. API routes are unaffected: they already built
a per-request client bound to the caller's token or to the service role.

This is enforced rather than described. `packages/api-client/supabase.test.ts`
fails if any module in that package constructs a client, if the package exports
a client-valued binding, or if an adapter factory defaults its client again;
`apps/web/lib/supabase-browser.test.ts` fails if a browser adapter is built with
anything but the composition root's client, if a second browser client appears,
or if server code reaches for the browser's.

### A queue read back from a device is checked, and nothing is dropped

CR09B replaced that cast with
[`reviewPersistedOfflineQueue`](../packages/domain/offlineQueue.ts), which reads
each stored entry through its own action's payload normalizer — the same
normalizer `packages/sync` applies before sending — so a payload the domain
would refuse at the provider is refused when the device is read instead.

Nothing is dropped, which is the part that constrains the design. An entry that
survives validation is a queue item. An entry that does not is returned as a
`RejectedOfflineQueueEntry` carrying the record exactly as it was stored, with
the `status` and `outcome` a terminal sync failure carries, and the mobile store
persists it back untouched on every write. It is not typed as a queue item: an
unvalidated payload in that slot would be the cast this validation exists to
remove. A damaged envelope is the third case — the values are readable enough to
show and not trustworthy enough to send, so the item is kept and marked terminal
rather than repaired quietly. A field that is simply absent takes its default,
because the record grows over time and an item queued before CR19 added
`outcome` must survive the upgrade that finds it.

Both meet the technician in one place. `SyncStatusIndicator` lists queue items
the queue has stopped working on beside entries the validation refused, each
with what happened to it and a `Discard` control, and `discardQueueItem` refuses
to remove anything the queue is still working on. This is also the first thing
to read CR19's `outcome`: a conflict tells the technician the office or another
device got there first, a terminal failure tells them to redo the work, and
before this the screen showed one "failed" count for both.

Use the [controlled rebuild runbook](rebuild/README.md) for scheduler,
lifecycle, verification, and publication rules.
