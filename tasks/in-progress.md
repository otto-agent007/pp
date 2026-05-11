# In Progress

## Task: Customer Ledger Drill-Down V1

Goal:
Create a deeper customer ledger drill-down plan for `/customers` using existing customer, job, invoice, payment, closeout, and portal handoff data without migrations or provider changes.

Steps:
- [x] Confirm the billing work queue critique patch is already represented in code and focused tests
- [x] Create the Claude customer ledger drill-down brief
- [ ] Review Claude's proposal with Adopt/Adapt/Defer/Reject and add a durable review marker
- [ ] Implement the approved ledger drill-down slice
- [ ] Run focused and full repository verification

Follow-up candidates:
- [ ] Provider-approved portal resend/send route
- [ ] Portal token audit event log or revoke-confirm flow
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Slice 3 relay brief is created locally; waiting on Claude proposal before implementation.
