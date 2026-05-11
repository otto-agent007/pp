# Codex Critique Review: Portal Revoke Confirmation V1

## Valid fixes

- Apply Claude's Cancel focus finding. The Cancel button was clearing the confirmation without preserving the source token id, so focus could fall back to the document body.
- Add a regression test that opens a revoke confirmation, clicks Cancel, and confirms focus returns to the same row's Revoke button.

## Deferred follow-ups

- Keep ASCII `Revoking...` for now because the surrounding component already uses ASCII loading copy.
- Park undo toast, stronger no-expiration warning copy, revoke-all, persistent revoke audit fields, and customer-list portal-ready badges for future slices.

## Rejected/out-of-scope items

- No migrations or portal token schema changes.
- No provider, email, SMS, or automatic send/resend implementation.
- No direct Supabase access from UI.
- No raw token persistence changes.

## Verification needed

- Run the focused `CustomerPortalLinks` test file.
- Run the normal repo gate: tests, typecheck, lint, build, and `git diff --check`.
