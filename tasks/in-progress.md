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

- **CR20 (technician RPC error codes) is `done`**; its summary is in
  `tasks/done.md`. Both technician RPCs raise an application code, and
  `packages/api-client` reads it ahead of any message.
- **CR09 has been decomposed into CR09A and CR09B**, the first `kind: "task"`
  nodes this graph has ever carried, under its standing approval `decompose into
  parallel write-tasks at promotion`. CR09 itself is `superseded`: it ships no
  pull request of its own, and leaving it `planned` would block CR18 forever.
  These two and CR18 are all that remain open.
- **CR09A is running, and implemented.** It owns `apps/web` and
  `packages/api-client`: the module-level `supabase` client is gone, every
  record function and adapter factory takes its client as a required argument,
  `apps/web/lib/supabase-browser.ts` is the browser composition root supplying
  it at all eighteen adapter constructions, and the package's public surface no
  longer re-exports a client.
- **CR09A's ownership also names `tooling/compliance-ingest.ts` and
  `docs/architecture.md`**, both measured from the diff rather than assumed. The
  ingest script passes a possibly-undefined client into three api-client
  functions, which only type-checked while those functions had a fallback; the
  architecture document recorded the limitation this task removes.
- **CR09A guards the removal rather than describing it.**
  `packages/api-client/supabase.test.ts` fails if any module in that package
  constructs a client, if the package exports a client-valued binding, or if an
  adapter factory defaults its client again — `Function.length` drops to 0 when
  it does. `apps/web/lib/supabase-browser.test.ts` fails if a browser adapter is
  built with anything but the composition root's client, if a second browser
  client appears, or if server code imports the browser's. Both were proved to
  fire by injecting the regression they describe.
- **CR09B owns `apps/mobile` and `packages/domain`:** the real composition-root
  integration test `docs/architecture.md` requires, terminal-failure visibility
  and user recovery, and CR07's persisted-queue validation.
- **The split is by application because ownership does not overlap**, which is
  what lets two write tasks run at once. The re-measurement on `f069e65` found
  the singleton confined to `packages/api-client` and `apps/web`; all four
  `apps/mobile` stores already pass `mobileSupabase`.
- **The scope defect recorded against CR09 is resolved by the split**, not by
  widening it: CR09's ownership read `apps` alone while a deliverable reached
  `packages/api-client`.
- **CR09A must name `pnpm typecheck` in its `checks` explicitly.**
  `selectVerificationGates` maps `packages/**` and `apps/**` to `pnpm test`
  only, and turbo's `test` task does not depend on `typecheck`, so a change of
  87 signatures would otherwise be gated by no compiler at all.

## Open items that no node owns

Both of the items recorded here were closed on 2026-09-09.

- **The orphaned tooling tests are fixed.** The root `test` script named twelve
  files explicitly, so `owasp-api-route-inventory.test.ts` and
  `production-readiness-protection.test.ts` were run by nothing and any future
  one would be too. It now runs `vitest run --dir tooling`, which scans the
  directory: 14 files, 270 tests. `vitest run "tooling/*.test.ts"` does **not**
  work — vitest treats positional arguments as substring filters rather than
  globs, so it matches nothing and exits 1 — and an unscoped `vitest run` would
  collect every workspace test `turbo test` already owns in the same script.
- **The OWASP inventory failure was real drift, and was one route.**
  `/api/csp-report` existed with no row. It is the repository's only
  deliberately unauthenticated route and its only one with no route-level rate
  limit, so the API2 and API4 control notes each gained a clause rather than
  letting the table imply coverage the prose denies. The `/api/transcribe` and
  `/api/whisper-health` rows are not stale: they are `next.config.ts` rewrites,
  and the test only checks routes against the document.

## Carried forward

- CR02 added the qualifier that matters for the type-level packages: `pnpm test`
  is load-bearing only where a package has runtime behaviour, and for one that
  emits nothing the real compatibility proof is `pnpm typecheck` across its
  consumers. CR07 is the second slice to rely on it.
- **The `supabase` singleton is removed, not merely wrapped.** CR05 wrapped it
  and recorded that CR09 would take it out; CR09A did. `supabase.ts` no longer
  creates a client at import time and carries only the client type, so
  composition-root selection is genuine for every adapter rather than for the
  ones that accepted a client. The shape it removed, measured on 2026-09-09: 87
  exported functions reached it, 27 taking no client at all and 60 taking it as
  a default parameter value, which is what CR05's wrap left behind.
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
- **A running write task used to answer for nothing.** `kind: "task"` was valid
  in the graph validator from the start, and it even forbids two running tasks
  from owning overlapping paths, but every enforcement in
  `tooling/rebuild-graph-reconcile.ts` asked for `kind === "slice"`. So a
  running task passed reconciliation with no ownership boundary, no
  pull-request state and no base-SHA ancestry. This is the eleventh instance of
  the recurring defect class and the first that would have *removed* a gate
  rather than failed to add one, and it was found while preparing exactly the
  decomposition that would have tripped it.
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
