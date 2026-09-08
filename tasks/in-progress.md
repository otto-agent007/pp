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
- CR10 (Node 24.20.0), CR11 (pnpm 12.3.4), CR12 (Next.js 16.3.4), and CR13
  (Expo SDK 54.0.37) are `done`; details are in `tasks/done.md`.
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
- CR03-CR09 follow and each need their own controller promotion decision. They
  change application code, so `pnpm architecture:check` holds their dependency
  directions honest. CR02 added the qualifier that matters for the type-level
  packages: `pnpm test` is load-bearing only where a package has runtime
  behaviour, and for one that emits nothing the real compatibility proof is
  `pnpm typecheck` across its consumers. Two debt exceptions expire inside
  these slices: `api-client-domain-manifest` in CR05 and `domain-to-api-client`
  in CR04.
- CR03 (domain purity seam) is `done`; its summary is in `tasks/done.md`.
  `packages/domain/module-roles.json` now declares 16 policy and 14
  orchestration modules and `moduleRoles.test.ts` guards the declaration.
- **CR04 was scoped on 2026-09-08 and is smaller than CR03's framing implied.**
  The 14 orchestration modules export 450 declarations, but only 98 of them —
  947 lines — reach an adapter; the other 5,542 exported lines are policy that
  stays. The seam runs inside modules, not between them, so the extraction is a
  filleting job rather than a file move.
- **CR04 cannot be a mechanical move alone.** `@pest-patrol/application` may
  depend only on `domain` and `types`, but all 98 moving functions call
  `@pest-patrol/api-client`, so relocating them creates a second forbidden edge.
  It cannot be avoided inside CR04: ports need implementations, implementations
  belong in `packages/api-client`, and that package is CR05's. So CR04 records
  an `application-to-api-client` exception expiring in **CR05**, which defines
  the ports, implements them, wires the composition roots and removes the
  exception. `AuthSupabaseClient` — `SupabaseClient` from
  `@supabase/supabase-js`, threaded through 19 signatures in 4 modules — is
  preserved through CR04 so the move stays behaviour-preserving, and retired as
  part of CR05's port work.
- Two corrections came out of that scoping. CR04 must repoint the **18 app
  files** that import a moved symbol, in the same change, because the domain
  barrel cannot re-export from `packages/application` without inverting the
  dependency — so those paths are now in CR04's ownership. And `offlineSync` is
  41% of the moving code but is a `sync` concern by `docs/architecture.md`'s own
  responsibilities, so it moves to **CR06**, which now also removes the
  `domain-to-api-client` exception. CR04 narrows that exception rather than
  removing it.
- **CR03 and CR04 were re-scoped on 2026-09-08**, because CR03's one-line
  deliverable "Pure domain package" could not be met by CR03. Fourteen of
  `packages/domain`'s thirty production modules import `@pest-patrol/api-client`
  for 80 distinct symbols — `AuthSupabaseClient` plus 79 `*Record` adapter
  functions. That is use-case orchestration, which belongs in
  `@pest-patrol/application`; but that package is created by CR04, and CR04
  depends on CR03. CR03 now records and guards the seam, and CR04 lifts the
  orchestration through it and removes the exception. Detail is in
  `docs/architecture.md`.
- The same change fixed a latent defect the re-scope surfaced: **an exception's
  removal node must own every path the exception names**, and neither removal
  node did. Promoting CR05 failed `pnpm architecture:check` with one error and
  CR09 with seventeen; both were invisible because the check only runs once the
  removal node reaches `ready`. CR04 and CR05 now own
  `tooling/architecture-boundaries.json`, and `domain-to-api-client` points at
  CR04, which owns `packages/domain`. Promoting CR04, CR05 or CR09 now passes.
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
- **CR06 and CR09 are deliberately open-ended**, not unscoped: each records the
  approval `decompose into parallel write-tasks at promotion`, and the graph
  validator already supports `kind: "task"` nodes. Do not "fix" their single
  deliverables by guessing; decompose them at promotion as recorded.
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
