# In Progress

## Task: Portal-Led Batch V1

Goal:
Implement the portal-led next-five batch after PR #26: portal provider readiness, fresh-token resend, minimal send-attempt audit events, payment action confirmations, and technician route-load snapshots. Keep encrypted token storage, delivery receipts, provider dashboard mutation, and production env changes out of scope.

Steps:
- [x] Add admin-authenticated portal provider status route, API-client/domain/hook wiring, UI readiness copy, and production smoke guidance.
- [x] Add active-row `Send new link` behavior that creates a fresh portal token before requesting provider send, preserving manual copy fallback.
- [x] Persist minimal portal send-attempt audit events: `send_requested` and `send_failed`.
- [x] Add inline confirmation for payment `Mark paid` and `Void` actions.
- [x] Add technician route-load summaries from existing jobs and show today/upcoming/status with dispatch handoff links.
- [x] Run focused and full verification.

Follow-up candidates:
- [ ] Apply the new portal send audit enum migration in the target Supabase environment during an approved deployment window.
- [ ] Decide whether dispatch should consume `/dispatch?technician=...` as a preselected technician filter.
- [ ] Decide whether portal send events need provider delivery receipts after webhook-backed sends prove useful.
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Portal-Led Batch V1 is implemented and verified locally. Fresh resend generates a new token and sends only that session URL while raw token material is available. Send-attempt history stores only provider-safe event kinds and does not persist provider payloads, raw URLs, token hashes, or provider IDs. No delivery receipts, provider dashboard changes, production data changes, or environment mutations are included.
