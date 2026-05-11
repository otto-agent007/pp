# In Progress

## Task: Portal Revoke Confirmation V1

Goal:
Create a safer revoke-confirmation flow for customer portal links on `/customers` without migrations, provider setup, or automatic send/resend behavior.

Steps:
- [x] Clean up the completed customer ledger drill-down slice state
- [x] Create the Claude portal revoke confirmation brief
- [ ] Review Claude's proposal with Adopt/Adapt/Defer/Reject and add a durable review marker
- [ ] Implement the approved revoke confirmation slice
- [ ] Run focused and full repository verification

Follow-up candidates:
- [ ] Provider-approved portal resend/send route
- [ ] Portal token audit event log
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Slice 004 relay brief is created locally; waiting on Claude proposal before implementation.
