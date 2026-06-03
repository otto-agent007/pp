# Production Readiness V1

This checklist prepares Pest Patrol OS for a first real GitHub, Supabase, and Vercel setup.

For the current preview-first launch pass, use `docs/PREVIEW_LAUNCH_READINESS.md` as the short punch list. This document remains the detailed setup and smoke-test reference.

## Required Environment Variables

Web app:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Supabase anon key protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Used by portal access routes to validate hashed customer portal tokens and return customer-safe closeouts. Never expose as `NEXT_PUBLIC_*`. |
| `STRIPE_SECRET_KEY` | Server only | Used only by `apps/web/app/api/payments/payment-link/route.ts`. Never expose as `NEXT_PUBLIC_*`. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Used only by `apps/web/app/api/payments/stripe-webhook/route.ts` to verify Stripe webhook signatures. Never expose as `NEXT_PUBLIC_*`. |
| `NOTIFICATION_DELIVERY_WEBHOOK_URL` | Server only | Optional webhook endpoint for Notification Delivery V1. If omitted, delivery is recorded through the server-side manual provider. |
| `NOTIFICATION_DELIVERY_WEBHOOK_SECRET` | Server only | Optional bearer secret sent only from the server delivery route to the webhook provider. |
| `PORTAL_DELIVERY_WEBHOOK_URL` | Server only | Optional webhook endpoint for Portal Send Provider V1. If omitted, generated portal links remain manual-copy only. |
| `PORTAL_DELIVERY_WEBHOOK_SECRET` | Server only | Optional bearer secret sent only from the server portal-send route to the portal delivery webhook. |
| `CRON_SECRET` | Server only | Vercel Cron secret sent as a Bearer token to `apps/web/app/api/automation/scheduler/route.ts`. |
| `AUTOMATION_CRON_SECRET` | Server only | Optional project-specific secret for manual or non-Vercel scheduler calls. |
| `OPENAI_API_KEY` | Server only | Optional key for California Compliance RAG advisory retrieval. If omitted, `/compliance` reports RAG disabled instead of failing. Never expose as `NEXT_PUBLIC_*`. |
| `OPENAI_COMPLIANCE_EMBEDDING_MODEL` | Server only | Optional embedding-model override for compliance retrieval; defaults to the code-level baseline when unset. |

Mobile app:

| Variable | Scope | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile runtime | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile runtime | Supabase anon key protected by RLS. |

## Supabase Setup Order

1. Create the Supabase project.
2. Apply migrations in timestamp order from `supabase/migrations`.
3. Create the private `job-media` bucket if not created by the migration runner.
4. Create the first admin user in Supabase Auth.
5. Manually bootstrap the admin profile:

```sql
insert into profiles (id, role)
values ('<auth-user-id>', 'admin')
on conflict (id) do update
set role = 'admin', updated_at = now();
```

6. Create dispatcher users in Supabase Auth as needed and set matching `profiles.role` values.
7. Invite technician users from `/technicians` so the configured auth email path sends the password setup link and the app stores technician profile metadata.
8. Confirm RLS is enabled on all migrated tables before production traffic.

## Supabase Auth Redirects

Password recovery links must return to the deployed app, not localhost.

1. Set Supabase Auth Site URL to the production Pest Patrol OS domain.
2. Add `https://<production-domain>/auth/update-password` to the allowed redirect URLs.
3. Add `https://<production-domain>/technician-login` to the allowed redirect URLs so technician invites land on the technician setup page.
4. Keep `http://localhost:3000/auth/update-password` and `http://localhost:3000/technician-login` allowed for local development only.
5. Request password resets from `/forgot-password` so Supabase sends a recovery link with the app's `/auth/update-password` redirect.
6. Invite technicians from `/technicians` so the configured auth email path sends an invite link with the app's `/technician-login` redirect.
7. Treat any pasted recovery, invite, or magic-link URL as exposed and request a fresh link.

## Supabase Dashboard Security

1. Keep service-role keys private and rotate them if they are ever pasted into chat, logs, or docs.
2. Rerun Supabase security and performance advisors after every production migration.
3. Treat unused-index recommendations as advisory until the production database has enough real traffic to judge query patterns.
4. If the project upgrades to Supabase Pro, enable leaked password protection in Supabase Auth settings.

Latest hardening status:

- `20260507220000_supabase_security_hardening_v1.sql` was applied to production on May 7, 2026 after explicit approval.
- Local and remote Supabase migration history were aligned after repairing a duplicate technicians migration timestamp.
- Supabase CLI advisors were rerun after the hardening migration.
- Performance advisors reported no issues.
- Security advisors reported one remaining warning: leaked password protection is disabled.
- This warning is deferred while the project is not on a Supabase Pro plan.

## Vercel Setup

