# Codex Critique Intake: Portal Share/Resend V1

## Valid fixes applied

- Restored the proposal's portal copy tone: em-dash labels, `Couldn't` error copy, checkmark success confirmation, active-never-opened body copy, and session notice contraction.
- Removed the duplicate `Portal readiness` badge strip so the panel stays in the intended readiness card, generate/share controls, and audit list flow.
- Moved the generate error inline with the generate controls and kept revoke errors below the audit list.
- Added a transient `Copied!` state for copy actions with timeout cleanup on unmount.
- Added scroll/focus return to the expiration input when admins choose `Generate new`.
- Compressed token audit rows so state and created date share the first line, with expiry/opened status and revoke action on the second line.
- Added local `revokingId` state so the clicked row owns the `Revoking...` label while preserving the existing React Query mutation and optimistic rollback hook.

## Deferred follow-ups

- Same-year compact date formatting remains optional polish.
- Revoke confirmation, max-one-active enforcement, no-expiration special warnings, dismissible session notice, provider sending, revoke-all, token expiry nudges, portal-opened event logs, and customer-list portal badges stay outside this V1 patch.

## Rejected or out of scope

- No schema, RLS, provider, dashboard, production, service-role, raw-token persistence, or direct Supabase UI work was accepted from the critique.

## Verification notes

- Focused portal-link tests were updated for the critique behavior and passed locally.
- Full repository verification should run before this critique patch is called complete or committed.
