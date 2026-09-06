# CR10 Node 24 LTS Migration Plan

**Goal:** Move the repository's declared runtime from Node 20.19.4 (end of
life since 2026-04-30) to the frozen Node 24 LTS release `24.20.0` for CI,
`engines`, local tooling, and type definitions, without changing application
behavior, dependencies beyond `@types/node`, migrations, providers,
environments, previews, or production.

**Controlled rebuild:** node `CR10` in `docs/rebuild/graph.json`, target
`node` constraint `24`, selection `lts-major`, resolved version `24.20.0`
(Krypton, released 2026-08-26). Base:
`eee1726d2e78dc065db227474ff1419fc9bb97b8` (head of the platform-first
re-sequencing PR #168). Branch: `codex/rebuild-cr10-node-24-v1`.

**Approvals:** controller approved platform-first sequencing, the Node
24.20.0 target refresh, and the CR10 start on 2026-09-06 (recorded as
approval evidence on the node). Publication and merge remain
controller-approved gates per `docs/rebuild/README.md`.

## Facts checked before starting

- Vercel project `pest-patrol-os` already runs `nodeVersion: 24.x`, so
  production and previews are on Node 24; only CI, `engines`, docs, and
  `@types/node` lag behind.
- Node 24.20.0 is the latest stable release on the 24 line and is not a
  prerelease. The tarball checksum was verified against `SHASUMS256.txt`.
- pnpm 9.15.4, Next.js 15.5, Expo SDK 53 tooling (`expo export`), Vitest 4,
  and tsx all run on Node 24; the same checks already passed on Node 26
  locally during the 2026-09-05 security refresh.

## Tasks

- [x] Add `.nvmrc` with `24.20.0` as the single source of the frozen runtime.
- [x] Point the CI `setup-node` step at `.nvmrc` (`node-version-file`).
- [x] Raise `engines.node` to `>=24.20.0`.
- [x] Move `@types/node` to the 24 line in `apps/web`, `packages/api-client`,
      and the root (the root entry pins Vite and Vitest's auto-installed
      peer to 24 instead of drifting to the newest major).
- [x] Update `README.md` and `docs/PRODUCTION_READINESS.md` runtime guidance.
- [ ] Run every declared check on Node 24.20.0 and record the
      `pnpm rebuild:verify` evidence set on the node.
- [ ] Open the draft PR, record it on the node, and re-verify the pushed head.

## Declared checks

```bash
node -e "if (process.version !== 'v24.20.0') { throw new Error(process.version) }"
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
pnpm security:audit
git diff --check
```

## Exclusions

- `tools/github-mcp-server` keeps its own npm lockfile and `engines >=18`; it
  is a standalone developer tool and is not part of this slice.
- No pnpm, Next.js, or Expo version change; those are CR11, CR12, and
  CR13-CR15.
- No provider, environment, preview, or production mutation. Vercel's Node
  setting is already 24.x and is left untouched.

## Done when

- Every declared check passes on Node 24.20.0 with a `PASS` evidence set from
  `pnpm rebuild:verify` recorded on `CR10`.
- The draft PR is open, its required checks are green, and the controller has
  recorded merge approval per the runbook's merge authorization checklist.
