# In Progress

## Controlled rebuild

- CR00 is `done` (PR [#146](https://github.com/otto-agent007/pp/pull/146),
  merge `8f1e6cc4d1ea56a360e77c8ed36ec2fe8c315df2`). The recovery PRs
  [#147](https://github.com/otto-agent007/pp/pull/147) and
  [#149](https://github.com/otto-agent007/pp/pull/149) are merged. CR08, CR16,
  and CR17 are superseded into CR09, CR15, and CR18.
- PR [#168](https://github.com/otto-agent007/pp/pull/168) re-sequenced the
  graph so the platform chain (CR10, CR11, CR12, CR13, CR14, CR15) runs
  before the CR01-CR09 architecture refactor.
- **The controlled rebuild's platform chain is closed.** CR10 (Node 24.20.0),
  CR11 (pnpm 12.3.4), CR12 (Next.js 16.3.4), CR13 (Expo SDK 54.0.37), CR14 (Expo
  SDK 55.0.31) and CR15 (Expo SDK 57.0.20) are all `done`; details are in
  `tasks/done.md`.
- CR01 (executable architecture foundation) is `done`; its summary and the
  story of the stale #148 it replaced are in `tasks/done.md`.
  `pnpm architecture:check` now guards package responsibilities and dependency
  direction on every run.
- CR02 (bounded-context shared types) is `done`; its summary is in
  `tasks/done.md`. `packages/types` is now twenty context modules behind an
  explicit re-export barrel, and `packages/types/publicSurface.test.ts` freezes
  its 175-name public surface.
- CR03 (domain purity seam) is `done`; its summary is in `tasks/done.md`.
  `packages/domain/module-roles.json` declares the seam between pure policy and
  adapter orchestration, and `moduleRoles.test.ts` guards the declaration.
- CR04 (application layer) is `done`; its summary is in `tasks/done.md`.
  `packages/application` holds the 88 declarations that reached an adapter, and
  `mutationOutcome.ts` supplies the conflict and terminal-failure semantics
  `docs/architecture.md` requires.
- CR05 (ports and adapters) is `done`; its summary is in `tasks/done.md`.
  Thirteen ports and 77 methods sit between `packages/application` and
  `packages/api-client`, **`pnpm architecture:check` reports zero exceptions**,
  and the package dependency direction matches `docs/architecture.md` exactly:
  `types` depends on nothing, `domain` on `types`, `application` on
  `domain` + `types`, `api-client` on `application` + `domain` + `types`.
- CR05 absorbed `offlineSync`, which CR04 had deferred to CR06. That was forced,
  not chosen: `api-client -> application` plus the surviving
  `domain -> api-client` closes a cycle that turbo refuses, so CR05 could not
  have completed otherwise.
- CR06 (durable queue relocation) is `done`; its summary is in `tasks/done.md`.
  The queue lives in `packages/sync`, which is now `required` rather than
  `planned`, and `pnpm architecture:check` reports 11 packages and zero
  exceptions.
- **CR19 was that slice, and it is now `done`**; its summary is in
  `tasks/done.md`. CR04's `mutationOutcome.ts` semantics had no consumer, CR05
  and CR06 each put the wiring off for the same correct reason — a behavioural
  change on top of a move makes a regression unattributable — and each recorded
  it only as a sentence, so nothing owned it and every following slice
  rediscovered it. That is the pattern the `defers` edge exists to stop.
- **The graph now refuses a deferral that is only a sentence.** A node carries
  an optional `defers: { to, summary }[]`, the validator checks the
  destination is live and not already finished, and it reads the node's own
  prose: a deliverable or approval that says work is deferred, left unwired,
  or belongs to a later slice, with no `defers` entry, is an error naming the
  sentence. Running it against the graph as it stood found exactly two, both
  real — CR05's deferred singleton removal and CR06's unwired
  `mutationOutcome` — and no false positives across nineteen nodes.
- A structural alternative was measured and rejected: flagging exported names
  with no consumer outside their package would have caught `mutationOutcome`,
  but it flags **321** names workspace-wide (250 in `packages/domain` alone,
  and 25 in the `packages/types` surface CR02 deliberately froze). A library
  exporting more than today's callers use is normal, so that check is noise
  rather than signal here.
- **CR07 (queue type boundary) is `done`**; its summary is in `tasks/done.md`.
  `OfflineQueuePayloadByAction` makes the action decide the payload, and the
  `Exclude<…>` label map that covered five of seven actions is total.
- **CR07 is the first slice in this chain whose recorded scope survived
  re-measurement unchanged.** Six in a row had found a requirement recorded
  where the enforcement never reads it; a compiled prototype found nothing to
  correct here. A clean re-measurement is now a real outcome rather than a sign
  the measurement was wrong — but it still has to be run.
- **Fix the middle of a type cascade before reading its ends as scope.** Four
  `apps/mobile` files appear to break and do not: `SyncStatusIndicator.tsx`,
  `app/index.tsx`, `useQueueSync.ts` and `JobStatusControls.tsx` all fail with
  `unknown[]` while `useOfflineQueue.ts` is still untyped, because zustand
  infers `unknown` from a store whose own state type does not compile. Widening
  ownership to cover them would have been the mistake measurement prevents.
- **The correlated-union construction needs no cast, and that was probed rather
  than assumed.** Constructing `OfflineQueueItem<TAction>` generically from a
  matching payload typechecks, a union of actions distributes through a `.map`
  call site, and a mismatched pairing is rejected. The pattern usually does need
  a cast, so a probe file settled it before any real edit.
- **A behaviour change that breaks no test is the defect, not the
  reassurance.** CR19 changed the queue's default retry budget from three to
  five and the suite stayed green, because all seven `packages/sync` tests pass
  `maxAttempts` explicitly. The budget had been declared in two places that
  disagreed and nothing observed it.
- **Measure the shape of every type a slice changes, not only the one its call
  sites pass.** CR19's re-scope cleared `apps/mobile` on the grounds that
  `useQueueSync.ts` passes an empty options object. True, and beside the point:
  the item shape changed too. Ninth instance of the recurring defect class, and
  the first this chain introduced rather than inherited.

## What is next

- **CR20 (technician RPC error codes) is `running`** (base `7f21bca`, branch
  `codex/rebuild-cr20-sqlstates-v1`). Both technician RPCs now raise an
  application code, and `packages/api-client` reads it ahead of any message.
- **The message matching was not merely fragile, it was incapable.**
  `record_assigned_job_geofence_event` raises `Assigned job geofence event is
  not allowed` for two different things — the job is not assigned to this
  technician, and the idempotent upsert matched someone else's row. Same string,
  so no matcher could ever separate them. Only a code can.
- **The mapping was also wrong.** CR19's fallback covered four messages, all
  from the status RPC. Every geofence message fell through to the `P0001`
  default of `invalid-intent`, so `Assigned job was not found` — a
  `target-missing` — was reported as an intent that could never be valid.
- **No node had ever owned a `supabase` path, and `selectVerificationGates` had
  no rule for one**, so every supabase path reported `UNMAPPED` and the first
  slice to touch a migration could not have passed its own verification. Tenth
  instance of the recurring defect class, and the second caught before
  promotion. CR20's ownership was widened to `tooling/` and `package.json`.
- **Seven of fourteen `tooling/*.test.ts` files are run by nothing.** The root
  `test` script names seven files explicitly rather than globbing, and CI runs
  no others. CR20 adopts the five that assert `supabase/`, which is what makes
  its own gate honest.
- **Two orphans are reported rather than absorbed.**
  `production-readiness-protection.test.ts` passes;
  **`owasp-api-route-inventory.test.ts` fails** — Next API routes exist that its
  inventory does not document. Neither reads `supabase/`, so neither belongs to
  CR20, and wiring in a failing test would make this slice red for a reason that
  is not its own. **The OWASP one is a real security-documentation drift and
  wants an owner.**
- **CR09 is the remaining slice**, plus CR18 as the final reconciliation. CR09
  still carries `decompose into parallel write-tasks at promotion`, and the
  validator supports `kind: "task"` nodes of which none exist yet. Its ownership
  reads `apps` alone while a deliverable removes the `supabase` singleton from
  `packages/api-client`, which is a scope defect waiting at its promotion.

## Carried forward

- CR02 added the qualifier that matters for the type-level packages: `pnpm test`
  is load-bearing only where a package has runtime behaviour, and for one that
  emits nothing the real compatibility proof is `pnpm typecheck` across its
  consumers. CR07 is the second slice to rely on it.
- **The `supabase` singleton is wrapped, not removed.**
  `packages/api-client/supabase.ts` creates a client at import time from env
  vars, so composition-root selection is genuine for the adapters that take a
  client and nominal for the 47 that close over it. **CR09 removes it**, which
  is a recorded deliverable rather than an unrecorded assumption.
- A latent defect the CR03/CR04 re-scoping surfaced, worth carrying:
  **an exception's removal node must own every path the exception names**, and
  neither removal node did. Promoting CR05 failed `pnpm architecture:check`
  with one error and CR09 with seventeen; both were invisible because the check
  only runs once the removal node reaches `ready`. Ownership was corrected on
  every affected node.
- A gap the CR06 promotion surfaced and did not close, because
  `tooling/architecture-boundaries.ts` is not CR06's to edit: the checker errors
  when a `required` package is **missing**, but says nothing when a `planned`
  package **exists**. Nothing would have caught leaving `packages/sync` marked
  `planned` after this move. It is dormant now — CR06 promoted the last
  `planned` package — and becomes live again the moment another is added.
- Known follow-up left by CR02: `packages/types` exposes no subpath entry
  points, so a consumer cannot address a context directly as
  `@pest-patrol/types/jobs`. No consumer wants to today, and supporting it
  means satisfying `tsc`, Next.js, Metro and vitest resolution. Revisit only
  when a consumer needs it.
- **A graph audit on 2026-09-08 found that `docs/architecture.md`'s evidence
  requirements were recorded nowhere the tooling reads.** The doc says CR04,
  CR05, CR06 and CR09 each *must* provide specific tests, but
  `pnpm rebuild:verify` runs only a node's declared checks, so those
  requirements had no teeth — and CR04's own deliverables, written the same
  day, omitted them.
  They are now deliverables on all four nodes.
- The same audit scoped **CR07** and **CR18**, which had no ownership and so
  could not have been promoted at all. CR07's boundary is concrete: seven
  `OfflineQueueAction` values and seven `*QueuePayload` types exist with nothing
  relating them, `OfflineQueueItem` defaults `TPayload` to
  `Record<string, unknown>`, and `packages/domain/offlineQueue.ts` hand-carves
  two actions out of its label map with `Exclude<…>`. Nothing errors when an
  eighth action is added: `tsconfig.base.json` sets `strict` but not
  `noUncheckedIndexedAccess`, so the missing label reads as `string` and
  arrives as `undefined` at runtime.
- **CR09 is deliberately open-ended**, not unscoped: it records the approval
  `decompose into parallel write-tasks at promotion`, and the graph validator
  already supports `kind: "task"` nodes. Do not "fix" its single deliverable by
  guessing; decompose it at promotion as recorded.
- A slice now needs only controller merge approval to land. Three control-plane
  changes removed the rest: PR
  [#178](https://github.com/otto-agent007/pp/pull/178) (no reconciliation PR and
  no red default branch), PR
  [#180](https://github.com/otto-agent007/pp/pull/180) (`tooling/` typechecked
  and linted), and PR [#182](https://github.com/otto-agent007/pp/pull/182)
  (source tags published automatically on merge).
- Known follow-up carried out of CR12: 16 `eslint-plugin-react-hooks` v7
  findings in `apps/web` (13 `set-state-in-effect`, 2 `purity`, 1 `use-memo`)
  are tracked warnings, not fixes. Clearing them changes component behaviour
  and belongs in its own change.
- Known follow-ups surfaced by CR13's prebuilds, both pre-existing and
  behavioural, so tracked rather than changed inside a version migration:
  `apps/mobile/app.json` declares no `ios.bundleIdentifier` or
  `android.package`, so prebuild derives the placeholders
  `com.anonymous.pest-patrol-os` and `com.anonymous.pestpatrolos`; real
  identifiers are a product and provider decision needed before any store or
  EAS build. And `userInterfaceStyle: "automatic"` is inert on Android without
  `expo-system-ui`, which is not installed — adding it would switch dark mode
  on.

## Repository security refresh (2026-09-05 to 2026-09-06)

- Dependency, CI, Dependabot, and code-audit fix PRs
  [#152](https://github.com/otto-agent007/pp/pull/152) and
  [#158](https://github.com/otto-agent007/pp/pull/158) through
  [#166](https://github.com/otto-agent007/pp/pull/166) are merged; details live
  in `tasks/done.md`. Hygiene PR
  [#167](https://github.com/otto-agent007/pp/pull/167) is merged.
- The `onlyBuiltDependencies` follow-up is **done**, under pnpm 12's name for
  it: `pnpm-workspace.yaml` sets `allowBuilds` for `esbuild` and
  `unrs-resolver`. `sharp` needs no entry — it ships prebuilt `@img/*` binaries
  and resolves at 0.35.4 through the `next>sharp` override.
- Deferred follow-ups: enforcing CSP after collecting reports from
  `/api/csp-report`; Supabase leaked-password protection (paid plan);
  an operator-assisted
  preview smoke run of the new RLS policies and triggers; adding the CodeQL
  check to the `main` ruleset (needs an operator).
