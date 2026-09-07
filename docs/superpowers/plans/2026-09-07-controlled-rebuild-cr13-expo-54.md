# CR13 Expo SDK 54 Migration Plan

**Goal:** Move `apps/mobile` from Expo SDK 53 to SDK 54 as a single-SDK hop,
without changing application behavior, Node's target (CR10), pnpm's target
(CR11), Next.js's target (CR12), migrations, providers, environments, previews,
or production.

**Controlled rebuild:** node `CR13` in `docs/rebuild/graph.json`, target `expo`
constraint `54`, selection `exact-sdk-major`, resolved version `54.0.37`
(2026-09-07). Base: `b5ce59feffd664319167567d3dcdca95cf9d3b25` (CR12's
reconciliation merge commit on `main`). Branch:
`codex/rebuild-cr13-expo-54-v1`.

**Approvals:** the controller approved the Expo SDK 54 target refresh and the
CR13 start on 2026-09-07, together with two scope decisions recorded below (the
repo-wide React 19.1 bump, and Expo Doctor plus clean two-platform prebuild as
the native-build evidence depth). Publication is approved; merge and the
`rebuild/cr13-source` tag remain controller-approved gates per
`docs/rebuild/README.md`.

## Facts checked before starting

`54.0.37` is the newest stable release behind the `sdk-54` dist-tag. The SDK
54 dependency set was read from `expo/bundledNativeModules.json` on the
`sdk-54` branch rather than inferred, and the app needs no application-code
migration:

- `expo-router` v5 to v6 is the only major among the Expo packages. The app has
  a single route (`app/index.tsx`) and no drawer, so the v6 changes do not
  reach it.
- `expo-router@6`'s `react-native-reanimated`, `react-native-gesture-handler`,
  `react-native-web` and `@react-navigation/drawer` peers are all declared
  optional in `peerDependenciesMeta`, so the SDK 54 hop adds no new native
  dependency.
- `react-native@0.81.5` is the first version in this chain to publish
  `main` and a strict `exports` map; 0.79.6 published neither. Nothing in
  `apps/mobile` or `packages/ui-native` deep-imports `react-native/...`, so the
  new subpath restrictions do not apply.
- `react-native-signature-canvas@4.7.2` peers on `react-native-webview >= 13`,
  which SDK 54's `13.15.0` satisfies; it stays where it is.
- `app.json` needs no change. `newArchEnabled: true` was already set, and SDK
  54 defaults the new architecture on, so the explicit value is now a
  restatement rather than an opt-in.

## Two scope decisions the controller made

**The repo-wide React pin moves to 19.1.0.** `react-native@0.81.5` peers on
`react: ^19.1.0`, and SDK 54's bundled set pins `react` and `react-dom` to
exactly `19.1.0`. React is pinned for the whole monorepo by the
`pnpm-workspace.yaml` overrides block, so this is not a mobile-local change.
CR12's plan recorded that the `19.0.0` pin existed to protect the Expo SDK 53
constraint; CR13 is the slice that retires that constraint, so the pin moves
with it. The blast radius was checked before the decision: `next@16.3.4` peers
on `^19.0.0` and `packages/ui`/`packages/ui-native` declare `^19.0.x` carets,
so every workspace project accepts 19.1.0 and the lockfile still resolves a
single `react@19.1.0`. The alternative — forcing 19.1.0 for `apps/mobile` only
— would put two React copies in a monorepo whose `packages/ui` and
`packages/domain` are shared, and was rejected. `@types/react` and
`@types/react-dom` move to the matching `19.1` line (`19.1.17`, `19.1.11`).

**Expo Doctor plus clean two-platform prebuild as the native-build evidence.**
`docs/rebuild/README.md` requires an Expo slice to prove native-project
compatibility, and accepts commit-bound `command` evidence for Expo Doctor and
no-install prebuild for both iOS and Android. The heavier option — one `github`
evidence item per platform pointing at an immutable EAS build page — would
require an EAS project, an `eas.json`, and provider credentials that this
repository does not have; standing those up is a separately controller-approved
provider action, not part of a version migration. The controller chose the
Doctor-plus-prebuild depth, so no EAS action is taken in this slice.

## A Metro config defect found and fixed during this slice

Expo Doctor's Metro check failed on the first run with two findings:
`watchFolders` did not contain all of Expo's defaults, and
`resolver.unstable_enableSymlinks` was `true` where the default is now
`undefined`. Both come from `apps/mobile/metro.config.js` having hand-wired
this pnpm workspace back when the default config did not.

SDK 54's `getDefaultConfig` resolves the workspace on its own: it watches all
nine workspace projects plus the root `node_modules`, sets
`resolver.nodeModulesPaths` to the app and the root, and handles symlinks
natively. Every manual override in the file had become either redundant or a
conflict, so they are gone.

