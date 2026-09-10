# In Progress

## Controlled rebuild

**The controlled rebuild is complete.** Every live node is `done` - CR00 to
CR07, the CR09A/CR09B decomposition, the platform chain CR10 to CR15, CR19, CR20
and CR18 - and CR08, CR09, CR16 and CR17 are `superseded`. Each done node has a
published `rebuild/crNN-source` tag. Per-node summaries are in `tasks/done.md`;
the graph itself is `docs/rebuild/graph.json` and the runbook is
`docs/rebuild/README.md`.

CR18 is the final reconciliation and closed the chain. Nothing in the graph is
open, so this section carries no work. What the chain leaves behind, and what a
future node should read before adding to it, is below.

### What the chain ended with

- Eleven workspace packages, every one `required`, and **zero boundary
  exceptions**. `tooling/architecture-completion.test.ts` freezes all three
  facts, because `pnpm architecture:check` printing a zero is not the same as
  failing on a one.
- The dependency direction `docs/architecture.md` specifies, enforced rather
  than described: `types` depends on nothing, `domain` on `types`, `application`
  on `domain` + `types`, `api-client` on `application` + `domain` + `types`.
- A pinned toolchain of Node 24.20.0, pnpm 12.3.4, Next.js 16.3.4, Expo SDK
  57.0.20 and TypeScript 6, each moved by its own node with its own evidence.
- Provider selection that is real at every composition root, a durable queue
  that records what a failure meant, and a persisted queue that is checked when
  it is read back rather than cast.

### The lesson the chain kept relearning

**A requirement recorded where the enforcement never reads it.** Fourteen
instances between CR03 and CR18, and the last one was CR18's own completion
claim. The three shapes it took:

- ownership that did not cover the paths a deliverable must touch (CR03, CR04,
  CR05, CR09, CR19, CR09A, CR09B);
- a `docs/architecture.md` requirement naming no node, so `pnpm rebuild:verify`
  - which runs only a node's declared checks - could never enforce it;
- a check that reports a fact without failing on it (CR06's `planned` package,
  CR18's exception count).

**Before promoting any node, diff its deliverables against
`docs/architecture.md` and against what its ownership actually permits, and ask
of every guard whether it fails or merely prints.** Three of the last four
instances were caught before promotion rather than during it, which is the only
reason they cost measurement time instead of a re-scope.

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
- **The gap CR06's promotion surfaced is closed by CR18.** The checker errored
  when a `required` package was **missing** and said nothing when a `planned`
  package **existed**, so nothing would have caught leaving `packages/sync`
  marked `planned` after that move. CR06 could not close it -
  `tooling/architecture-boundaries.ts` was not CR06's to edit - and it sat here
  unowned until the completion node took it. The mirror rule now reports
  `planned package X exists at Y and must be required`.
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
  could not have been promoted at all. Both have since run. CR07's boundary was
  concrete: seven
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
