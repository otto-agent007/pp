# Auth Production Hardening V1

This checklist documents production auth requirements for Pest Patrol OS. Codex must not mutate Supabase Auth, create production users, enable MFA, change dashboard settings, or rotate secrets unless the operator explicitly approves the exact target and action.

## Supabase Auth settings checklist

- Enable leaked-password protection when the Supabase plan supports it.
- Review strong password policy requirements before production launch.
- Configure Site URL and redirect allowlist for production, protected preview, and approved local callback origins.
- Ensure password reset redirects land only on `/auth/update-password` for approved app origins.
- Review email templates for customer-safe, operator-safe wording and correct links.
- Decide email-confirmation policy before production user onboarding.
- Review session duration and refresh-token behavior for admin, dispatcher, and technician use.
- Decide MFA/admin 2FA policy before production launch.
- Review Supabase Auth rate limits and abuse protection for public auth forms.
- Consider CAPTCHA/bot protection for public auth and reset forms if abuse appears.
- Define inactive technician/admin deactivation and access-revocation process.

## Role bootstrap process

- First admin creation is operator-owned and must not use shared production credentials.
- No shared admin accounts in production.
- Admins can manage launch-critical configuration and records; dispatchers operate day-to-day workflows with least privilege.
- Technician role assignment must grant only technician app/workflow access.
- Role changes should be reviewed and recorded by an owner/admin.

## Password reset flow

- Password reset redirects must stay on approved app origins and `/auth/update-password`.
- Open redirects are not allowed.
- Password setup links must scrub recovery tokens from the URL after parsing.
- Customer portal grants/sessions are separate from staff auth and must not grant admin or technician access.

## Mobile technician auth

- Technician login grants technician-only access.
- Technician profiles must not access admin routes.
- Offline queue behavior must not bypass role or sync boundaries.
- Language preference remains local unless a later approved slice adds server sync.

## Demo account safety

- `demo@email.com` / `password` is for local/protected-preview demo only.
- Never use demo credentials in production.
- Production seeding must not create demo credentials unless an operator explicitly approves a dedicated demo environment.
- Demo seed/reset commands must never point at production.

## Operator checklist before production

- Enable leaked-password protection or record the approved plan limitation.
- Verify Supabase Auth advisors.
- Verify admin and dispatcher login.
- Verify technician login and technician-only access.
- Verify password reset and invite setup links.
- Verify role access boundaries for admin, dispatcher, technician, signed-out users, and customer portal sessions.
- Verify logout/session expiry.
- Verify no raw recovery links, access tokens, portal grants, or secrets are stored in docs, commits, logs, or chat.
