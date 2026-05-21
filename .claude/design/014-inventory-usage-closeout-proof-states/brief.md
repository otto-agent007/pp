# Claude Design Brief: Inventory Usage + Closeout Proof States V1

## User Goal

Shape the next small admin polish slice that follows the 013 inventory and
closeouts critique without expanding into migrations, provider setup, or
production work.

The goal is to help office operators answer two scan-time questions faster:

- From `/inventory`, "What has this chemical been used on recently, and what
  should I inspect next?"
- From `/closeouts`, "What proof state is this completed job in, and what
  exact capture or billing step unblocks it?"

## Target Screens

- `/inventory`: chemical inventory list, add/edit form rail, log-usage form,
  recent usage section, and any future per-chemical usage affordance.
- `/closeouts`: billing work queue rows, proof handoff card, proof evidence
  pills, detail rail, and next-action cards.

## Current State Claude Should Assume

- `.claude/design/013-inventory-closeouts-refinement/` is the immediate design
  context.
- `/inventory` already uses shared Patrol UI primitives and keeps recent usage
  as an overview list across the catalog.
- `/closeouts` already uses a shared queue-row shell for completed and
  non-completed jobs, plus a sticky detail rail for proof review.
- `proofCompletionTone` still derives tone from user-facing labels. Codex owns
  any future domain/exported-state change and may keep that work planning-only.
- Codex owns architecture, domain typing, data flow, tests, verification, and
  GitHub hygiene.

## States To Cover

Ready, missing-capture, partial GPS, no GPS, proof-ready, invoice-ready,
invoiced, paid, blocked, no usage, filtered usage, selected chemical, loading,
empty, and error states.

## Constraints

- No migrations.
- No provider setup.
- No Supabase dashboard work.
- No preview or production mutations.
- No direct database calls from UI.
- No new brand/font promotion.
- No app-chrome logo swaps.
- Do not ask Claude to design database schema, RLS, API contracts, or direct
  Supabase behavior.
- Keep the UI suitable for dense admin scanning; avoid marketing-style cards or
  decorative hero treatment.

## Expected Claude Output

Claude should provide UI/design guidance only:

- Recommended information hierarchy for inventory usage history and closeout
  proof-state clarity.
- Copy for per-chemical usage affordances, empty states, evidence labels, and
  next-action labels.
- Suggested visual treatment for proof-state labels that can later map to
  typed Codex/domain states.
- Adopt/adapt/defer guidance for Codex.

Claude should explicitly call out anything that is design-only versus anything
that would require Codex-owned domain or API-client work.