Fixing this surfaced a second, pre-existing defect. The file assigned
`config.resolver.blockList = [...]`, which **replaced** Expo's own default
exclusions (`/\.expo[\/]types/` and `/(\/__tests__\/.*)$/`) rather than adding
to them; that loss predates this slice and was silent. The `tools/` exclusion
is still needed — `tools/github-mcp-server` has restricted `node_modules` that
trigger `EACCES` (errno -4092) on Windows — so it is now appended to the
default blockList instead of overwriting it, and all three entries survive.
Notably the new default `watchFolders` enumerates workspace projects rather
than the repository root, so Metro no longer walks `tools/` at all; the
exclusion is kept as defence in depth for the Windows case rather than removed.

That same narrowing broke the build, which is the trap worth recording.
`pnpm-workspace.yaml` relocates pnpm's virtual store to `<root>/.pnpm` through
`virtualStoreDir`. Expo's default `watchFolders` cover `<root>/node_modules`
and each workspace project, and none of them contain the relocated store, so
every dependency symlink resolved to a real path outside all watch folders and
`expo export` failed with `Unable to resolve module ./.pnpm/expo-router@.../
entry.js from <root>/.`. The old blanket `watchFolders = [workspaceRoot]` had
been covering that case by accident. The store is now appended to Expo's
defaults explicitly, with the reason recorded inline.

Expo Doctor accepts the extension — its check is that the defaults are a subset
of the configured folders, not that the two are equal — so the config satisfies
both constraints at once: 18/18 checks passing and a working export. The
exported Hermes bundles are byte-identical to the ones the pre-rewrite config
produced (`entry-83f097ce…` for Android, `entry-9d392ace…` for iOS), which
confirms the rewrite changed no output.

This is also a reminder that Expo Doctor is not a substitute for `pnpm build`:
the first version of the rewrite passed 18/18 while leaving the app unbuildable.

## A note on what `pnpm test` can and cannot prove here

All eleven mobile and `ui-native` test files call `vi.mock("react-native", …)`,
and the suite runs under jsdom, so React Native itself never loads in the unit
tests. `pnpm test` was green before this slice and is green after it, but that
result is independent of the React Native version and must not be read as
evidence that the SDK 54 hop works. The load-bearing gates for this slice are
`pnpm typecheck` (which does compile against RN 0.81.5's types), `pnpm build`
(`expo export`, which bundles the real unmocked application through Metro,
Babel and Hermes for both platforms), Expo Doctor, and the two prebuilds.

## Tasks

- [x] Confirm CR12 is reconciled as `done` on `main` before starting (PR #175).
- [x] Refresh the Expo SDK 54 target to the latest stable release (`54.0.37`).
- [x] Move `apps/mobile` to the SDK 54 bundled dependency set.
- [x] Move `packages/ui-native`'s `react-native` and `@types/react` devDeps to
      match.
- [x] Move the repo-wide `react`, `react-dom`, `@types/react` and
      `@types/react-dom` overrides to the 19.1 line.
- [x] Rewrite `apps/mobile/metro.config.js` onto SDK 54's defaults, preserving
      the `tools/` exclusion by appending rather than replacing.
- [ ] Run every declared check on the migrated tree and record the
      `pnpm rebuild:verify` evidence set on the node.
- [ ] Run Expo Doctor and both prebuilds in a disposable clean checkout and
      record commit-bound command evidence.
- [ ] Open the draft PR and record it on the node; controller merge approval
      and the `rebuild/cr13-source` tag remain open.

## Declared checks

```bash
node -e "const v = require('./apps/mobile/node_modules/expo/package.json').version; if (v !== '54.0.37') { throw new Error(v) }"
node -e "const v = require('./apps/mobile/node_modules/react-native/package.json').version; if (v !== '0.81.5') { throw new Error(v) }"
node -e "const v = require('./apps/mobile/node_modules/react/package.json').version; if (v !== '19.1.0') { throw new Error(v) }"
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

The Expo native-build gate is evidenced separately, from a disposable clean
checkout, per `docs/rebuild/README.md`:

```bash
npx expo-doctor@1.20.4
npx expo prebuild --platform ios --no-install
npx expo prebuild --platform android --no-install
```

## Exclusions

- No Node, pnpm, or Next.js version change; those are CR10, CR11 and CR12, all
  done.
- No SDK 55, 56 or 57 hop. CR13 is a one-SDK migration by definition; CR14 and
  CR15 carry the rest, and CR15 holds the 57.0.9 Hermes-fix floor.
- No EAS project, `eas.json`, credential, or build action; the controller chose
  the Doctor-plus-prebuild evidence depth, and provider mutation stays a
  separate approval.
- No committed `ios/` or `android/` directory. The prebuilds are evidence
  inputs generated in a disposable checkout; the app stays on continuous native
  generation.
- No provider, environment, preview, or production mutation.
- No behavioral fix for the 16 `eslint-plugin-react-hooks@7` findings carried
  out of CR12; they remain tracked warnings.

## Done when

- Every declared check passes on Expo SDK 54.0.37 with a `PASS` evidence set
  from `pnpm rebuild:verify` recorded on `CR13`.
- Expo Doctor and both platform prebuilds are recorded as commit-bound command
  evidence on the node.
- The draft PR is open, its required checks are green, and the controller has
  recorded merge approval per the runbook's merge authorization checklist.
