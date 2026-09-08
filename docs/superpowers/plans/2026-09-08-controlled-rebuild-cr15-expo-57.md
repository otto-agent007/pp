# CR15 Expo SDK 57 Migration Plan

**Goal:** Move `apps/mobile` from Expo SDK 55 to SDK 57, closing the controlled
rebuild's platform chain, without changing application behavior, migrations,
providers, environments, previews, or production.

**Controlled rebuild:** node `CR15` in `docs/rebuild/graph.json`, target `expo`
constraint `57`, selection `exact-sdk-major`, resolved version `57.0.20`
(2026-09-08), which satisfies the recorded 57.0.9 Hermes-fix floor. Base:
`e49aae824706c57d6cb7f9a666ca03fb0fc81868`. Branch:
`codex/rebuild-cr15-expo-57-v1`.

**Approvals:** the controller approved the Expo SDK 57 target refresh and the
CR15 start on 2026-09-08, on the same terms as CR13 and CR14, and separately
approved running this as a single 55-to-57 hop rather than the 56-then-57 pair
the graph originally described. Publication is approved; merge and the
`rebuild/cr15-source` tag remain controller-approved gates per
`docs/rebuild/README.md`.

**This slice's first commit reconciles CR14 as `done`,** which is the workflow
PR #178 enabled. CR14 was the first slice to merge without turning the default
branch red, so no separate reconciliation pull request was needed.

## The shape was decided by a scouting trial, not by reading changelogs

The graph declared CR15 as a 56-to-57 double hop. Before promoting it, the
whole end state was built in a disposable clone of the default branch and every
gate was run against it. That trial is what set the scope below: it found the
TypeScript 6 requirement, the exact `tsconfig.base.json` breakage, and two
unmet peer dependencies that a changelog reading would not have surfaced.

The trial proved the SDK 57 end state green. It did **not** prove that skipping
SDK 56 is safe in general, because SDK 56 was never installed. The controller
accepted that risk: the app uses continuous native generation, so no native
project state is carried across an SDK, and the only component with persisted
native state is `expo-secure-store`'s keychain data, which the trial could not
exercise. This is recorded as an accepted risk rather than a verified result.

## What moves

- `expo` `55.0.31` to `57.0.20`; the Expo packages follow to their `~57.0.x`
  SDK-aligned versions.
- `react-native` `0.83.10` to `0.86.3`. SDK 56 pairs with 0.85, which is skipped
  along with the SDK.
- `react` and `react-dom` `19.2.0` to `19.2.3` — a patch, shared by both SDK 56
  and SDK 57. Unlike CR13 and CR14 this hop carries no meaningful React churn.
- `metro.config.js` and `app.json` need no change.
- No new native dependency: `expo-router@57`'s reanimated, gesture-handler and
  `react-native-web` peers remain optional, `@react-navigation/drawer` was
  dropped from its peers entirely, and `react-native@0.86.3`'s new
  `@react-native/jest-preset` peer is declared optional.

## TypeScript 6, and the one thing it broke

SDK 57 requires TypeScript `~6.0.3`; expo-doctor fails the version check
otherwise. This is a major version bump across all ten workspace projects plus
`tooling/`, so it was measured before being accepted rather than assumed to be
large.

It broke exactly one thing. `tsconfig.base.json` set `baseUrl: "."`, which
TypeScript 6 deprecates (`error TS5101`). Removing it then required the `paths`
entries to be relative (`error TS5090`), so each value gained a `./` prefix.
With those two edits every project compiles clean.

Nothing else needed changing:

- `typescript-eslint@8.69.0` already accepts `typescript >=4.8.4 <6.1.0`, so the
  ESLint toolchain is untouched. This is unlike CR12, where the framework bump
  dragged a full lint migration with it.
- `tooling/` compiles clean under TypeScript 6. That directory only came under
  `pnpm typecheck` in PR #180, which is why that PR had to merge first — see
  below.

## Two unmet peers, one root cause, and a duplicate that was not what it looked like

The trial's first run left two unmet peer dependencies, both caused by pnpm's
auto-install-peers resolving a newer version than the dependent accepted:

- `@react-native/metro-config` resolved to `0.87.1` where
  `@react-native/community-cli-plugin@0.86.3` wanted `0.86.3`.
