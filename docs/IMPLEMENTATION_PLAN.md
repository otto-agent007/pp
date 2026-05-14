# Implementation Plan

## Current Priority: Preview Launch Readiness

1. Treat PR #27 as merged and start readiness work from updated `main`.
2. Prepare an operator-assisted Vercel preview backed by an approved Supabase environment.
3. Keep provider dashboard changes, environment variable mutations, production data mutations, and migration application operator-approved only.
4. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
5. Leave `tools/` untouched because it is unrelated local MCP/tooling scratch.
6. Current baseline includes portal send critique cleanup, dispatch technician preselection from `/dispatch?technician=...`, a Ready Vercel preview, and aligned Supabase migrations through `20260513120000_portal_send_audit_events_v1.sql`.
7. The current launch gate is operator access for authenticated smoke, not repo implementation work.

## Next Decision Points

1. Operator confirms the protected-preview browser access path and admin/dispatcher sign-in path for authenticated smoke.
2. Operator confirms whether optional Stripe, portal, and notification provider env vars are intentionally unset for manual fallback mode.
3. Run the authenticated preview smoke checklist and record sanitized pass/fail findings in `docs/PREVIEW_SMOKE_FINDINGS.md`.
4. Triage any smoke-proven blockers; implement only small repo-contained fixes without migrations, provider setup, dashboard mutations, or production data changes.
5. Decide whether provider delivery receipts, richer provider failure states, or production launch checklist work should be the next product slice after operator-assisted webhook smoke testing.
