# CR14 Expo SDK 55 Migration Plan

**Goal:** Move `apps/mobile` from Expo SDK 54 to SDK 55 as a single-SDK hop,
without changing application behavior, Node's target (CR10), pnpm's target
(CR11), Next.js's target (CR12), migrations, providers, environments, previews,
or production.

**Controlled rebuild:** node `CR14` in `docs/rebuild/graph.json`, target `expo`
constraint `55`, selection `exact-sdk-major`, resolved version `55.0.31`
(2026-09-07). Base: `8322fd1cc55587db3e33e2297c216d88729e4df2`. Branch:
`codex/rebuild-cr14-expo-55-v1`.

**Approvals:** the controller approved the Expo SDK 55 target refresh and the
CR14 start on 2026-09-07, on the same terms as CR13: the repo-wide React pin
moves with the SDK, and the native-build evidence is Expo Doctor plus clean
two-platform prebuild with no EAS action. Publication is approved; merge and the
`rebuild/cr14-source` tag remain controller-approved gates per
`docs/rebuild/README.md`.

**First slice under the new reconciliation rule.** CR13 was already recorded
`done` on the default branch before this slice began, so there was nothing to
reconcile. From here on a predecessor's reconciliation travels in the next
slice's first commit rather than a dedicated pull request; see
`docs/rebuild/README.md`.

## The version numbers overstate this hop

SDK 55 renumbers every Expo package so its major matches the SDK. `expo-router`
goes 6 to 55, `expo-constants` 18 to 55, `expo-location` 19 to 55,
`expo-image-picker` 17 to 55, `expo-linking` 8 to 55, and `expo-secure-store`
15 to 55. This was checked against the registry rather than assumed: none of these
packages published any intermediate major, so `expo-router@6.0.24` is followed
directly by `expo-router@55.0.0`. The deltas are a versioning-scheme change, not
forty-nine majors of breaking change. Real SDK 55 breaking changes still exist —
one of them is below — the numbers just do not measure them.

## Facts checked before starting

The dependency set was read from `expo/bundledNativeModules.json` on the
`sdk-55` branch rather than inferred.

- `react-native` goes `0.81.5` to `0.83.10`. Expo pairs SDK 55 with 0.83
  directly, so **0.82 is skipped entirely** — two React Native minors land in
  this one slice. That is Expo's pairing, not a choice available here.
- `expo-router@55`'s `react-native-reanimated`, `react-native-gesture-handler`,
  `react-native-web` and `@react-navigation/drawer` peers are still declared
  optional, so the hop adds no new native dependency.
- `react-native@0.83.10`'s Node engine is `>= 20.19.4`, satisfied by CR10's
  24.20.0 pin.
- `react-native-signature-canvas@4.7.2` peers on `react-native-webview >= 13`,
  which SDK 55's `13.16.0` satisfies; it stays where it is.
- `apps/mobile/metro.config.js` needs no change. The relocated pnpm virtual
  store that CR13 had to add to `watchFolders` is still outside Expo's
  defaults, and the file still extends rather than replaces them.

## The repo-wide React pin moves to 19.2.0

`react-native@0.83.10` peers on `react: ^19.2.0`, and SDK 55 pins `react` and
`react-dom` to exactly `19.2.0`. As in CR13 this is not a mobile-local change,
because React is pinned for the whole monorepo in `pnpm-workspace.yaml`. The
blast radius was checked again before the change: `next@16.3.4` peers on
`^19.0.0`, so `apps/web` accepts it, and the lockfile still resolves a single
`react@19.2.0` for every workspace project. `@types/react` and
`@types/react-dom` move to the matching 19.2 line (`19.2.18`, `19.2.7`).

## The one real config break: `newArchEnabled`

Expo Doctor's config-schema check failed on the first run:

```
should NOT have additional property 'newArchEnabled'
```