- `react-native-worklets` resolved to `0.12.1`, outside
  `expo-modules-core@57.0.16`'s `^0.7.4 || ^0.8.0 || ^0.9.0 || ^0.10.0`.

Separately, expo-doctor's duplicate-native-module check — new in SDK 57, which
runs 21 checks where SDK 55 ran 20 — reported two copies of `react-native@0.86.3`,
one under `apps/mobile` and one under `packages/ui-native`. These were genuinely
two physical directories with different inodes, not a symlink artifact, because
pnpm creates a separate instance per peer-resolution context.

The obvious fix was wrong. Removing `react-native` from `packages/ui-native`'s
devDependencies did not deduplicate it, because the copy is created to satisfy
its declared _peer_ dependency. The actual cause was the
`@react-native/metro-config` mismatch above, which forked `react-native`'s
resolution context. Pinning the two peers through `pnpm-workspace.yaml`
overrides collapsed the duplicate, and `packages/ui-native` needed no
restructuring at all. The duplicate does not exist at SDK 55, where both paths
resolve to the same store entry.

One accepted peer mismatch remains and is recorded rather than left as a
standing warning. `tsconfck` caps at `typescript ^5.0.0`, it is the latest
published version, and `vite-tsconfig-paths` pins it, so there is nothing to
upgrade to. It only reads tsconfig extends chains, and the suites that depend on
it pass under TypeScript 6. It is declared in `peerDependencyRules.allowedVersions`
so that `pnpm peers check` stays clean and a genuinely new peer problem is
visible.

## Why PR #180 had to merge first

CR15 must edit `tsconfig.base.json`, and on the default branch before #180 that
path had no gate mapping in `tooling/rebuild-verification.ts`:

```
tsconfig.base.json -> ["UNMAPPED changed path: tsconfig.base.json"]
```

`pnpm rebuild:verify` would have failed this slice with a missing gate. #180
added the `tsconfig*.json` mapping to `pnpm typecheck` plus `git diff --check`,
so the ordering was a mechanical dependency rather than a preference.

## Tasks

- [x] Reconcile CR14 as `done` in this slice's first commit.
- [x] Refresh the Expo SDK 57 target to the latest stable release (`57.0.20`),
      at or above the recorded 57.0.9 floor.
- [x] Move `apps/mobile` and `packages/ui-native` to the SDK 57 set.
- [x] Move the repo-wide React overrides to 19.2.3.
- [x] Move TypeScript to `^6.0.3` across every project, and fix
      `tsconfig.base.json`'s deprecated `baseUrl` and non-relative `paths`.
- [x] Pin `@react-native/metro-config` and `react-native-worklets` so the
      `react-native` duplicate collapses.
- [x] Record the accepted `tsconfck` peer mismatch.
- [ ] Run every declared check and record the `pnpm rebuild:verify` evidence set.
- [ ] Run Expo Doctor and both prebuilds in a disposable clean checkout.
- [ ] Open the draft PR and record it on the node.

## Declared checks

```bash
node -e "const v = require('./apps/mobile/node_modules/expo/package.json').version; if (v !== '57.0.20') { throw new Error(v) }"
node -e "const v = require('./apps/mobile/node_modules/react-native/package.json').version; if (v !== '0.86.3') { throw new Error(v) }"
node -e "const v = require('./node_modules/typescript/package.json').version; if (v !== '6.0.3') { throw new Error(v) }"
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

Native-build gate, from a disposable clean checkout:

```bash
npx expo-doctor@1.20.4
npx expo prebuild --platform ios --no-install
npx expo prebuild --platform android --no-install
```

## Exclusions

- No Node, pnpm, or Next.js version change.
- No EAS project, `eas.json`, credential, or build action.
- No committed `ios/` or `android/` directory.
- No provider, environment, preview, or production mutation.
- No behavioural fix for the 16 `eslint-plugin-react-hooks@7` findings carried
  out of CR12, and no change to the two follow-ups CR13 surfaced (placeholder
  `com.anonymous.*` identifiers, and `userInterfaceStyle` being inert on Android
  without `expo-system-ui`).

## Done when

- Every declared check passes on Expo SDK 57.0.20 with a `PASS` evidence set.
- Expo Doctor and both prebuilds are recorded as commit-bound command evidence.
- The draft PR is open, its required checks are green, and the controller has
  recorded merge approval.
