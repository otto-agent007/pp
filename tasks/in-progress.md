# In Progress

## Task: Field Workflow Batch V1

Goal:
Connect the technician field workflow from assigned mobile jobs through queued captures, office closeout readiness, customer portal service summaries, and billing handoff.

Steps:
- [x] Sync local `main` to the merged mobile demo-readiness PR
- [x] Add mobile job work-plan readiness from status and queued captures
- [x] Add office closeout billing-readiness summary
- [x] Add customer-safe portal service summaries
- [x] Add capture-specific mobile queue labels
- [x] Extend production smoke checklist for field captures and closeout review
- [x] Run full repository verification

Follow-up:
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Field workflow batch implementation is complete on `codex/field-workflow-batch-v1`; full test, typecheck, lint, and build verification passed.
