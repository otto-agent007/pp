# CR11 pnpm 12 Migration Plan

**Goal:** Move the repository's declared package manager from pnpm 9.15.4 to
the latest stable pnpm 12 patch, without changing application behavior,
Node's target (CR10), Next.js/Expo versions, migrations, providers,
environments, previews, or production.

**Controlled rebuild:** node `CR11` in `docs/rebuild/graph.json`, target
`pnpm` constraint `12`, selection `latest-stable-patch`, resolved version
`12.3.4` (2026-09-06). Base: `d7ddb8fb4b33da3311ea553bcf316ced11de879f` (CR10's
merge commit on `main`). Branch: `codex/rebuild-cr11-pnpm-12-v1`.

**Approvals:** controller approved the pnpm 12 target refresh and the CR11
start in the 2026-09-06 handoff (recorded as approval evidence on the node).
Publication is pre-approved; merge and the `rebuild/cr11-source` tag remain
controller-approved gates per `docs/rebuild/README.md`.

## Facts checked before starting

- pnpm 12 keeps `lockfileVersion: '9.0'`, so Dependabot, Vercel, and turbo all
  keep working unchanged.
- No git or tarball dependencies exist anywhere in the workspace, so
  `blockExoticSubdeps`/`minimumReleaseAge` are moot for this migration.
- `esbuild` and `unrs-resolver` are the only packages with `postinstall`
  scripts in this tree; both work correctly without running them, confirmed
  by declining both in `pnpm-workspace.yaml`'s `allowBuilds` map and running
  the full check suite.
- `pnpm lint` resolves all ESLint plugins under pnpm 12 with no hoisting
  changes needed.

## A dependency-resolution issue found and resolved during this slice

pnpm 12's peer-resolution algorithm does not preserve a lockfile's existing
per-workspace version islands the way pnpm 9 did. Before this migration,
`apps/web` (and its own dependents) resolved `react`/`react-dom` to `19.2.5`
under its own `^19.0.0` range, while `apps/mobile` and `packages/ui-native`
resolved the same range to the Expo SDK 53-verified `19.0.0`. Under pnpm 12,
a fresh non-frozen install unified these onto a single version — first
`19.2.5` everywhere, then (after an unrelated settings change forced a second
re-resolve) `19.0.0` everywhere — with no explicit lever to keep the two
workspaces on different versions, because pnpm's `overrides` apply globally
to the lockfile and cannot be scoped per workspace project.

Given that constraint, the controller decided on a uniform, deterministic
pin repo-wide rather than fighting the dedup algorithm: `pnpm-workspace.yaml`
now pins `react: 19.0.0`, `react-dom: 19.0.0`, `@types/react: 19.0.14`, and
`@types/react-dom: 19.0.2` (matching `apps/web`'s existing floor) via
`overrides`. `apps/web`'s own dependency tree has no requirement above
`react@19.0.0` (`next@15.5.25`'s peer range is `^18.2.0 || ^19.0.0`), so this
is a deliberate downgrade of `apps/web`'s live React version from `19.2.5` to
`19.0.0`, verified with a full `typecheck`/`lint`/`test`/`build` pass. This is
the one place this slice's dependency resolution changed beyond the pnpm 9→12
lockfile format migration itself.

## Tasks

- [x] Reconcile CR10 as `done` (status, `mergeSha`, evidence, task tracker).
- [x] Refresh the pnpm 12 target to the latest stable patch (`12.3.4`).
- [x] Set `package.json`'s `packageManager` to `pnpm@12.3.4`.
- [x] Move `virtual-store-dir` from `.npmrc` to `pnpm-workspace.yaml` as
      `virtualStoreDir: .pnpm`; delete `.npmrc`.
- [x] Decline `allowBuilds` for `esbuild` and `unrs-resolver` (neither needs
      its install script here).
- [x] Move `pnpm.overrides` and `pnpm.auditConfig.ignoreGhsas` from
      `package.json`'s `"pnpm"` block to `pnpm-workspace.yaml` (pnpm 12 no
      longer reads the `package.json` location); add the repo-wide React
      pins described above.
- [x] Regenerate `pnpm-lock.yaml` under pnpm 12 and confirm
      `pnpm install --frozen-lockfile` is stable across repeated runs.
- [x] Confirm `pnpm audit` and `pnpm why sharp` still check out under the
      relocated overrides/auditConfig.
- [x] Bump `pnpm/action-setup`'s `version:` input to `12.3.4` in
      `.github/workflows/ci.yml` (action itself stays SHA-pinned at `v6.0.10`).
- [x] Update the pnpm version in `README.md`.
- [x] Teach `tooling/rebuild-verification.ts` to map `pnpm-workspace.yaml`
      and `.npmrc` to the security-baseline and docs/config gates; tests
      first.
- [x] Run every declared check (`typecheck`, `lint`, `test`, `build`,
      `security:baseline`, `security:audit`) on the migrated lockfile and
      record the `pnpm rebuild:verify` evidence set on the node.
- [x] Open the draft PR and record it on the node; controller merge approval
      and the `rebuild/cr11-source` tag remain open.

## Declared checks

```bash
test "$(pnpm --version)" = "12.3.4"
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
pnpm security:audit
git diff --check
```

## Exclusions

- No Node, Next.js, or Expo version change; those are CR10 (done), CR12, and
  CR13-CR15.
- No provider, environment, preview, or production mutation.
- No mass edit of the ~130 `corepack pnpm` mentions across docs outside
  `README.md`; those are out of this slice's ownership.
- `react-native`'s own version (`0.79.6`) was not touched.

## Done when

- Every declared check passes under pnpm 12.3.4 with a `PASS` evidence set
  from `pnpm rebuild:verify` recorded on `CR11`.
- The draft PR is open, its required checks are green (including the Vercel
  preview build), and the controller has recorded merge approval per the
  runbook's merge authorization checklist.
