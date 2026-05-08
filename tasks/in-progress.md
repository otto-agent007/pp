# In Progress

## Task: Billing Work Queue V1

Goal:
Rework `/closeouts` into a compact billing work queue that groups completed jobs by readiness while keeping `/payments` as the invoice workspace.

Steps:
- [x] Add aggregate closeout capture summaries through `packages/api-client`
- [x] Add shared billing queue grouping/count helpers in `packages/domain`
- [x] Retitle `/closeouts` and render queue counters, grouped sections, and next-action states
- [x] Add `/payments` "From closeouts" handoff strip while preserving invoice preselection
- [x] Add focused API-client, domain, closeouts UI, and payments UI coverage
- [x] Run final full repository verification

Follow-up candidates:
- [ ] Bilingual field copy
- [ ] Payment reconciliation polish
- [ ] Portal readiness polish
- [ ] Customer ledger
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Implementation and final full verification are complete on `codex/billing-work-queue-v1`.