1. Import the GitHub repository into Vercel.
2. Set the project root or build settings so Vercel builds `apps/web`.
3. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NOTIFICATION_DELIVERY_WEBHOOK_URL`
   - `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`
   - `PORTAL_DELIVERY_WEBHOOK_URL`
   - `PORTAL_DELIVERY_WEBHOOK_SECRET`
   - `CRON_SECRET`
   - `AUTOMATION_CRON_SECRET`
   - `OPENAI_API_KEY` (optional, server-only compliance RAG)
   - `OPENAI_COMPLIANCE_EMBEDDING_MODEL` (optional compliance RAG model override)
4. Keep `apps/web/vercel.json` with the deployed web app so `/api/automation/scheduler` runs daily at 05:00 UTC.
5. Use Node 20.x.
6. Build command: `corepack pnpm build`.
7. Install command: `corepack pnpm install --frozen-lockfile`.
8. Deploy a preview, then run the smoke tests below.

## Preview Launch Guardrails

- Provider setup is operator-assisted: Codex may verify names and smoke-test behavior, but it must not mutate Vercel, Supabase, Stripe, notification, or portal provider dashboards without explicit approval.
- For preview, optional `NOTIFICATION_DELIVERY_*` and `PORTAL_DELIVERY_*` webhook variables may be omitted. When omitted, smoke tests should confirm manual fallback behavior instead of provider delivery.
- Migration application is operator-approved only. A new preview database should apply every approved file in `supabase/migrations` in timestamp order. The compliance RAG migration `20260516175724_california_compliance_rag_v1.sql` remains proposal-only until the operator explicitly approves the target environment.
- Local deployment packaging verification should include `corepack pnpm dlx vercel build --yes` after ignored generated output is cleared. If it fails while `corepack pnpm build` and Git-integrated Vercel deployments stay green, record the exact local Vercel CLI packaging blocker instead of changing provider settings.
- Never paste secrets, recovery links, portal URLs with raw tokens, provider payloads, or production records into docs, commits, task files, or chat.

## Smoke Tests

Use this manual checklist when admin login credentials are ready. Do not run
these against production until the operator is comfortable keeping the records
created during the check.

| Step | Route | Success criteria |
| --- | --- | --- |
| Admin sign-in | `/` | Admin can sign in and load the protected admin shell. |
| Create customer and location | `/customers` | Active customer saves with at least one active location. |
| Invite technician | `/technicians` | Technician invite sends through the configured auth email path, the technician appears by display name, and dispatch assignment remains the next handoff. |
| Technician password setup | `/technician-login` | Invite link lets the technician set a password without entering the admin shell. |
| Create job | `/jobs` | Scheduled job saves against the new customer and location. |
| Queue field captures | Expo mobile app | Technician queues status, geofence, form, chemical, photo, and signature captures offline-first. |
| Review closeout | `/closeouts` | Office can review synced field captures and see whether billing is ready. |
| Generate portal access | `/customers` | Portal link opens token-protected customer closeout data; provider readiness shows webhook or manual-only mode without exposing env values, and active rows can request a fresh-link send. |
| Review customer ledger | `/customers` | Customer account ledger expands with service, invoice, open-balance, and review filters without exposing provider payment metadata. |
| Revoke portal access | `/customers` | Active portal links require confirmation before revoke and revoked links stop loading customer portal data. |
| Run scheduler | `/automation` | Manual scheduler run records a successful run history row. |
| Check billing path | `/payments` | Invoice or payment setup state is visible without secret exposure. |
| Review compliance workspace | `/compliance` | Source counts, source-readiness workflow cards, Chemical Product Binder summaries/cards, and advisory audit state render; binder status is deterministic from existing records, and when `OPENAI_API_KEY` is absent the page reports RAG disabled without exposing secrets. If `20260516175724_california_compliance_rag_v1.sql` is not applied, the page reports setup required without raw Supabase errors. |

Admin web:

1. Sign in as an admin or dispatcher.
2. Create a customer with at least one service location.
3. Create a completed job for that customer and location.
4. Open `/closeouts` and confirm the completed job appears.
5. Open `/payments`, create an invoice for the completed job, and confirm it moves through draft and sent states.
6. Return to `/customers`, expand the customer's account ledger, and confirm all/services/invoices/open/review filters show service and billing history without provider payment ids, raw payment records, or admin notes.
7. Confirm the customer card's portal readiness explains whether closeout and billing data are ready to share.
8. Configure Stripe to send `checkout.session.completed` events to `/api/payments/stripe-webhook`, then confirm a test payment marks the matching invoice paid.
9. Open `/automation`, create a notification template with variables, confirm the preview renders customer/location/date values, bind it to a follow-up rule, create a reminder from the template, then mark it handled.
10. Confirm the `/automation` scheduler preview shows due notification copy, target context, generated keys, and duplicate labels before any run is executed.
11. Trigger `/api/automation/scheduler` with `Authorization: Bearer <CRON_SECRET>` and confirm due bound rules generate pending notification events with interpolated template copy and no duplicates.
12. Open `/automation`, use the manual Run scheduler action, and confirm the scheduler panel refreshes without using a cron secret in the browser.
13. Confirm the `/automation` scheduler panel shows the latest run status, cron/manual source, created count, duplicate count, and generated notifications.
14. Send one pending reminder and then send visible pending reminders in bulk; confirm delivery status updates and failed reminders remain visible through the delivery-status filter and Failed/Retryable quick filters without exposing provider secrets in the browser.
15. If a notification webhook is configured, inspect the provider request and confirm the payload includes event, target, customer, job, and location context while excluding internal service notes and provider secrets.
16. Confirm sent reminders show provider message ids when the provider returns one, and failed retries do not show stale provider message ids.
17. Trigger a notification delivery and confirm the reminder briefly moves through `sending`; duplicate sends while `sending` or already `sent` should be rejected without creating a second provider request.
18. Confirm notification cards show whether each reminder has customer email and/or phone contact data, including a visible missing-contact state.
19. Confirm `/automation` shows provider mode without exposing webhook URL or secret values.
20. Use recipient readiness filters to confirm reachable, missing-contact, email-ready, and phone-ready reminders can be isolated.
21. Confirm sent or failed delivery attempts show last-attempt timing and the delivery controls show total attempts.

Mobile technician:

1. Sign in through the Expo app as an invited technician.
2. Confirm the mobile home screen shows the technician readiness panel, assigned-job count, sync status, and refresh action.
3. Open an assigned job card and confirm customer, address, schedule, status, and service notes are readable.
4. Confirm the assigned job card shows the field work plan for status, geofence, chemical log, photo, signature, and treatment form captures.
5. Queue a status update and confirm the sync panel shows pending work with a capture-specific label.
6. Queue treatment form, chemical log, photo, signature, and location events where demo permissions/devices allow.
7. Toggle or simulate offline state during queued work and confirm the app explains that captures remain local.
8. Return online or tap Sync and confirm synced items can be cleared after review.
9. Confirm no mobile screen asks for service-role keys, cron secrets, Stripe secrets, or webhook secrets.

Customer portal:

1. Open `/customers` and find a customer with completed closeouts and at least one invoice.
2. Expand the account ledger and confirm service rows, invoice rows, open balances, and review-needed items match the customer history already visible in `/closeouts` and `/payments`.
3. Generate a portal access token and confirm the latest-link area offers copy/share readiness.
4. Confirm the portal provider readiness copy reports webhook-backed or manual-only mode without exposing the webhook URL or secret.
5. If `PORTAL_DELIVERY_WEBHOOK_URL` is configured, use `Send link ▶` and confirm the UI says `Send requested` without claiming delivery.
6. From an active token row, use `Send new link` and confirm it creates a fresh session link before requesting send; if the provider fails, the fresh link remains available for manual copy.
7. Open `/portal/<customer-id>?access_token=<token>`.
8. Confirm completed closeouts render service date, location, customer-safe capture counts, and invoice state.
9. Confirm completed closeouts render without internal service notes, technician details, chemical logs, or inventory internals.
10. Confirm private job media renders through signed URLs.
11. Confirm open and paid invoices render without provider ids, raw payment records, or admin billing notes.
12. Return to `/customers`, open the active token row, and confirm revoke requires the inline "Confirm revoke" action.
13. Cancel revoke once and confirm focus returns to the same Revoke button.
14. Confirm revoke, then open the old tokened portal URL and confirm closeouts and billing no longer load.
15. Open `/portal/<customer-id>` without a token and confirm closeouts and billing do not load.

Mobile:

1. Sign in as a technician.
2. Confirm assigned jobs load.
3. Queue a form submission, job status update, chemical log, photo, signature, and geofence event while offline.
4. Restore connectivity and confirm the sync worker marks queued writes as synced.

## Security Boundaries

- UI components must not import `supabase` directly.
- Provider secrets must stay in server-only code.
- Stripe webhook signing secrets must stay behind `apps/web/app/api/payments/stripe-webhook/route.ts`.
- Notification delivery provider URLs and secrets must stay behind `apps/web/app/api/automation/notifications/[notificationId]/deliver/route.ts`.
- Portal delivery provider URLs and secrets must stay behind `apps/web/app/api/portal/access-tokens/send/route.ts`.
- Automation scheduler generation must stay behind `apps/web/app/api/automation/scheduler/route.ts` and require either Vercel `CRON_SECRET` or `AUTOMATION_CRON_SECRET`.
- Manual scheduler runs must stay behind admin/dispatcher auth and must not expose cron secrets to the browser.
- Automation scheduler run history is admin/dispatcher-readable only and should not expose provider secrets or customer portal data.
- Customer portal payloads must stay narrower than admin payloads.
- Customer portal reads must go through token-validated server routes; customer ids alone are not sufficient authorization.
- Portal send V1 is session-link only; existing active links cannot be resent because only token hashes are stored.
- Customer portal billing must never expose provider payment ids, raw payment records, admin invoice notes, or void/draft invoices.
- Mobile write paths must remain queue-first and retry-safe.
- The Supabase anon key is acceptable in web/mobile only because RLS owns authorization.
- Refunds, customer billing history, SMS, and email delivery are not part of this readiness slice.
- Temporary diagnostics endpoints must be removed before routine production use.
