# In Progress

## Task: Customer Ledger Drill-Down V1

Goal:
Create a deeper customer ledger drill-down plan for `/customers` using existing customer, job, invoice, payment, closeout, and portal handoff data without migrations or provider changes.

Steps:
- [x] Confirm the billing work queue critique patch is already represented in code and focused tests
- [x] Create the Claude customer ledger drill-down brief
- [x] Review Claude's proposal with Adopt/Adapt/Defer/Reject and add a durable review marker
- [x] Implement the approved ledger drill-down slice
- [x] Run focused and full repository verification

Follow-up candidates:
- [ ] Provider-approved portal resend/send route
- [ ] Portal token audit event log or revoke-confirm flow
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Slice 3 is implemented locally and verified. The customer ledger now expands into a filterable drill-down with row actions and review handoffs, using existing customer, job, invoice, payment, closeout, and portal data only.
