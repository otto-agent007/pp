# CR12 Next.js 16 Migration Plan

**Goal:** Move `apps/web` from Next.js 15.5.25 to the latest stable Next.js 16
release, without changing application behavior, Node's target (CR10), pnpm's
target (CR11), Expo versions, migrations, providers, environments, previews, or
production.

**Controlled rebuild:** node `CR12` in `docs/rebuild/graph.json`, target `next`
constraint `16`, selection `stable-major`, resolved version `16.3.4`
(2026-09-07). Base: `d9a84c44035185bfee00aa8ac3d8230349726c88` (CR11's merge
commit on `main`). Branch: `codex/rebuild-cr12-next-16-v1`.

**Approvals:** the controller approved the Next.js 16 target refresh and the
CR12 start on 2026-09-07, together with two scope decisions recorded below (the
full ESLint 9 flat-config migration inside this slice, and adopting Turbopack as
the default production bundler). Publication is approved; merge and the
`rebuild/cr12-source` tag remain controller-approved gates per
`docs/rebuild/README.md`.

## Facts checked before starting

Audited `apps/web` against the Next.js 16 upgrade guide's breaking changes. The
app needs no application-code migration:

- `params` and `searchParams` are already `Promise`-typed and awaited
  everywhere, so removing Next 15's synchronous compatibility shim is a no-op.
- No `cookies()`, `headers()`, or `draftMode()` call sites exist.
- No `next/image` or `next/legacy/image` usage, so the changed `qualities`,
  `imageSizes`, `minimumCacheTTL`, `localPatterns.search`, `maximumRedirects`,
  and local-IP defaults do not apply.
- No `revalidateTag`, `unstable_cache`, `unstable_rootParams`, or any
  `next/cache` import, so the caching API changes do not apply.
- No `middleware.ts`, so the `middleware` to `proxy` rename does not apply.
- No parallel-route slots, so the new mandatory `default.js` does not apply.
- No AMP usage, no `serverRuntimeConfig`/`publicRuntimeConfig`, no
  `devIndicators`, no `experimental.dynamicIO`/`useCache`, and no
  `scroll-behavior: smooth` to preserve.
- `next.config.ts` uses only options that survive into 16 (`headers`,
  `rewrites`, `transpilePackages`, `outputFileTracingRoot`, `poweredByHeader`);
  it never set the removed `eslint` key.
- `next@16.3.4`'s React peer range is `^18.2.0 || ^19.0.0`, so CR11's repo-wide
  `react`/`react-dom` `19.0.0` pin — which exists to keep `apps/mobile` on the
  Expo SDK 53-verified version — still satisfies it. `apps/web` stays on React
  19.0.0; no Expo-affecting change was needed.
- `next dev` now writes to `.next/dev`, already covered by the root
  `.gitignore` entry for `.next`.

## Two scope decisions the controller made

**ESLint 9 and flat config, inside this slice.** Next 16 removes `next lint`,
and `eslint-config-next@16` requires ESLint >= 9, which means flat config. The
alternative was to hold `eslint-config-next` at 15 on ESLint 8 and defer; the
controller chose to migrate now so the repository does not run a version-15
lint configuration against a version-16 app. ESLint 9.39.5 is the ceiling:
`eslint-plugin-react`, `eslint-plugin-import`, and `eslint-plugin-jsx-a11y` all
peer-cap at `^9`, so ESLint 10 is not yet viable.

**Turbopack as the production bundler.** Next 16 makes Turbopack the default
for `next build` as well as `next dev`. The repository defines no custom webpack
configuration, so nothing forces an opt-out, and the controller chose to adopt
the default rather than pin `--webpack`. The Vercel preview build on the PR is
the real test.

## A lint finding volume issue found and resolved during this slice

`eslint-config-next@16` pulls `eslint-plugin-react-hooks@7`, whose React
Compiler-derived rules did not exist in the version 5 plugin behind `next lint`.
They report 16 pre-existing findings across 12 components: 13
`react-hooks/set-state-in-effect`, 2 `react-hooks/purity`, and 1
`react-hooks/use-memo`. These are real React anti-patterns, but clearing them
means changing component behavior, which a framework-version migration must not
do. They are set to `warn` in `apps/web/eslint.config.mjs` with the reason
recorded inline, kept visible on every lint run, and tracked as a follow-up in
`tasks/in-progress.md`. `react-hooks/rules-of-hooks` and
`react-hooks/exhaustive-deps` stay at `error`.

Two further findings were genuine and are fixed here rather than deferred: an
unused `_nodeEnv` parameter in `next.config.ts` (the root config now honors the
`_`-prefix convention the codebase already uses), and two stale
`eslint-disable-next-line react/no-danger` directives in the brand components,
which ESLint 9 reports because flat config enables
`reportUnusedDisableDirectives` by default. The explanatory comments survive;
only the directives are gone.

## Tasks

- [x] Reconcile CR11 as `done` (status, `mergeSha`, evidence, task tracker).
- [x] Refresh the Next.js 16 target to the latest stable release (`16.3.4`).
- [x] Move `apps/web` to `next@^16.3.4`.
- [x] Replace the removed `next lint` with a direct ESLint CLI invocation
      covering `app/`, `hooks/`, and the top-level TypeScript config files.
- [x] Move the workspace to `eslint@9.39.5` and `eslint-config-next@^16.3.4`.
- [x] Replace `.eslintrc.cjs` at the root and in `apps/web` with
      `eslint.config.mjs` flat configs; the root config is inherited by every
      workspace project through ESLint's ancestor lookup, verified from
      `packages/domain`.
- [x] Triage the `eslint-plugin-react-hooks@7` findings as described above.
- [x] Teach `tooling/rebuild-verification.ts` to map ESLint flat and legacy
      config files to the lint and docs/config gates; tests first.
- [x] Run every declared check on the migrated tree and record the
      `pnpm rebuild:verify` evidence set on the node (15/15 gates PASS,
      evidence set `3e81ae8c…`).
- [x] Open the draft PR and record it on the node; controller merge approval
      and the `rebuild/cr12-source` tag remain open.

## Declared checks

```bash
node -e "if (require('next/package.json').version !== '16.3.4') { throw new Error(require('next/package.json').version) }"
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

- No Node, pnpm, or Expo version change; those are CR10 (done), CR11 (done),
  and CR13-CR15.
- No React version change. CR11's repo-wide `19.0.0` pin stays exactly as it
  is; moving `apps/web` off it would break the Expo SDK 53 constraint that pin
  exists to protect.
- No provider, environment, preview, or production mutation; `apps/web/vercel.json`
  is untouched.
- No behavioral fix for the 16 `eslint-plugin-react-hooks@7` findings; they are
  tracked, not silenced.
- No opt-in to Next 16's new optional features (`cacheComponents`,
  `reactCompiler`, Cache Components); those are product decisions, not part of
  a version migration.

## Done when

- Every declared check passes on Next.js 16.3.4 with a `PASS` evidence set from
  `pnpm rebuild:verify` recorded on `CR12`.
- The draft PR is open, its required checks are green (including the Vercel
  preview build), and the controller has recorded merge approval per the
  runbook's merge authorization checklist.
