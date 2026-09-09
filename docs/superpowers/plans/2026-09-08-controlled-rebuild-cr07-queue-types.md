# CR07 Queue Type Boundary Plan

**Goal:** make the offline queue's action decide its payload, so the seven
`OfflineQueueAction` values and the seven `*QueuePayload` envelopes stop being
two independent lists that happen to line up.

**Controlled rebuild:** node `CR07` in `docs/rebuild/graph.json`. Base:
`8973697f2e70b1d5c5cd1b9dab0a2dbba2fcb0a8`. Branch:
`codex/rebuild-cr07-queue-types-v1`.

**Approvals:** the controller scoped CR07 on 2026-09-08 as types only. The
unchecked cast in the mobile store's `hydrate` stays, and validating the
persisted queue is CR09's, so this slice changes no behaviour.

## What re-measurement found before any type changed

CR07 was scoped from measurement on 2026-09-08 and re-measured here with a
compiled prototype, because every slice in this chain so far has had a
requirement recorded where the enforcement never reads it. This is the first one
whose recorded scope survived that check intact.

| | |
|---|---|
| Actions, payload envelopes | 7 and 7, with nothing relating them |
| `OfflineQueueItem` payload | `TPayload = Record<string, unknown>` by default |
| Label map coverage | 5 of 7, the other 2 carved out by hand with `Exclude<…>` |
| Production files that must change | **5**, all owned |
| Test files whose fixtures must change | **6**, all owned |
| Casts needed in production code | **0** |

**The recorded ownership is exactly right — including where it looks wrong.**
A first prototype showed four further `apps/mobile` files failing to compile:
`SyncStatusIndicator.tsx`, `app/index.tsx`, `useQueueSync.ts` and
`JobStatusControls.tsx`. None of them needs to change. Every one of those errors
was `unknown[]`, cascading from `useOfflineQueue.ts` while its own store type was
still broken; once the store is typed they compile untouched. Widening ownership
to cover them would have been the mistake the measurement was meant to prevent.

**The escape hatch is needed exactly twice, as recorded, and in two packages.**
`packages/domain/offlineQueue.test.ts` builds an input with no payload at all, to
prove `createOfflineQueueItem` rejects it. `packages/sync/durability.test.ts`
builds a `form_submission_create` item whose payload is missing its required
fields, to prove the queue fails it without spending the retry budget. Both
guards stay load bearing precisely because CR09 has not yet validated the
persisted queue. They cannot share one builder without making a test fixture part
of a cross-package contract, so each package names its own and says why.

## Steps

### 1. Let the action carry the payload

Replace the standalone action union with `OfflineQueuePayloadByAction`, a total
map from action to payload envelope, and derive `OfflineQueueAction` from its
keys. `OfflineQueueItem` and `OfflineQueueInput` become distributive over the
action rather than generic in the payload, so the type parameter's meaning
changes from *payload* to *action*. Add the map to the barrel and to
`publicSurface.test.ts`, which CR02 froze at exact equality: 175 names to 176.

### 2. Follow it through the consumers

Rename the generic parameter at all 22 sites in `packages/domain`,
`packages/application` and the mobile store, and retire
`type MobileOfflinePayload = Record<string, unknown>`. No cast is required
anywhere in production code — the correlated construction typechecks as written,
and a mismatched action/payload pair is rejected. Both were proved by probe
before the change was made.

### 3. Retire the `Exclude<…>` label map

`queueActionLabels` covered 5 of 7 actions, with `geofence_event_create` and
`arrival_notification_create` subtracted by hand and re-attached through a
conditional chain at the call site. A newly added action would have compiled and
produced `undefined` as its label. The map now spans every action, holding either
a fixed string or a function of *that action's* payload, so a new action is a
compile error where the labels live.

### 4. Correct the fixtures, and keep the deliberate violations visible

27 fixture errors across 6 test files, all of them payloads that stood in
`{ job_id }` for an action that requires more. Where a test names one action, the
payload is completed inline so the intent stays local. Where a test maps *across*
actions — `jobs.test.ts` and `JobStatusControls.test.tsx` both build one item per
action — a generic per-action fixture supplies the payload, because a single
object literal over a union of actions loses the correlation the change exists to
create.

## What CR07 deliberately does not do

**It does not validate the persisted queue.** `apps/mobile`'s `hydrate` still
reads storage straight into `OfflineQueueItem[]` without checking it. That cast
was unsound before this slice and is no more sound after it; what changes is that
there is now a mapping to validate *against*. Doing it here would change
behaviour on a restart holding a stale item, which is not a types-only change.
CR09 owns it, and the node records the deferral as a graph edge.

**It does not wire `mutationOutcome` into the queue.** That is CR19's.
