# CR02 Bounded-Context Shared Types Plan

**Goal:** split `packages/types/index.ts` into twenty bounded-context modules
and keep the root entry as a compatibility barrel, without changing any type's
shape or any consumer file.

**Controlled rebuild:** node `CR02` in `docs/rebuild/graph.json`. Base:
`47fdc35ae0169d0c2c88cd399626794682fd230a`. Branch:
`codex/rebuild-cr02-types-contexts-v1`. Design:
[CR02 Bounded-Context Shared Types Design](../specs/2026-09-08-controlled-rebuild-cr02-types-contexts-design.md).

**Approvals:** promotion pending. The controller approves the written
specification before implementation; merge and the `rebuild/cr02-source` tag
remain controller-approved gates per `docs/rebuild/README.md`. The tag is now
published automatically by the `Rebuild source tag` workflow on merge (PR #182).

**Predecessor:** CR01 is already reconciled as `done` on `main` by PR #185, so
unlike CR13 through CR15 this slice's first commit carries no reconciliation.
CR02's first commit is its implementation.

## Why this slice is different from the last six

CR10 through CR15 were version migrations: the risk lived in third-party
toolchains and the gates that mattered were `pnpm build` and the Expo
prebuilds. CR02 changes first-party source for the first time since CR01, and
it changes the one package everything else depends on.

The compensating fact is that `packages/types` is entirely type-level — 175
`export type` and `export interface` declarations, no runtime values at all —
so the package emits nothing and every import of it is erased. There is no
behavioral surface to regress. The whole risk is "did a declaration go missing
or land in the wrong place", which is exactly what the compatibility guard and
`pnpm typecheck` across 124 consumer files answer.

## The partition was derived, not chosen

Before writing any module, the cross-reference graph between all 175
declarations was extracted from the source and used to place them. That order
matters: three groupings that look obvious from the names produce module cycles,
and the reference graph is what exposes them. The design document records all
three — invoices with payments, the `Job*` commercial vocabulary with the
service catalog, and provider readiness as its own module.

The resulting twenty-module graph was checked for cycles mechanically and is
acyclic, with seven dependency-free modules at the base.

## Steps

### 1. Branch and modules

Cut `codex/rebuild-cr02-types-contexts-v1` from
`47fdc35ae0169d0c2c88cd399626794682fd230a`.

Create the twenty context modules listed in the design's partition table, each a
flat `*.ts` beside `index.ts`. Move each declaration **byte-identical**,
including its doc comments and its blank-line separation. Add the cross-context
`import type { … } from "./module"` statements the design's graph requires, and
nothing else.

Every module keeps its declarations in the relative order they had in
`index.ts`. That keeps `git diff --find-copies-harder` able to show the hunks as
moves and keeps the review honest.

### 2. Barrel

Rewrite `index.ts` as explicit `export type { … } from "./module"` statements,
one block per module, modules in alphabetical order and names alphabetical
within each block. No `export *`: the public surface stays reviewable in one
file, matching `packages/domain/index.ts`.

The file ends with 175 re-exported names and no declarations of its own.

### 3. Compatibility guard

Add `packages/types/publicSurface.test.ts`, the package's first test, using the
TypeScript compiler API to read the source text rather than importing the types
(type-only exports are invisible to `typeof import`).

Three assertions:

- the barrel's exported name set equals the frozen 175-name list;
- the context modules' export sets are pairwise disjoint;
- their union equals the barrel's set.

Add `"test": "vitest run"` to `packages/types/package.json` scripts, matching
`packages/domain`. This is what puts the package into `pnpm test`'s turbo graph;
without it the guard would exist but never run.

**Prove the guard fires.** Per the runbook lesson from CR13, a gate wired in but
never invoked looks identical to a passing one. Both injections were run and
both failed the suite with exit code 1:

- dropping `JobMediaInput` from the barrel's `./media` re-export failed two
  assertions, naming the missing symbol and the module it belongs to;
- declaring `JobMediaType` in `inventory.ts` as well as `media.ts` failed the
  disjointness assertion with `JobMediaType is declared in both inventory.ts
  and media.ts`.

The suite returned to 4/4 green after each injection was reverted.

One implementation note the injections forced: the test resolves its own
directory from `expect.getState().testPath`, not from `import.meta.url` and not
from `process.cwd()`. The jsdom environment rewrites `import.meta.url` to a
non-`file:` document URL, and cwd differs between a root `vitest run` and the
per-project run turbo performs inside `packages/types`.

### 4. Gates

Run every declared check on the branch, in the node's order. `pnpm typecheck`
and `pnpm build` are the compatibility proof for the 124 consumer files;
`pnpm architecture:check` proves the split reached for no new workspace
dependency, since `@pest-patrol/types` has an empty allowlist.

### 5. Promotion and verification

Push, open the **draft** PR, then the promotion commit: status `running`,
`baseSha`, `branch`, `pr`, ownership covering every path changed since baseSha,
deliverables, the exact check commands, approvals, and approval plus github
evidence. `target` stays `null` — CR02 migrates no third-party version, so
there is no version constraint to freeze.

Push the promotion, then run `pnpm rebuild:verify` on a clean worktree — it
reports `MISSING` for every gate if anything is uncommitted — and record the
`command` evidence bound to a commit in the PR's own set, never the baseSha.

Stop for controller merge approval.

## Ownership

```text
docs/rebuild/graph.json
docs/superpowers/plans/2026-09-08-controlled-rebuild-cr02-types-contexts.md
docs/superpowers/specs/2026-09-08-controlled-rebuild-cr02-types-contexts-design.md
packages/types/*.ts
packages/types/package.json
packages/types/tsconfig.json
pnpm-lock.yaml
tasks/in-progress.md
```

### Two corrections to this plan, found by running the gates

This plan originally claimed the slice would touch neither
`packages/types/tsconfig.json` nor any dependency. Both were wrong, and
`pnpm typecheck` is what said so.

**The package needs `"types": ["node"]`.** The guard reads source text, so it
imports `node:fs` and `node:path`, and `tsc` would not resolve `@types/node`
without the explicit `types` field — `pnpm-workspace.yaml` relocates the real
store to `<root>/.pnpm`, which the default type-root walk never reaches. Both
`packages/api-client/tsconfig.json` and `tsconfig.tooling.json` already carry
the identical field for the same reason, so this follows the repository's
existing shape rather than inventing one.

**`@types/node` becomes a devDependency of the package,** at `^24.13.3`, the
version the root, `apps/web`, and `packages/api-client` already pin. It is
already resolved in the lockfile, so the change is three lines: a new importer
entry, not a new package. `packages/types` still ships no runtime code and no
runtime dependency.

## What this slice does not touch

No consumer file, no other package, no runtime dependency, and neither recorded
boundary exception — `api-client-domain-manifest` still expires in CR05 and
`domain-to-api-client` in CR09. If any consumer edit turns out to be required,
that is a finding to report before proceeding, not a change to absorb: it would
mean the barrel is not actually compatible. None was.

## Follow-ups this slice deliberately leaves

- **Subpath entry points.** Consumers could address a context directly as
  `@pest-patrol/types/jobs`, but no consumer wants to today and it would mean
  satisfying `tsc`, Next.js, Metro, and vitest resolution for zero present
  benefit. The design records the reasoning. Revisit when a consumer needs it.
- **`packages/domain`'s own shape.** It is already multi-file, but its modules
  were not derived from a context partition. Whether it should be realigned to
  CR02's contexts belongs to CR03, which owns that package.
