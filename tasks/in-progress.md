# In Progress

## Web Next 15 Security V1

- Active branch: `codex/web-next-15-security-v1`, started from the latest
  `origin/main` after Dependabot PR #142 merged.
- The red production audit reported 6 high-, 6 moderate-, and 1 low-severity
  findings, including eight advisories against `next@15.5.19` with a patched
  release at 15.5.21.
- Update only the web app's coupled `next` and `eslint-config-next` packages to
  15.5.21 and refresh their generated lock resolutions.
- The production audit now reports 3 high-, 1 moderate-, and 1 low-severity
  findings, with all eight Next.js advisories cleared.
- Keep the remaining Sharp remediation in a separate Next 16.3 migration;
  retain the two upstream no-fix `image-size` findings plus the deep Expo UUID
  and Babel follow-ups outside this slice.
- No application source, migration, environment, provider, preview, Supabase,
  or production mutation is in scope.
- The focused web tests, typecheck, lint, and production build pass. The frozen
  install, full repository tests, typecheck, lint, build, security baseline,
  and diff check also pass; draft PR publication is pending.
