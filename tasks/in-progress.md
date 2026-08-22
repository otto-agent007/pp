# In Progress

## Expo 53 Dependency Security V1

- Active branch: `codex/expo-53-dependency-security-v1`, started from the
  latest `origin/main` after PR #132 merged.
- Upgrade the mobile runtime from Expo SDK 52 to SDK 53 with the aligned React
  19, React Native 0.79, Expo Router 5, and compatible native-module family.
- Replace stale root dependency overrides with current parent-scoped patches;
  the production audit now has no critical advisories and no fixable
  high-severity advisories in the mobile graph.
- The two remaining mobile high-severity advisories are the upstream no-fix
  `image-size@1.2.1` findings. Four fixable high-severity findings newly enter
  through the unrelated `apps/web` Next.js/Sharp graph and remain a separate
  web security slice rather than expanding this Expo migration.
- Expo dependency alignment, Expo Doctor (18/18), mobile and shared native UI
  tests/typechecks, iOS/Android export, the security baseline, and all full
  repository gates pass locally.
- Draft PR [#133](https://github.com/otto-agent007/pp/pull/133) is open;
  GitHub vulnerability alerts and automated security updates are enabled and
  verified through the GitHub API. GitHub CI and preview status are tracked on
  the draft PR.
- No generated native projects, EAS/provider changes, migrations, environment
  changes, Supabase writes, preview mutations, or production mutations are in
  scope.
