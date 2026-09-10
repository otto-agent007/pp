# CR09B Queue Validation and Recovery Plan

**Goal:** make the mobile composition root's queue path something a test
actually exercises end to end, stop reading the persisted queue back with an
unchecked cast, and give a technician a way out of work the queue has stopped
trying to send.

**Controlled rebuild:** node `CR09B` in `docs/rebuild/graph.json`, the second
`kind: "task"` node and the last open one before CR18. Base: `6a2305c`. Branch:
`codex/rebuild-cr09b-queue-recovery-v1`.

**Approvals:** decomposed from CR09 on 2026-09-09 (PR #208) and re-scoped from
measurement on `329dbc3` (PR #212). The re-scope settled three things: the
validator lives in `packages/domain`, an item that fails validation is kept and
marked terminal rather than dropped, and `checks` must name `pnpm typecheck`
explicitly — the only thing tying the `es` translations to `en` is two
assignments in `useLanguage.test.ts`, so the compiler is the sole reader of that
parity and `pnpm test` passes with a key missing from `es`.

## What was actually there

Measured on `6a2305c`:

- **`useOfflineQueue.hydrate()` set state from `JSON.parse(value) as T`.**
  Whatever the device held became the queue, unchecked, even though CR07 had
  built the action-to-payload mapping to check it against.
- **`outcome` had one occurrence in `apps/`** — a fixture in
  `JobStatusControls.test.tsx`. CR19 recorded on every item whether a failure
  was a lost race or something no retry can fix, and the screen showed one
  "failed" count for both.
- **No per-item recovery existed.** `clearSynced` removes only `synced` items,
  so an item the queue had stopped retrying stayed in the queue with no
  technician-facing way out.
- **No test covered the composition root.** There was no `useQueueSync.test.ts`,
  `MobileHomeScreen.test.tsx` held one test, and `SyncStatusIndicator.test.tsx`
  mocks every store it reads.

## Steps

### 1. Validate the persisted queue in `packages/domain`

`reviewPersistedOfflineQueue` reads each stored entry through its own action's
normalizer — the same one `packages/sync` applies before sending, reached
through a table that is total over `OfflineQueueAction`, so a new action is a
compile error rather than an entry that validates by default.

Three outcomes, and the third is what the shape of the result is for. A valid
entry is a queue item. An entry whose payload the domain refuses, whose action
this build does not know, or which is not a record at all comes back as a
`RejectedOfflineQueueEntry`: the record exactly as stored, under the `status`
and `outcome` a terminal sync failure carries. It is deliberately not typed as a
queue item, because putting an unvalidated payload in that slot would be the
cast this task removes. An entry whose envelope is damaged is kept as an item
and marked terminal — readable enough to show, not trustworthy enough to send.

A field that is *absent* takes its default rather than counting as damage. The
record grows over time, and an item queued before CR19 added `outcome` has no
such key; treating that as damage would strand field work on the first upgrade
after it.

### 2. Persist what could not be read, rather than dropping it

The store keeps `rejected` beside `items`, and every write persists both — a
rejected entry going back byte-identical. Writing only the items would delete
the unreadable ones from the device on the next enqueue, which is exactly the
silent loss the validation exists to prevent.

### 3. Show what stopped, and let the technician end it

`getOfflineQueueRecoveryItems` puts failed items and rejected entries in one
list. `SyncStatusIndicator` renders each with its label, what its outcome means
in the technician's terms, its error, and a `Discard` control. `discardQueueItem`
refuses to remove anything the queue is still working on, so the control cannot
throw away work that was going to sync on its own.

New copy lands in both `en` and `es` under `jobs.fieldCopy.sync`.

### 4. Test the composition root for real

`useQueueSync.test.ts` mocks only the two things that genuinely are the device:
secure storage and the Supabase client `lib/supabase.ts` builds from environment
variables. The real stores, the real domain rules, the real `packages/sync`
processing and the real `packages/api-client` offline-sync adapter run between
them, so a `PP409` from the fake provider travels the whole path and arrives as
`outcome: "conflict"` on a persisted item.

## Verification

`pnpm typecheck` is named explicitly for the en/es parity reason above. The rest
are the standard gates plus the three suites this task changes.

## One thing found on the way

`normalizeJobPhotoUploadQueuePayload` and
`normalizeJobSignatureCaptureQueuePayload` built their object literal without
`file_size_bytes`, so a proof's recorded size was dropped before upload —
`packages/api-client` validates and stores it and never received one from the
queue. Left alone it would have become a regression here, because running these
normalizers over a queue read back from a device would have deleted a field the
queue was holding. Fixed with the validation rather than beside it.
