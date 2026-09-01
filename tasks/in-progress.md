# In Progress

## Controlled rebuild CR00 process-optimization recovery

- CR00 recovery PR [#147](https://github.com/otto-agent007/pp/pull/147) was
  squash-merged as `3630dbb3ecaf4361dc059a974246e688f473bcf2` on
  2026-08-25. That exact commit is the base of the active recovery branch
  `codex/rebuild-cr00-process-optimization-recovery-v1`.
- The controller supplied and approved Fable's process-optimization contract on
  2026-08-31. The implementation plan is
  `docs/superpowers/plans/2026-08-31-cr00-process-optimization-recovery.md`.
- CR08 is superseded into CR09, CR16 into CR15, and CR17 into CR18. The
  absorbing nodes carry the combined deliverables, CR15 ends at Expo SDK 57
  with a 57.0.9 Hermes-fix floor, and every superseded node carries approval
  evidence bound to the recovery base commit.
- Standing graph, tracker, own-plan, and running-slice lockfile ownership is
  enforced by the reconciler and recovery verifier. Focused ownership tests and
  the unchanged graph validator were observed RED before the minimal repairs
  passed GREEN.
- The canonical rebuild runbook now defines N+1 read-only/spec-drafting
  pipelining, Expo native-build evidence, external adversarial pre-review, and
  asynchronous auto-merge authorization.
- Draft recovery PR URL: pending publication.
- Draft CR01 PR [#148](https://github.com/otto-agent007/pp/pull/148) remains
  open, draft, and unmodified at `e0783e73ba9368be90ade0046e79cc706699f629`.
  This control-plane recovery does not promote CR01 or CR02, source-tag, mark
  ready, merge, or otherwise mutate that PR.
- The reviewed tree passes 83/83 focused control-plane tests, structural graph
  validation, offline reconciliation, 99/99 root tooling tests plus all seven
  Turbo test tasks, all nine typecheck/lint/build tasks, the security baseline,
  focused TypeScript/Markdown formatting, and `git diff --check`. The final
  clean-tree recovery verifier and hosted checks remain pending until commit
  and publication.
- Excluded: application behavior, dependency and lockfile content, migrations,
  RLS, EAS/provider actions, environments, previews, and production.
