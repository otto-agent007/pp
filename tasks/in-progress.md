# In Progress

## Task: Supabase Security Hardening V1

Goal:
Clear high-impact Supabase security advisor warnings and remove temporary diagnostics before continuing production smoke testing.

Steps:
- [x] Confirm current Supabase security and performance advisor warnings
- [x] Add a hardening migration for internal helper functions, RLS policy auth calls, and missing FK indexes
- [x] Remove the temporary `/api/diagnostics/auth` endpoint
- [x] Run full repository verification
- [ ] Open and merge a focused hardening PR
- [ ] Apply the migration to production only after explicit approval
- [ ] Rerun Supabase advisors and record remaining dashboard-only actions

Status:
Implementation complete locally. PR and production migration application remain pending. Leaked password protection remains a private Supabase dashboard setting.
