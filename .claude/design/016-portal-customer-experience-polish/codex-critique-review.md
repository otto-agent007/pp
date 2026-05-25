# Codex Critique Review: Portal Customer Experience Polish V1

This marker processes Claude's post-implementation critique for 016.

## Adopted in cleanup

- Replaced the remaining `border-primitive-slate-100` invoice line-item
  divider with `border-theme-border-subtle`.

## Deferred follow-ups

- Dedicated portal invoice detail pages, payment history drill-downs, timeline
  icons, and search layout changes remain out of scope.

## Rejected or out of scope

- No portal auth changes, payment provider changes, Supabase writes,
  migrations, seed/reset work, env changes, preview mutations, or production
  mutations.
- No customer-unsafe data exposure: signed URLs, exact GPS, raw tokens,
  payment provider IDs, provider payloads, and internal notes stay hidden.

## Verification needed after fixes

- Focused portal tests for token and proof surfaces.
- For code follow-through, run the relevant focused tests plus the repo gates
  required by `docs/AGENTS.md`, ending with `git diff --check`.
