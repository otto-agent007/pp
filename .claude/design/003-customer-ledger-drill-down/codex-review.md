# Codex Review: Customer Ledger Drill-Down V1

## Adopt

- Inline expand/collapse inside the existing `CustomerLedgerSummary`.
- Keep the collapsed customer card compact and reveal the full ledger only on demand.
- Add ledger filters for all activity, services, invoices, open items, and review-needed items.
- Use existing customer, job, invoice, payment, closeout, and portal handoff data only.
- Preserve `/customers` as the account ledger surface, `/payments` as the invoice workspace, and `/closeouts` as the billing work queue.

## Adapt

- Keep the expanded ledger bounded so active customer cards do not grow without limit.
- Verify and use only URL handoffs that are already safe for the target pages.
- Exclude draft invoices from the Open filter because drafts are internal work in progress, not open receivables.

## Defer

- Customer deep-link expansion state.
- Portal-ready chip in the customer card header.
- Inline create-invoice actions on completed service rows.
- Month grouping for long ledgers.

## Reject

- No new route for V1.
- No migrations, RLS changes, provider setup, email/SMS setup, or production data changes.
- No direct Supabase access from UI components.
- No raw token, provider payload, provider id, service-role, or internal secret exposure.

## Implementation Recommendation

Implement Customer Ledger Drill-Down V1 in `CustomerLedgerSummary` with local expanded and tab state, derived filters over the existing ledger entries, safe row actions, review alert handoff copy, and focused tests for expand/collapse, tab filtering, review actions, empty filters, and provider metadata non-exposure.
