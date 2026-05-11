# Claude Design Brief: Customer Ledger Drill-Down V1

## Summary

Create UI/design recommendations for a deeper admin customer ledger drill-down that helps office users inspect a customer's service and billing history from existing `/customers`, `/jobs`, `/payments`, `/closeouts`, and portal handoff data. Codex will own implementation, data flow, tests, architecture boundaries, and GitHub stewardship. Claude should focus on compact operations-focused hierarchy, copy, filtering, empty/error/loading states, and interaction flow.

## Target Screens

- `/customers`: active customer cards, especially the existing `CustomerLedgerSummary`.
- Optional route or in-page detail pattern if Claude recommends one, but keep it compatible with a V1 no-migration implementation.
- Context around handoffs to `/jobs`, `/closeouts`, `/payments`, and portal sharing when useful.

## Current State

Admins can already see a compact account ledger panel inside each active customer card:

- Open balance
- Paid total
- Latest invoice
- Latest service
- Up to four recent ledger entries from existing jobs and invoices
- Payment review count if any ledger entries need review
- An `Open billing` link

Existing domain helpers already build customer-scoped entries and summaries from loaded customers, jobs, invoices, and payment reconciliation:

- `buildCustomerLedger`
- `getCustomerLedgerSummary`
- `buildBillingPortalNextActions`

Important implementation detail: the current ledger is derived from existing data already loaded through React Query hooks. It does not need schema changes, direct Supabase access, provider calls, or production data changes.

## User Goal

Office users need to quickly answer:

- What has happened with this customer's service and billing history?
- Which invoices are open, paid, partial, void, draft, or need review?
- Which services are scheduled or completed?
- What should I do next: schedule work, review closeout, create/open invoice, review payment, or share the portal?
- Is this account ready for billing or portal follow-up?

## Design Ask For Claude

Recommend a compact drill-down flow for:

- Expanding from the current customer-card ledger summary into a fuller ledger view.
- Timeline/list grouping for service and invoice entries.
- Filters or tabs for all activity, services, invoices, open balance, and review-needed items.
- State copy and hierarchy for empty, loading, error, no invoices, no jobs, review-needed, paid, open balance, scheduled service, completed service, and portal-ready handoffs.
- Primary and secondary actions per ledger entry.
- How to avoid turning customer cards into overly tall dashboards.

## Constraints And Guardrails

- No schema changes, migrations, RLS changes, provider setup, email/SMS setup, dashboard mutations, production data changes, or new secrets.
- No direct Supabase calls from UI components. UI must continue through existing React Query hooks, `packages/domain`, and `packages/api-client`.
- Use existing customer, job, invoice, payment, closeout, and portal-token data only.
- Do not expose provider ids, raw provider payloads, payment link secrets, service-role behavior, internal notes beyond existing admin-safe fields, token hashes, raw tokens, or raw storage paths.
- Keep customer portal authorization semantics unchanged. Customer ids alone are not authorization.
- Keep the design utilitarian and office-operations focused, not marketing-like.
- Avoid adding a standalone route unless Claude thinks the drill-down cannot remain ergonomic in `/customers`; if recommending a route, explain why and keep it no-migration/no-provider.

## Expected Claude Output

- Recommended information hierarchy for the customer ledger drill-down.
- Suggested summary metrics, timeline row layout, grouping, filters/tabs, and empty/error/loading states.
- Primary and secondary action copy per ledger state.
- Guidance on whether V1 should be inline expansion, a side panel, or a route such as `/customers/[customerId]/ledger`.
- Copy bank for labels, helper text, empty states, error states, and action buttons.
- AGENTS conformance self-check.
- Follow-up ideas that are useful but out of scope for V1.

## Non-Goals

- Building the implementation.
- Designing database access, migrations, RLS policies, provider delivery, accounting exports, email/SMS, or production dashboard changes.
- Changing invoice, payment, job, closeout, portal token, or customer schemas.
- Customer-facing portal redesign.
- Replacing `/payments` as the invoice workspace or `/closeouts` as the billing work queue.

## Assumptions

This is the next UI-heavy follow-up after Portal Share/Resend V1. Claude's proposal is advisory; Codex will adapt useful hierarchy, copy, state maps, and interaction guidance to existing components, shared domain helpers, tests, and no-migration constraints.
