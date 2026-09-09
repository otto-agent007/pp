# CR19 Mutation Outcome Wiring Plan

**Goal:** make the durable queue act on what a failure *meant* rather than on
how many times it has happened, by consuming the conflict and terminal-failure
semantics CR04 defined and nothing has used since.

**Controlled rebuild:** node `CR19` in `docs/rebuild/graph.json`. Base:
`374c6ec6640bfffcaacc155568d2382be678637c`. Branch:
`codex/rebuild-cr19-outcomes-v1`.

**Approvals:** the controller made three decisions on 2026-09-09 — the failure
channel is a typed rejection, the retry budget is five, and the resolved outcome
is recorded on the item as a `MutationOutcomeKind`.

## What measurement found

| | |
|---|---|
| `mutationOutcome.ts` consumers | **0** outside its own barrel re-export |
| Duplicated failure blocks in `offlineSync.ts` | **7**, one per action |
| Retry budgets declared | **2**, disagreeing: policy 5, queue 3 |
| Existing tests pinning the queue's default budget | **0** — every one passes `maxAttempts` explicitly |

The third and fourth rows are the same finding twice. The budget was declared in
two places that disagreed, and no test observed the disagreement, so changing
either number would have been silent.

**`packages/types` cannot import the outcome union.**
`tooling/architecture-boundaries.json` gives it an empty allowlist, so recording
an outcome on `OfflineQueueItem` forces `MutationFailureReason` and
`MutationOutcomeKind` to move there, with `packages/application` importing them
back. Verified against the policy rather than assumed.

**The ownership correction this slice made to itself.** The re-scope concluded
`apps/mobile` needed no ownership, having measured that `useQueueSync.ts` passes
an empty options object so an options-shape change cannot reach it. That was
true and beside the point: the *item* shape changed too, and
`JobStatusControls.test.tsx` builds queue items directly. Ownership was widened
during implementation. Ninth instance of the recurring defect class, and the
first one this chain introduced rather than inherited.

## Steps

### 1. Relocate the vocabulary, add the field

`MutationFailureReason` and `MutationOutcomeKind` move to
`packages/types/mutationOutcome.ts`; `packages/application` imports and
re-exports them so callers still read the semantics from one place.
`OfflineQueueItem` gains `outcome: MutationOutcomeKind | null`. The frozen
public surface goes 176 names to 178.

### 2. Give the reason a way across the port

`MutationFailure`, an error carrying a `MutationFailureReason`, defined in
`packages/application`. `OfflineSyncPort`'s seven signatures do not change, so
the test stubs and the mobile composition root are untouched. An error that is
not a `MutationFailure` resolves to `provider-unavailable` — retryable — because
an unmapped failure means an adapter has not been taught the case, not that the
write can never apply.

### 3. Interpret the provider where that is allowed

`packages/api-client/mutationFailures.ts` maps SQLSTATE, PostgREST codes and
HTTP status onto reasons, and `createOfflineSyncAdapter` wraps all seven methods.
This is the only module in the workspace that knows what a PostgREST code looks
like.

### 4. Collapse seven failure blocks into one

Each `process*QueueItem` becomes a call to one shared helper. The retry decision
moves to `resolveMutationOutcome`, so a conflict or a terminal reason stops the
queue at once instead of spending the remaining budget. `offlineSync.ts` goes
484 lines to 361.

### 5. Prove every new assertion fires

Eight injections, each required to produce a named failure: the local budget of
three restored, the terminal short-circuit replaced by budget-spending, an
unmapped error made terminal, the outcome no longer recorded, a normalize failure
routed through the budget, a fresh id minted on retry, the `P0001` message
matching dropped, and the adapter wrapper made a passthrough.

## A limitation this slice records rather than fixes

`update_assigned_job_status` enforces its precondition with a bare
`raise exception`, which reaches the client as SQLSTATE `P0001` carrying only
message text. So the distinction that matters most — a transition another device
already made, versus an intent that was never valid — is recoverable only by
matching an English string. That matching lives in `packages/api-client`, where
provider knowledge belongs, so the queue is unaffected. Removing the fragility
means giving those RPCs distinct SQLSTATEs, which is a database migration, and
no node owns `supabase/`.
