# In Progress

## Task: Portal/Ledger Smoke Coverage V1

Goal:
Add production-readiness smoke coverage for the completed `/customers` ledger, portal link, and tokened portal workflow without migrations, provider setup, or production mutations.

Steps:
- [x] Complete and commit Portal Revoke Confirmation V1 cleanup
- [x] Update production smoke checklist for customer ledger drill-down and portal share/revoke readiness
- [x] Confirm the checklist keeps provider, token, and customer-safe portal boundaries explicit
- [x] Run docs-only verification

Follow-up candidates:
- [ ] Provider-approved portal resend/send route
- [ ] Portal token audit event log
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Slice 005 is implemented locally as a docs-only smoke coverage pass after the verified Portal Revoke Confirmation V1 commit.