SDK 55 removes `newArchEnabled` from the app config schema because the new
architecture is now unconditional. The field is therefore invalid rather than
merely redundant, and it is deleted from `apps/mobile/app.json`. This changes
nothing at runtime: the app already set it to `true`, which is the only
behaviour SDK 55 offers. Expo Doctor reports 20/20 after the removal.

## Two stale audit ignores removed

`pnpm.auditConfig.ignoreGhsas` carried three accepted-risk advisories. Under
SDK 55's dependency tree only `GHSA-vcc3-ghjq-m6fr` (decode-uri-component,
reached through `expo-router`'s `query-string`) still resolves; the paths behind
`GHSA-5p2g-fcmc-qvqq` and `GHSA-w3rx-r6r6-pgpr` are gone. Those two entries are
removed rather than left in place, because a stale ignore silently suppresses
the advisory if a future dependency reintroduces it. If one does come back,
`pnpm security:audit` fails and the entry can be restored deliberately.

## What actually proves this slice

Unchanged from CR13, and worth restating because it is counter-intuitive: all
eleven mobile and `ui-native` test files call `vi.mock("react-native", …)` and
run under jsdom, so React Native never loads in the unit tests. `pnpm test` was
green before and after and would have stayed green through a broken hop. The
load-bearing gates are `pnpm typecheck` (compiles against RN 0.83.10's types),
`pnpm build` (`expo export`, which bundles the real unmocked app through Metro,
Babel and Hermes for both platforms), Expo Doctor, and the two prebuilds.

## Tasks

- [x] Confirm CR13 is reconciled as `done` on the default branch before
      starting (PR #177), so this slice carries no reconciliation.
- [x] Refresh the Expo SDK 55 target to the latest stable release (`55.0.31`).
- [x] Move `apps/mobile` to the SDK 55 bundled dependency set.
- [x] Move `packages/ui-native`'s `react-native` and React type devDeps to
      match.
- [x] Move the repo-wide React overrides to the 19.2 line.
- [x] Remove `newArchEnabled` from `apps/mobile/app.json`.
- [x] Drop the two audit ignores SDK 55's tree made stale.
- [x] Run every declared check on the migrated tree and record the
      `pnpm rebuild:verify` evidence set on the node (15/15 gates PASS,
      evidence set `a2a82e82…`).
- [x] Run Expo Doctor and both prebuilds in a disposable clean checkout and
      record commit-bound command evidence.
- [x] Open the draft PR and record it on the node; controller merge approval
      and the `rebuild/cr14-source` tag remain open.

## Declared checks

```bash
node -e "const v = require('./apps/mobile/node_modules/expo/package.json').version; if (v !== '55.0.31') { throw new Error(v) }"
node -e "const v = require('./apps/mobile/node_modules/react-native/package.json').version; if (v !== '0.83.10') { throw new Error(v) }"
node -e "const v = require('./apps/mobile/node_modules/react/package.json').version; if (v !== '19.2.0') { throw new Error(v) }"
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

- No Node, pnpm, or Next.js version change; those are CR10, CR11 and CR12.
- No SDK 56 or 57 hop. CR14 is a one-SDK migration by definition; CR15 carries
  the 56-to-57 hop and holds the 57.0.9 Hermes-fix floor.
- No EAS project, `eas.json`, credential, or build action.
- No committed `ios/` or `android/` directory; the prebuilds are evidence
  inputs generated in a disposable checkout.
- No provider, environment, preview, or production mutation.
- No behavioural fix for the 16 `eslint-plugin-react-hooks@7` findings carried
  out of CR12, and no change to the two follow-ups CR13 surfaced (placeholder
  `com.anonymous.*` identifiers, and `userInterfaceStyle` being inert on
  Android without `expo-system-ui`).

## Done when

- Every declared check passes on Expo SDK 55.0.31 with a `PASS` evidence set
  from `pnpm rebuild:verify` recorded on `CR14`.
- Expo Doctor and both platform prebuilds are recorded as commit-bound command
  evidence on the node.
- The draft PR is open, its required checks are green, and the controller has
  recorded merge approval per the runbook's merge authorization checklist.
