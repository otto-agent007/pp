# In Progress

## Task: Daily Route Timeline V1

Goal:
Turn the technician mobile home into a guided daily route timeline while keeping dispatch aligned with the technician-facing route order.

Steps:
- [x] Add shared route timeline domain helper from assigned jobs, status priority, schedule order, and offline queue readiness
- [x] Replace the flat mobile daily job list with current, next, and compact later route sections
- [x] Preserve full field capture controls for current and next mobile jobs
- [x] Add a provider-free dispatch companion note for technician route ordering
- [x] Run full repository verification

Follow-up:
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Daily route timeline implementation is complete on `codex/daily-route-timeline-v1`; full test, typecheck, lint, and build verification passed.
