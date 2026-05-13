# In Progress

## Task: Portal Send Provider V1

Goal:
Implement approved provider-backed portal sending for freshly generated customer portal links while keeping row-level resend, encrypted token storage, schema/RLS changes, persistent send events, delivery receipts, provider setup, and production mutations out of scope.

Steps:
- [x] Complete and verify local Portal Token Audit Events V1
- [x] Create `.claude/design/009-portal-send-resend-provider-boundary/brief.md`
- [x] Receive `.claude/design/009-portal-send-resend-provider-boundary/proposal.md`
- [x] Review Claude's proposal and write `.claude/design/009-portal-send-resend-provider-boundary/codex-review.md`
- [x] Decide whether provider send/resend implementation is explicitly approved
- [x] Implement session-link portal send route, API-client/domain/hook wiring, and generated-link UI
- [x] Run full verification

Follow-up candidates:
- [ ] Decide whether V2 resend generates a new token or stores encrypted token material
- [ ] Decide whether portal send attempts become durable audit events
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Portal Send Provider V1 is implemented and verified for freshly generated session links only. No row-level resend, encrypted token storage, schema/RLS change, persistent send events, delivery receipts, production migration apply, or provider dashboard mutation is included. Next decision is whether V2 resend generates a fresh token or stores encrypted token material.
