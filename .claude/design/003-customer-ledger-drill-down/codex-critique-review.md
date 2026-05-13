# Codex Critique Review: Customer Ledger Drill-Down V1

## Valid Fixes

- Replace visible `Warning: ` row copy with the compact review prefix requested by the proposal.
- Hide balance pills when invoice balance is zero so paid invoices do not show `Balance $0.00`.
- Add the directional cue to `Hide activity ↑`.
- Match the review alert action copy to `Review →`.
- Keep `needs_review_payment` in the Open filter intentionally because it still represents an open receivable, and document that choice in code.
- Use an em dash fallback for invoice rows without an amount.

## Deferred Follow-Ups

- Deep-link expansion state.
- Portal-ready card header chip.
- Inline create-invoice actions on completed service rows.
- Month grouping for long ledgers.
- A future durable decision log if the team reintroduces one.

## Rejected Or Out Of Scope

- No schema changes, provider setup, new routes, or direct Supabase UI access.
- No expansion of slice 3 beyond the visual/copy polish and small code clarity fixes.

## Verification Needed

- Focused customer tests for ledger expansion, filters, review action copy, and zero-balance behavior.
- Repository test, typecheck, lint, build, and diff whitespace checks before completion.
