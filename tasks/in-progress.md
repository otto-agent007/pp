# In Progress

## Task: Next Five Portal + Ledger Batch V1

Goal:
Connect portal readiness, customer ledger, customer-safe portal timeline, and billing handoff polish across existing customers, jobs, closeouts, invoices, payments, and portal tokens without migrations or provider changes.

Steps:
- [x] Add portal access token readiness helpers, summaries, and customer portal link UI polish
- [x] Add domain-only customer ledger helpers and admin customer ledger summaries on `/customers`
- [x] Add a customer-safe portal timeline from existing portal closeout and billing payloads
- [x] Add billing/portal next-action helpers and wire `/closeouts`, `/payments`, and `/customers` handoffs
- [x] Run final full repository verification

Follow-up candidates:
- [ ] Deeper customer ledger drill-down page
- [ ] Portal share auditing and resend workflow
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Implementation and final full repository verification are complete locally.
