# Production Readiness V1

This checklist prepares Pest Patrol OS for a first real GitHub, Supabase, and Vercel setup.

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
| `CRON_SECRET` | Server only | Vercel Cron secret sent as a Bearer token to `apps/web/app/api/automation/scheduler/route.ts`. |
| `AUTOMATION_CRON_SECRET` | Server only | Optional project-specific secret for manual or non-Vercel scheduler calls. |

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
7. Invite technician users from `/technicians` so Supabase sends the password setup email and the app stores technician profile metadata.
8. Confirm RLS is enabled on all migrated tables before production traffic.

## Supabase Auth Redirects

Password recovery links must return to the deployed app, not localhost.

1. Set Supabase Auth Site URL to the production Pest Patrol OS domain.
2. Add `https://<production-domain>/auth/update-password` to the allowed redirect URLs.
3. Add `https://<production-domain>/technician-login` to the allowed redirect URLs so technician invites land on the technician setup page.
4. Keep `http://localhost:3000/auth/update-password` and `http://localhost:3000/technician-login` allowed for local development only.
5. Request password resets from `/forgot-password` so Supabase sends a recovery link with the app's `/auth/update-password` redirect.
6. Invite technicians from `/technicians` so Supabase sends an invite link with the app's `/technician-login` redirect.
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
   - `CRON_SECRET`
   - `AUTOMATION_CRON_SECRET`
4. Keep `vercel.json` at the Vercel project root so `/api/automation/scheduler` runs daily at 05:00 UTC.
5. Use Node 20.x.
6. Build command: `corepack pnpm build`.
7. Install command: `corepack pnpm install --frozen-lockfile`.
8. Deploy a preview, then run the smoke tests below.

## Smoke Tests

Use this manual checklist when admin login credentials are ready. Do not run
these against production until the operator is comfortable keeping the records
created during the check.

| Step | Route | Success criteria |
| --- | --- | --- |
| Admin sign-in | `/` | Admin can sign in and load the protected admin shell. |
| Create customer and location | `/customers` | Active customer saves with at least one active location. |
| Invite technician | `/technicians` | Technician invite sends and the technician appears by display name. |
| Technician password setup | `/technician-login` | Invite link lets the technician set a password without entering the admin shell. |
| Create job | `/jobs` | Scheduled job saves against the new customer and location. |
| Queue field captures | Expo mobile app | Technician queues status, geofence, form, chemical, photo, and signature captures offline-first. |
| Review closeout | `/closeouts` | Office can review synced field captures and see whether billing is ready. |
| Generate portal access | `/customers` | Portal link opens token-protected customer closeout data. |
| Run scheduler | `/automation` | Manual scheduler run records a successful run history row. |
| Check billing path | `/payments` | Invoice or payment setup state is visible without secret exposure. |

Admin web:

1. Sign in as an admin or dispatcher.
2. Create a customer with at least one service location.
3. Create a completed job for that customer and location.
4. Open `/closeouts` and confirm the completed job appears.
5. Open `/payments`, create an invoice for the completed job, and confirm it moves through draft and sent states.
6. Configure Stripe to send `checkout.session.completed` events to `/api/payments/stripe-webhook`, then confirm a test payment marks the matching invoice paid.
7. Open `/automation`, create a notification template with variables, confirm the preview renders customer/location/date values, bind it to a follow-up rule, create a reminder from the template, then mark it handled.
8. Confirm the `/automation` scheduler preview shows due notification copy, target context, generated keys, and duplicate labels before any run is executed.
9. Trigger `/api/automation/scheduler` with `Authorization: Bearer <CRON_SECRET>` and confirm due bound rules generate pending notification events with interpolated template copy and no duplicates.
10. Open `/automation`, use the manual Run scheduler action, and confirm the scheduler panel refreshes without using a cron secret in the browser.
11. Confirm the `/automation` scheduler panel shows the latest run status, cron/manual source, created count, duplicate count, and generated notifications.
12. Send one pending reminder and then send visible pending reminders in bulk; confirm delivery status updates and failed reminders remain visible through the delivery-status filter and Failed/Retryable quick filters without exposing provider secrets in the browser.
13. If a notification webhook is configured, inspect the provider request and confirm the payload includes event, target, customer, job, and location context while excluding internal service notes and provider secrets.
14. Confirm sent reminders show provider message ids when the provider returns one, and failed retries do not show stale provider message ids.
15. Trigger a notification delivery and confirm the reminder briefly moves through `sending`; duplicate sends while `sending` or already `sent` should be rejected without creating a second provider request.
16. Confirm notification cards show whether each reminder has customer email and/or phone contact data, including a visible missing-contact state.
17. Confirm `/automation` shows provider mode without exposing webhook URL or secret values.
18. Use recipient readiness filters to confirm reachable, missing-contact, email-ready, and phone-ready reminders can be isolated.
19. Confirm sent or failed delivery attempts show last-attempt timing and the delivery controls show total attempts.

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

1. Open `/customers` and generate a portal access token for a customer with completed jobs.
2. Open `/portal/<customer-id>?access_token=<token>`.
3. Confirm completed closeouts render service date, location, customer-safe capture counts, and invoice state.
4. Confirm completed closeouts render without internal service notes, technician details, chemical logs, or inventory internals.
5. Confirm private job media renders through signed URLs.
6. Confirm open and paid invoices render without provider ids, raw payment records, or admin billing notes.
7. Open `/portal/<customer-id>` without a token and confirm closeouts and billing do not load.
8. Revoke the portal link in `/customers` and confirm the old link no longer loads closeouts or billing.

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
- Automation scheduler generation must stay behind `apps/web/app/api/automation/scheduler/route.ts` and require either Vercel `CRON_SECRET` or `AUTOMATION_CRON_SECRET`.
- Manual scheduler runs must stay behind admin/dispatcher auth and must not expose cron secrets to the browser.
- Automation scheduler run history is admin/dispatcher-readable only and should not expose provider secrets or customer portal data.
- Customer portal payloads must stay narrower than admin payloads.
- Customer portal reads must go through token-validated server routes; customer ids alone are not sufficient authorization.
- Customer portal billing must never expose provider payment ids, raw payment records, admin invoice notes, or void/draft invoices.
- Mobile write paths must remain queue-first and retry-safe.
- The Supabase anon key is acceptable in web/mobile only because RLS owns authorization.
- Refunds, customer billing history, SMS, and email delivery are not part of this readiness slice.
- Temporary diagnostics endpoints must be removed before routine production use.
