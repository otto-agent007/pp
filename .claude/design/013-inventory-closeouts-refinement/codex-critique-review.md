# Codex Critique Review: Inventory + Closeouts Refinement V1

## Valid fixes

- Replaced the inventory form label primitive color class with the semantic
  `text-theme-text-primary` token. This accepts Claude's token-consistency
  finding without changing data flow, form behavior, or copy.
- Consolidated the `/closeouts` `Other jobs` row through the same queue-row
  button shell and row content path used by completed queue rows. The all-jobs
  view now keeps the shared chrome and scheduled-date context while preserving
  the existing non-completed job filter behavior.

## Deferred follow-ups

- Keep `CountTile` local for now. Graduate an interactive count-tile primitive
  to `@pest-patrol/ui` only when a second screen needs the same pattern.
- Defer `proofCompletionTone` until the closeout domain package is next
  touched. The right fix is a domain-exported typed completion state, not a UI
  string-matching patch.
- Defer per-chemical usage-log scoping to a future inventory-detail or
  inventory-history slice. The V1 overview log remains aligned with the
  original proposal.
- Revisit the persistent inventory form rail only after operator feedback shows
  scanability pressure at desktop widths.

## Rejected or out of scope

- No migrations, provider setup, Supabase dashboard work, preview or production
  mutations, app-chrome logo changes, map provider work, or charting dependency
  changes are part of this critique follow-through.
- No direct database calls from UI components were requested or accepted.

## Verification needed

- Focused red/green tests for the inventory label token and closeouts all-jobs
  row consistency.
- Full repo gates from `docs/AGENTS.md`: `corepack pnpm test`,
  `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and
  `git diff --check`.

## Next relay handoff

- Created `.claude/design/014-inventory-usage-closeout-proof-states/brief.md`
  as a planning-only handoff for inventory usage affordances and closeout
  proof-state clarity. Any typed domain-state work remains Codex-owned and
  approval-gated before implementation.
