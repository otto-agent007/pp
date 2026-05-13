# Claude Design Brief: Portal Revoke Confirmation V1

## Summary

Create UI/design recommendations for a safer admin revoke flow inside the existing `/customers` portal access panel. Codex will own implementation, data flow, tests, architecture boundaries, and GitHub stewardship. Claude should focus on compact confirmation copy, interaction states, and how the revoke action should sit inside the existing token audit list without making the customer card noisy.

## Target Screens

- `/customers`, specifically `CustomerPortalLinks`.
- Existing portal token rows for active, expired, revoked, opened, never-opened, and no-expiration links.
- Existing generate/copy/share state around the latest generated portal link.

## Current State

Admins can already:

- Generate a portal access link.
- Copy the latest generated link during the current session.
- See compact portal access readiness.
- Review token rows with active, expired, revoked, opened, and never-opened states.
- Revoke active links directly from the token row.

The current revoke action is immediate. Slice 004 should add a lightweight confirmation step so admins do not accidentally revoke a customer link during a share/resend workflow.

## User Goal

Office users need to quickly revoke stale or duplicate customer portal links while avoiding accidental revocation of a link they just generated or shared.

They need to understand:

- Which link is being revoked.
- Whether the link was never opened, recently opened, expired, or already revoked.
- What happens after revoke.
- How to back out without losing the current generate/copy state.

## Design Ask For Claude

Recommend a compact confirmation flow for active portal token rows:

- Inline confirmation vs. modal/popover recommendation for V1.
- Copy for the revoke trigger, confirmation prompt, confirm action, cancel action, pending state, success/settled state, and error state.
- Visual treatment for the row while confirmation is open.
- How the confirmation should behave when another row is already pending.
- How to keep keyboard and screen-reader behavior understandable.
- How to preserve the existing latest-link copy/generate controls while a row confirmation is open.

## Required States

Cover:

- Active link, no expiration.
- Active link, expires later.
- Never opened.
- Recently opened.
- Expired link.
- Revoked link.
- Revoke confirmation open.
- Revoke pending.
- Revoke error.
- Multiple active links.
- Latest generated link still available in session.
- Clipboard unavailable/manual copy visible.

## Constraints And Guardrails

- No migrations, RLS changes, provider setup, email/SMS setup, production mutations, new secrets, or dashboard changes.
- No direct Supabase calls from UI components.
- Keep using existing React Query hooks and API routes for portal token access.
- Do not expose token hashes, raw tokens beyond the current session-only generated URL behavior, service-role behavior, raw provider payloads, or internal storage paths.
- Do not add automatic resend/send behavior. This slice is only safer manual portal-link administration.
- Keep `/customers` operational and compact. Avoid large modals if inline confirmation is clearer and faster.

## Expected Claude Output

- Recommended confirmation pattern.
- Row hierarchy and visual state treatment.
- Copy bank for trigger, prompt, confirm, cancel, pending, success, and error states.
- Interaction rules for one open confirmation at a time.
- Accessibility notes for keyboard focus and screen-reader labels.
- AGENTS conformance self-check.
- Follow-up ideas that are useful but out of scope for V1.

## Non-Goals

- Provider-approved email/SMS sending.
- Token schema changes or audit event persistence.
- Customer-facing portal redesign.
- Changing portal authorization semantics.
- Replacing the existing token list or generate/copy workflow.

## Assumptions

This is the next safe UI-heavy follow-up after Customer Ledger Drill-Down V1. Claude's proposal is advisory; Codex will adapt useful copy and interaction guidance to the existing component, hooks, tests, and no-migration/provider-free constraints.
