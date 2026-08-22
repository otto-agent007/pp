# Expo 53 Dependency Security V1 Design

## Goal

Move the mobile app from Expo SDK 52 to SDK 53 as one incremental security
migration, restore a compatible Expo/React Native package family, remove stale
root dependency overrides, and reduce the production audit to no critical or
fixable high-severity advisories.

## Current Evidence

- `pnpm audit --prod` currently reports 14 unique advisory records: 1 critical,
  11 high, 1 moderate, and 1 low.
- Every current production-audit path enters through `apps/mobile` and the Expo
  SDK 52 toolchain.
- The critical `shell-quote` finding and the fixable `form-data`, `undici`,
  `js-yaml`, `nanoid`, `postcss`, `fast-uri`, and `tar` findings are transitive.
- The root overrides force vulnerable `tar@7.5.16` and `postcss@8.5.15`
  versions. The other root overrides must be revalidated rather than assumed
  necessary.
- `expo install --check` reports that `expo-secure-store@55.0.13` is
  incompatible with Expo SDK 52 and expects the SDK 52 package line instead.
- GitHub Dependabot vulnerability alerts are disabled for the private
  repository.

This is a point-in-time baseline. The registry audit is rerun during
implementation and recorded in the draft PR because advisory data and patched
versions can change.

## Decision

Upgrade one Expo SDK version, from 52 to 53, in this slice. Expo recommends
incremental SDK upgrades so failures can be attributed to one version boundary:

- <https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/>
- <https://expo.dev/changelog/sdk-53>

SDK 53 aligns the project with React Native 0.79 and React 19. The implementation
will use Expo's package alignment command rather than hand-selecting unrelated
versions. SDK 54, 55, and 56 migrations remain separate follow-up slices, each
requiring a fresh audit and compatibility decision.

An override-only remediation is rejected because the June 2026 override sweep
has already drifted into vulnerable pins and would leave the unsupported Expo
52 family and the `expo-secure-store` mismatch in place. A direct Expo 52 to 56
jump is rejected because it crosses several React Native, React, Metro, native
platform, and Expo package boundaries at once.

## Package And File Scope

Expected dependency changes are limited to:

- `apps/mobile/package.json`
- root `package.json` override policy
- `pnpm-lock.yaml`
- `tasks/in-progress.md`

Expo's SDK 53 alignment may update `expo`, React Native, React, React DOM,
Expo Router, Expo modules, React Native screens, safe-area context, webview,
and matching React types. Application source or configuration changes are
allowed only when an SDK 53 compatibility failure demonstrates they are
required. Any production-code compatibility fix must first have a focused
failing regression test.

There are no checked-in `ios` or `android` projects, so this slice keeps the
current Continuous Native Generation boundary and does not create native
directories.

## Override Policy

Remove the existing five root overrides before resolving the SDK 53 lockfile:

- `tar`
- `@xmldom/xmldom`
- `postcss`
- `ws`
- `uuid`

Prefer the package graph selected by the aligned Expo family. Reintroduce an
override only when all of the following are true:

1. The post-upgrade production audit proves a fixable advisory remains.
2. The override stays within every affected package's compatible version
   range or passes package/build validation that demonstrates compatibility.
3. The override pins the smallest patched version needed for that advisory.
4. The draft PR records the advisory, dependency path, compatibility evidence,
   and reason the override remains necessary.

Do not use overrides to suppress or hide audit output. The two `image-size`
high-severity advisories currently report no patched version; if they remain
after SDK 53 alignment, record their exact paths and upstream no-fix status
rather than forcing an unproven version.

## Runtime And Architecture Boundary

This migration changes dependency resolution and the mobile runtime family; it
does not change Pest Patrol data flow. Mobile writes remain offline-first and
queued through the existing stores and sync system. No UI may gain direct
Supabase access, no API contract changes are planned, and no shared domain logic
is duplicated into the app.

Existing capture flows that depend on native libraries require focused review:

- image picker and location permissions
- secure-store access
- safe-area and screen navigation
- signature capture and webview integration
- Expo Router startup and export

## GitHub Security Settings

After the dependency branch is verified and published as a draft PR:

1. Enable Dependabot vulnerability alerts for `otto-agent007/pp`.
2. Enable automated security updates.
3. Verify both settings through the GitHub API without exposing repository or
   credential details.

These are repository-setting mutations explicitly approved for this slice.
They may create separate Dependabot PRs; this slice will not merge, close, or
rewrite those PRs automatically.

## Verification

Run the following against the resolved dependency tree:

- `expo install --check`
- current `expo-doctor`
- `pnpm audit --prod`
- mobile tests
- mobile typecheck
- mobile export/build
- full root `pnpm test`
- full root `pnpm typecheck`
- full root `pnpm lint`
- full root `pnpm build`
- security baseline
- `git diff --check`

The draft PR is ready for review when:

- Expo reports the SDK 53 family is aligned.
- Expo Doctor has no unresolved project dependency errors.
- The production audit has no critical advisories and no fixable
  high-severity advisories.
- Any remaining no-fix advisory is identified with its current path and
  upstream status.
- Existing mobile tests and export pass without weakening offline-first or
  security behavior.
- Full repository gates and GitHub CI pass.
- Vulnerability alerts and automated security updates are enabled and verified.

## Risks And Stop Conditions

- React 19 or React Native 0.79 may expose component, test, or package-export
  incompatibilities.
- React Native New Architecture compatibility must remain intact; the project
  already opts in through `newArchEnabled`.
- Signature canvas or webview compatibility may require a separately justified
  package update.
- Audit results can change while the slice is active.

Stop and report evidence before expanding scope if SDK 53 requires migration,
provider, environment, EAS, native-project, app-store, or production changes;
if a direct dependency has no SDK 53-compatible release; or if more than one
Expo SDK boundary is needed to resolve the failure.

## Non-Goals

- No Expo SDK 54, 55, 56, or pre-release upgrade.
- No EAS build, submission, development-client, or provider configuration.
- No generated `ios` or `android` directories.
- No migration, Supabase write, environment change, preview mutation, or
  production mutation.
- No dependency-audit CI policy, browser smoke job, workflow permissions,
  timeouts, or concurrency changes; those belong to the later CI safety slice.
- No unrelated package modernization or large-module refactor.
