# In Progress

## Task: Live Admin Smoke Test V1

Goal:
Confirm the live Vercel app works end-to-end against the production Supabase project after the technician and security hardening releases.

Steps:
- [x] Merge Supabase Security Hardening V1
- [x] Apply `20260507220000_supabase_security_hardening_v1.sql` to production after explicit approval
- [x] Confirm local and remote Supabase migration history are aligned
- [x] Confirm high-risk internal helper functions moved out of public RPC reach
- [x] Rerun Supabase security and performance advisors with Supabase CLI
- [ ] Enable leaked password protection in Supabase Auth settings
- [x] Confirm latest Vercel `main` deployment is live
- [x] Run live smoke checklist for admin sign-in, technicians, jobs, portal, automation, and payments

Status:
Live admin smoke testing passed for the current production scope. Supabase advisors show one remaining security warning: leaked password protection is disabled. Performance advisors report no issues.
