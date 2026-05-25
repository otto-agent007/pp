# Codex Critique Review: Inventory Usage + Closeout Proof States V1

This marker processes Claude's post-implementation critique for 014. It is
review-only: no app code changes are included in this relay update.

## Adopted in cleanup

- Replaced the `text-neutralDark` class on the inventory expand-strip customer
  name with `text-theme-text-primary`. The critique claim is valid for the
  new "Recent uses" row and fits the existing semantic-token cleanup path.
- Replaced the closeouts queue-row selected/hover border classes
  `border-primary` and `hover:border-primary` with the corresponding
  `border-theme-action-primary` and `hover:border-theme-action-primary`
  semantic classes.
- Replaced the closeouts detail-rail job status label class `text-secondary`
  with `text-theme-text-secondary`.

## Deferred follow-ups

- Align the low-stock watchlist recency separator to the dot convention only
  when inventory copy is next touched. The current dash separator is readable
  and not a blocker.
- Revisit the recent-use strip layout if the row later gains another data
  point such as technician name. The current two-line amount/date treatment is
  acceptable for V1.
- Keep full chemical history routes, usage charts, compliance cross-reference
  treatment, and typed proof-state domain exports deferred until separately
  approved.

## Rejected or out of scope

- Do not expand this critique into migrations, provider setup, Supabase
  dashboard work, API contract changes, preview mutations, production
  mutations, or direct database calls from UI components.
- Do not rewrite the dense 013/014 inventory or closeouts layouts as part of
  these token and copy follow-ups.
- Do not expose exact technician GPS details to customer-safe portal or billing
  copy.

## Verification needed after fixes

- Focused inventory coverage for the recent-use strip and low-stock recency
  copy if either surface changes.
- Focused closeouts coverage for the selected queue-row border treatment and
  detail-rail status label if those classes change.
- For any code follow-through, run the relevant focused tests plus the repo
  gates required by `docs/AGENTS.md`, ending with `git diff --check`.
