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
- **CR06 (durable queue relocation) is `running`** on
  `codex/rebuild-cr06-sync-v1`. It moves `offlineSync.ts` and its test from
  `packages/application` into `packages/sync`, byte-identical apart from one
  import line each, and promotes `packages/sync` from `planned` to `required`
  in the boundary policy. One app consumer changes,
  `apps/mobile/src/store/useQueueSync.ts`, importing one symbol.
- CR06 measurement found the **sixth** instance of the recurring defect class,
  and the first a gate would have caught unaided: the node owned
  `apps/mobile/src/store/useQueueSync.ts` but not `apps/mobile/package.json`,
  and a source import with no matching manifest dependency is a
  `missing-manifest-dependency` violation. Ownership was corrected before the
  move. It also found that four of the six test dimensions
  `docs/architecture.md` requires of CR06 were unaddressed by the suite it
  inherited; `packages/sync/durability.test.ts` covers them, and each assertion
  was proved by injecting a fault that makes it fail.
- **Deliberately not in CR06:** CR04's `mutationOutcome.ts` retry-budget and
  terminal-failure semantics are still unused, and the queue is their natural
  consumer. Wiring them in is behavioural change on top of a move, so it gets
  its own slice where a queue regression stays attributable.
- CR07, CR09 and CR18 remain, and each needs its own controller promotion
  decision. CR02 added the qualifier that matters for the type-level packages:
  `pnpm test` is load-bearing only where a package has runtime behaviour, and
  for one that emits nothing the real compatibility proof is `pnpm typecheck`
  across its consumers.
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
  two actions out of its label map with `Exclude<…>`, which silently omits any
  action added later.
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
