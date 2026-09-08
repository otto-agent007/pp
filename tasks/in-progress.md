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
- CR05-CR09 follow and each need their own controller promotion decision. They
  change application code, so `pnpm architecture:check` holds their dependency
  directions honest. CR02 added the qualifier that matters for the type-level
  packages: `pnpm test` is load-bearing only where a package has runtime
  behaviour, and for one that emits nothing the real compatibility proof is
  `pnpm typecheck` across its consumers. Two debt exceptions expire inside
  these slices: `api-client-domain-manifest` in CR05 and `domain-to-api-client`
  in CR06.
- CR03 (domain purity seam) is `done`; its summary is in `tasks/done.md`.
  `packages/domain/module-roles.json` now declares 16 policy and 14
  orchestration modules and `moduleRoles.test.ts` guards the declaration.
- CR04 (application layer) is `done`; its summary is in `tasks/done.md`.
  `packages/application` now holds the 88 declarations that reached an adapter,
  `packages/domain` has one orchestration module left, and `mutationOutcome.ts`
  supplies the conflict and terminal-failure semantics `docs/architecture.md`
  requires.
- CR05 (ports and adapters) is `running` on `codex/rebuild-cr05-ports-v1`,
  draft PR [#195](https://github.com/otto-agent007/pp/pull/195), awaiting
  controller merge approval. Thirteen ports and 77 methods now sit between
  `packages/application` and `packages/api-client`, and
  **`pnpm architecture:check` reports zero exceptions** for the first time since
  CR01 recorded them.
- **The dependency direction now matches `docs/architecture.md` exactly:**
  `types` depends on nothing, `domain` on `types`, `application` on
  `domain` + `types`, `api-client` on `application` + `domain` + `types`.
- CR05 absorbed `offlineSync`, which CR04 had deferred to CR06. That was forced,
  not chosen: `api-client -> application` plus the surviving
  `domain -> api-client` closes a cycle that turbo refuses, so CR05 could not
  have completed otherwise. CR06 is now a relocation of the durable queue from
  `packages/application` into `packages/sync` using these ports.
- Two scope corrections came out of measuring CR05. The app surface was counted
  as five composition roots and is really **twenty files**, because removing the
  exception requires *every* use case to take a port, not only the fifteen that
  threaded a client. And the `supabase` singleton means composition-root
  selection is genuine for the adapters that accept a client and nominal for the
  47 that close over it — **CR09 removes it**, which is a recorded deliverable.
- CR05-CR09 follow and each need their own controller promotion decision. They
  change application code, so `pnpm architecture:check` holds their dependency
  directions honest. CR02 added the qualifier that matters for the type-level
  packages: `pnpm test` is load-bearing only where a package has runtime
  behaviour, and for one that emits nothing the real compatibility proof is
  `pnpm typecheck` across its consumers. Two debt exceptions expire inside
  these slices: `api-client-domain-manifest` in CR05 and `domain-to-api-client`
  in CR06.
- CR03 (domain purity seam) is `done`; its summary is in `tasks/done.md`.
  `packages/domain/module-roles.json` now declares 16 policy and 14
  orchestration modules and `moduleRoles.test.ts` guards the declaration.
- CR04 (application layer) is `done`; its summary is in `tasks/done.md`.
  `packages/application` now holds the 88 declarations that reached an adapter,
  `packages/domain` has one orchestration module left, and `mutationOutcome.ts`
  supplies the conflict and terminal-failure semantics `docs/architecture.md`
  requires.
- **CR05 was scoped on 2026-09-08 and is next.** Measured: the port surface is
  **76 adapter functions and 2 provider types** across 13 application modules,
  so 13 ports, one per bounded context. Ports are passed as a parameter, so
  `signInAdmin(authPort, input)` replaces `signInAdmin(client, input)` and
  `AuthSupabaseClient` is retired from `packages/application`.
- That scoping found the ownership gap for the **third** time: CR05 must change
  the **5 app composition roots** that hold the provider client
  (`admin-auth-context.tsx`, `technician-web-auth-context.tsx`, three mobile
  stores), and owned none of them. Those paths are now in its ownership.
- **The `supabase` singleton is wrapped, not removed, in CR05.**
  `packages/api-client/supabase.ts` creates a client at import time from env
  vars, and 47 of api-client's 109 adapters use it while 62 take an injected
  client. Wrapping keeps CR05 bounded, but it means composition-root selection
  is genuine only for those 62 until **CR09** removes the singleton — which is
  now one of CR09's deliverables rather than an unrecorded assumption.
- A latent defect the CR03/CR04 re-scoping surfaced, worth carrying:
  **an exception's removal node must own every path the exception names**, and
  neither removal node did. Promoting CR05 failed `pnpm architecture:check`
  with one error and CR09 with seventeen; both were invisible because the check
  only runs once the removal node reaches `ready`. Ownership was corrected on
  every affected node, and promoting CR05, CR06 or CR09 now passes.
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
