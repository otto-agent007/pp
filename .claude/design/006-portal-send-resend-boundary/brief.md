# Portal Send/Resend Boundary Brief V1

## Goal

Design the admin-facing UI guidance for a future provider-approved portal send/resend flow on `/customers`, centered on `CustomerPortalLinks`.

Codex will own implementation, route boundaries, provider integration, tests, security review, GitHub stewardship, and any future data-flow changes. Claude should only advise on compact UI hierarchy, copy, and interaction states.

## Current State

Admins can:

- Generate a customer portal access link.
- Copy the latest generated link.
- Use manual share/copy affordances when the clipboard is available or unavailable.
- See active, expired, revoked, never-opened, and opened token rows.
- Revoke active links through an inline confirmation flow.
- Review customer ledger and portal readiness context elsewhere on the customer card.

The current slice is not adding automatic email or SMS delivery.

## Target Surface

- `/customers`
- `CustomerPortalLinks`
- The latest-link/share area and the token row action area.

## Guidance Needed

Please recommend:

- The compact hierarchy for manual share, future send, and resend actions.
- Button/action copy that distinguishes copy/manual share from provider-backed send/resend.
- State copy for missing customer contact, provider not configured, provider blocked, sending, sent, failed, retryable, copied, clipboard unavailable, generated, no active link, expired, revoked, never opened, recently opened, and revoke-pending.
- How to show send/resend readiness without implying automatic delivery exists before Codex adds a provider-approved route.
- How audit/readiness feedback should appear near token rows without crowding operations.
- The interaction flow for generate, copy, manual share, future send, resend, failed retry, and revoke.

## Constraints

- Follow `docs/AGENTS.md`.
- No direct Supabase access from UI.
- No service-role exposure.
- No raw token persistence.
- No migration or token schema changes in this slice.
- No provider setup, provider secrets, dashboard changes, or production mutations.
- No automatic sending yet. Treat send/resend as future provider-approved affordances unless Codex later adds a server route and provider boundary.
- Do not design mobile offline write behavior for this web admin slice.

## Non-Goals

- Implementing email, SMS, webhook, queue, or notification provider delivery.
- Adding a database audit table or persistent send event log.
- Changing portal token authorization, hashing, expiration, or revoke behavior.
- Adding new customer contact fields.
- Creating migrations.

## Expected Claude Output

Please write `proposal.md` with:

- Recommended layout for the portal-link panel.
- State labels and action copy.
- Readiness/audit summary treatment.
- Interaction flow for generate, copy, manual share, future send/resend, failed retry, and revoke.
- AGENTS self-check.
- Follow-ups and explicitly out-of-scope items.
