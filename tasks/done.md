# Done

## Demo Smoke Preflight V1

- Added a domain-backed demo smoke preflight helper with target, ready/blocked state, missing env names, demo seed summary, safe next commands, and sanitized evidence prompts
- Added the read-only root `demo:smoke` script with `--target local|preview`, optional `--base-url`, and optional `--tech-password-env`
- Kept smoke preflight free of Supabase calls, seed/reset writes, dev-server startup, browser automation, and secret value output
- Required local smoke env names and blocked non-local Supabase URLs for `--target local`
- Reported protected-preview shell seed readiness separately from operator-approved browser access and sign-in requirements
- Updated README, preview readiness, implementation plan, and task tracking so preflight comes before seed/reset and Browser smoke
- Verified with focused domain tests, blocked CLI preflight, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Demo Seed Data V1

- Added guarded dashboard and CLI demo seed/reset workflows for local and protected preview environments
- Added an admin dashboard Demo data panel with availability, dry-run counts, seed, reset, refresh, success, and blocked-state copy
- Added an easy demo admin login seeded as `demo@email.com` / `password`, with a local one-click sign-in button
- Added a localhost-only demo login prepare route so the sign-in button can create the fake story before signing in without a manual local seed command
- Added an admin-authenticated server route for demo seed status, dry run, idempotent seed, and reset actions
- Added reusable synthetic seed payloads, Pacific wall-clock demo schedules, guardrail validation, reset filters, and seed/reset ordering in the domain layer
- Added API-client seed/reset helpers that run through a provided service-role Supabase client instead of app/UI code
- Seeded a full demo ops story: admin auth/profile record, customers, locations, technician auth/profile records, chemical inventory, jobs, chemical logs, treatment form data, invoices, and payment state
- Required `--target local|preview`, `--confirm seed-demo-data`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` before any write can run
- Refused production targets and kept service-role keys, generated passwords, protected preview URLs, portal raw tokens, provider payloads, migrations, provider setup, and dashboard mutations out of scope
- Added reverse-order reset cleanup that targets only seed-owned records, the demo admin user, and matching demo technician auth users; reseeding resets demo-owned records first
- Updated README, implementation plan, and task tracking with safe operator commands and preview boundaries
- Kept local tooling and critique scratch separate until the later repo cleanup request folded it into the dirty-work merge
- Verified with focused seed tests, CLI refusal checks, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Portal-Led Batch V1

- Added admin-authenticated portal provider status reporting without exposing webhook URL or secret values
- Added fresh-token active-row portal sending so resend generates a new link instead of recovering historical raw token material
- Added provider-safe portal send attempt audit events: `send_requested` and `send_failed`
- Added inline payment confirmations before `Mark paid` and `Void`
- Added technician route-load summaries from existing jobs with today/upcoming counts, route status, and dispatch handoff links
- Kept encrypted token storage, delivery receipts, provider dashboard mutation, production env changes, and production migration application out of scope
- Verified with focused tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Portal Send Provider V1

- Added a server-only portal delivery webhook route for freshly generated session links using `PORTAL_DELIVERY_WEBHOOK_URL` and `PORTAL_DELIVERY_WEBHOOK_SECRET`
- Validated admin auth, token/customer ownership, active status, same-app portal URL shape, and raw-token hash match before sending
- Added shared portal send contracts, domain validation/status labels, API-client/domain wrappers, and a React Query mutation
- Added generated-link `Send link` UI with missing-contact disablement, `Send requested` uncertainty-safe copy, provider failure copy, and preserved manual copy fallback
- Kept row-level resend, encrypted token storage, persistent send events, delivery receipts, schema/RLS changes, production migrations, and provider dashboard setup out of scope
- Updated env examples and production readiness docs for the portal-specific webhook boundary
- Verified with focused portal send tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Portal Token Audit Events V1

- Added a local Supabase migration for `generated`, `opened`, and `revoked` portal token audit events with indexes and admin/dispatcher RLS
- Added server-side event writes for token generation, portal access, and revoke, plus an admin-only events read route
- Added shared types, API-client/domain/hook plumbing, and a reduced per-token history drawer in `CustomerPortalLinks`
- Processed Claude's slice 008 critique and added a durable `codex-critique-review.md` marker
- Created `.claude/design/009-portal-send-resend-provider-boundary/brief.md` for the next relay slice
- Preserved the public metadata boundary and did not apply production migrations or implement provider send/resend
- Verified with focused tests, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`

## Portal Send/Resend Boundary V1

- Added the Claude relay proposal and Codex review marker for provider-approved portal send/resend readiness
- Accepted only the no-provider contact-readiness portion of the proposal for this slice
- Passed existing customer email/phone into `CustomerPortalLinks`
- Added a low-priority "No contact saved" readiness state when no stronger active-link state is dominant
- Deferred send/resend buttons, provider readiness, delivery status, retry, persistence, and route implementation to a later explicit provider-boundary slice
- Verified with focused customer tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Portal/Ledger Smoke Coverage V1

- Expanded production smoke coverage for `/customers` account ledger drill-down filters, portal readiness, manual share readiness, revoke confirmation, and tokened portal denial checks
- Kept customer portal smoke expectations narrow around customer-safe closeouts, invoices, signed media, and no provider/internal note exposure
- Preserved no-migration, no-provider, no-token-schema-change, and no-production-mutation scope
- Verified with `git diff --check`

## Portal Revoke Confirmation V1

- Added the Claude relay brief, proposal, Codex review marker, critique, and Codex critique marker for the portal revoke confirmation slice
- Added an inline confirmation step before active customer portal links can be revoked from `/customers`
- Added state-aware confirmation copy for no-expiration, expiring, never-opened, and opened portal links
- Preserved existing generate, copy, manual-share, React Query hook, API route, optimistic rollback, and token schema behavior
- Applied Claude critique feedback so Cancel and Escape both return focus to the triggering Revoke button
- Verified with focused portal-link tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Customer Ledger Drill-Down V1

- Added the Claude relay brief, proposal, Codex review marker, critique, and Codex critique marker for the customer ledger drill-down slice
- Expanded `/customers` account ledger cards into an inline drill-down with all, services, invoices, open, and review filters
- Added row-level handoffs for jobs, closeouts, invoices, receipts, and payment review
- Applied Claude critique polish for compact review copy, zero-balance pill cleanup, directional action copy, and intentional Open-filter behavior
- Preserved existing React Query data flow, shared domain helpers, API-client boundaries, and no-migration/provider-free scope
- Verified with focused customer tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Portal Share/Resend UI Polish V1

- Added the Claude relay brief, proposal, and Codex review marker for the portal share/resend slice
- Added a reviewed marker for the prior billing work queue relay so the watcher skips completed slice 001 design artifacts
- Updated the Claude design relay convention to use `codex-review.md` as the durable proposal review marker
- Reworked `/customers` portal access controls around readiness, generate/copy/share flow, clipboard fallback, generated-link session copy, and token audit states
- Preserved existing token schema, API routes, React Query hooks, service-role boundaries, and provider-free/manual-share scope
- Stabilized the dispatch calendar test clock so fixture jobs stay in their intended week
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Next Five Portal + Ledger Batch V1

- Added shared portal-token readiness helpers and compact admin readiness counts for customer portal links
- Added domain-only customer ledger entries, summaries, and next-action helpers from existing customers, jobs, invoices, and payments
- Added admin customer ledger summaries and recent account activity to active `/customers` cards
- Added a customer-safe portal timeline that groups existing closeouts and portal invoices without exposing internal/provider fields
- Added closeouts, payments, and customers handoff polish for create invoice, review payment, share portal, and open customer ledger paths
- Kept the batch free of migrations, provider setup, production mutations, service-role exposure, provider IDs, admin notes, and raw storage paths
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`

## Bilingual Field Copy V1

- Added shared English/Spanish mobile field copy for status controls, geofence capture, chemical logs, photos, signatures, and treatment forms
- Wired technician field capture surfaces through the existing language store instead of duplicating copy in components
- Added a compact mobile header language toggle so technicians can switch between English and Spanish
- Preserved existing offline-first queue, draft, capture, and sync behavior without migrations or provider changes
- Added focused mobile coverage for Spanish field status copy
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Payment Reconciliation Polish V1

- Added shared invoice reconciliation helpers for paid totals, balances, latest payment dates, review labels, and status classification
- Classified draft, awaiting payment, partially paid, reconciled paid, manually marked paid, needs-review, and void invoice states without schema changes
- Added `/payments` reconciliation labels, paid/balance copy, latest payment dates, a needs-review counter, and a reconciliation status filter
- Preserved invoice creation, payment-link creation, mark-paid, void, search, status filters, and the closeouts handoff strip
- Added focused domain and payments UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Billing Work Queue V1

- Added aggregate closeout capture summaries for completed jobs across forms, chemical logs, photos, and signatures without schema changes
- Added shared billing queue grouping, counts, invoice selection, and sorting in the domain layer
- Retitled `/closeouts` to Billing work queue with counter filters, grouped queue sections, and state-driven next actions
- Added the `/payments` From closeouts handoff strip while preserving existing `?job_id=` preselection behavior
- Added focused API-client, domain, closeouts UI, and payments UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Field Ops + Billing Handoff Batch V1

- Persisted queued mobile writes and field drafts across app restarts with existing queue action contracts
- Let technicians focus any current, next, or later route stop while preserving full field controls
- Added a soft mobile completion readiness warning that reuses work-plan and offline queue state
- Added per-job sync triage labels for queued, retrying, synced, and failed route-stop work
- Added a closeout-to-invoice handoff using `/payments?job_id=...` without migrations or provider changes
- Added focused domain, mobile, and web UI coverage for the five slices
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Daily Route Timeline V1

- Added a shared mobile daily route timeline helper for current, next, and later assigned jobs
- Prioritized current jobs by `in_progress`, then `en_route`, then the next scheduled job
- Reused existing mobile work-plan and offline queue state for per-job capture readiness labels
- Replaced the flat mobile job list with a guided route timeline while preserving full field capture controls for current and next jobs
- Added compact always-visible later job rows
- Added dispatch companion guidance explaining technician route order and provider-free scope
- Added focused domain, mobile component, and dispatch UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Field Workflow Batch V1

- Added mobile job work-plan readiness for status, geofence, chemical log, photo, signature, and treatment form captures
- Added capture-specific mobile sync labels without changing offline queue storage
- Added office closeout readiness summaries for missing captures and billing handoff
- Added customer-safe portal service summaries with capture counts, service date, location, and invoice state
- Extended the production smoke checklist with mobile capture queueing and closeout review
- Added focused domain and web UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer CRUD V1

- Added `profiles`, `customers`, and `locations` SQL migration with RLS policies
- Added shared customer/location types and domain validation
- Added API client customer CRUD functions backed by Supabase
- Added `/customers` web admin UI with inline locations, search, filters, create/edit, and archive
- Added Vitest and React Testing Library coverage for domain, API client, and UI behavior
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Job CRUD V1

- Added `jobs` SQL migration with lifecycle status, schedule fields, RLS, and technician assignment
- Added shared job/profile types plus job input validation and filtering
- Added API client job CRUD functions and technician profile listing
- Added `/jobs` web admin UI with search, status/date filters, customer/location selectors, optional technician, create/edit, and cancel
- Added Vitest and React Testing Library coverage for domain, API client, and UI behavior
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Dispatch Calendar V1

- Added dispatch week grouping and date navigation helpers in the domain layer
- Added optimistic quick-update hooks for job status and technician assignment
- Added `/dispatch` weekly admin calendar with status and technician filters
- Added inline status and technician controls on scheduled job cards
- Added focused tests for calendar grouping, filtering, navigation, and quick updates
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Inventory Dashboard V1

- Added `chemical_inventory` and `chemical_logs` SQL migration with stock deduction trigger and RLS
- Added shared chemical inventory and chemical log types
- Added API client methods for inventory CRUD, archive, log listing, and log creation
- Added domain validation, filtering, and inventory summary logic
- Added `/inventory` admin dashboard with stock summaries, low-stock indicators, create/edit/archive, usage logging, and recent logs
- Added focused tests for validation, API behavior, stock summaries, and UI behavior
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Login V1

- Added auth API client methods for Supabase Auth session, profile lookup, password sign-in, and sign-out
- Added domain login validation and technician-only profile gating
- Added Expo SecureStore-backed Supabase client for persisted mobile sessions
- Added mobile auth store for initialization, sign-in, auth state changes, and sign-out
- Added technician login, loading, authenticated dashboard, and logout UI in Expo
- Added focused API and domain auth tests
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Job List V1

- Added assigned-technician job query using the authenticated Supabase user
- Added domain helpers for technician filtering and daily mobile job ordering
- Added mobile assigned-job store for loading, refresh, error, and reset state
- Added authenticated Expo daily job list with loading, empty, error, refresh, and last-refreshed states
- Kept mobile jobs read-only with no offline write sync in this slice
- Added focused API and domain assigned-job tests
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile State Groundwork V1

- Added shared offline queue action, status, input, and item contracts
- Added domain queue helpers for local enqueue, retry metadata, synced state, clearing, and summary counts
- Added mobile Zustand stores for queued offline actions and network/sync status
- Added compact sync status visibility to the authenticated Expo dashboard
- Kept all queue behavior local-only with no technician write sync in this slice
- Added focused queue transition and retry metadata tests
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Forms Engine V1

- Added JSONB form template, field, draft, and job submission contracts
- Added `form_templates` and `job_form_submissions` SQL migration with RLS and a seeded Treatment Form template
- Added API client methods for listing templates, listing job submissions, and creating job submissions
- Added domain helpers for template validation, draft creation, draft updates, submission normalization, and default treatment template reuse
- Added mobile treatment form draft state that queues `form_submission_create` offline actions
- Rendered treatment form capture on mobile job cards without server writes
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Form Sync Worker V1

- Added domain queue processing for `form_submission_create` items
- Added payload validation, ready-to-sync filtering, retry scheduling, max-attempt failure, and synced state handling
- Added mobile sync orchestration using the authenticated Expo Supabase client through `packages/api-client`
- Added automatic signed-in sync plus a manual Sync action in the mobile status indicator
- Surfaced sync failures in the mobile sync status display
- Kept job status updates, chemical logs, photos, and signatures out of scope
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Job Status Writes V1

- Added authenticated API client support for assigned technician job status updates
- Added typed `job_status_update` queue payloads with previous status metadata
- Extended offline sync processing for job status updates with retry and failure handling
- Added optimistic mobile assigned-job status updates backed by queued writes
- Added mobile job status controls on assigned job cards
- Extended the mobile sync trigger and status indicator to handle all ready queue items
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Chemical Logs V1

- Added authenticated API client support for mobile chemical inventory reads and chemical log creates
- Added typed `chemical_log_create` queue payloads
- Extended offline sync processing for chemical logs with validation, retry, synced, and failed states
- Added mobile active chemical inventory loading
- Added mobile chemical usage capture on assigned job cards
- Kept photos and signatures out of scope
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Photos V1

- Added job media and photo upload queue contracts
- Added `job_media` SQL migration with private `job-media` storage bucket setup and RLS policies
- Added API client support for listing media, creating media metadata, and uploading queued photos to storage
- Added domain helpers for stable job photo storage paths and queue payload validation
- Extended offline sync processing for `photo_upload` items
- Added Expo Image Picker camera/library photo queue UI on assigned job cards
- Kept signatures and customer portal photo visibility out of scope
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Mobile Signatures V1

- Extended job media contracts and SQL constraints to support `signature` media
- Added typed `signature_capture` queue payloads with stable storage paths and optional signer names
- Added API client support for uploading queued signature captures to private `job-media` storage
- Extended offline sync processing for `signature_capture` items
- Added mobile signature capture UI on assigned job cards using a signature canvas
- Added mobile store coverage plus focused domain and API client tests for signature queue and upload behavior
- Kept customer portal visibility and generated PDFs out of scope
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Admin Job Closeout Review V1

- Added closeout review contracts and domain helpers for completed job filtering, aggregation, and counts
- Added job-specific chemical log reads behind `packages/api-client`
- Added signed URL generation to job media reads for private photo and signature previews
- Added `/closeouts` admin UI with completed-job search, all-job filter, closeout metrics, treatment forms, chemical logs, photos, and signatures
- Added focused API, domain, and UI coverage for closeout aggregation, job filtering, signed media URLs, and empty capture states
- Kept customer portal visibility, generated PDFs, payments, and automation out of scope
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Customer Portal Media Visibility V1

- Added customer portal closeout contracts for completed jobs, customer-safe forms, photos, and signatures
- Added customer-scoped completed job, form submission, and media read APIs behind `packages/api-client`
- Reused private job media signed URLs for customer-facing photo and signature previews
- Added portal domain helpers for customer id validation, closeout grouping, and search filtering
- Added `/portal/[customerId]` customer portal UI without service notes, technician details, chemical logs, inventory internals, payments, or PDFs
- Added focused API, domain, and UI tests for customer scoping, media rendering, empty states, and hidden internal-only data
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Geofencing V1

- Added latitude and longitude support to locations plus `job_location_events` SQL migration with technician RLS
- Added shared arrival/departure geofence event contracts and normalized offline queue payloads
- Added domain helpers for distance calculation, radius checks, queue payload creation, and validation
- Added API client support for idempotent geofence event upserts keyed by `client_event_id`
- Extended offline sync processing for `geofence_event_create` items
- Added Expo location permission/config and mobile arrival/departure capture controls on assigned job cards
- Added focused API, domain, offline sync, and mobile store tests for geofence behavior
- Added pnpm/Metro configuration so Expo builds work with the repo-local pnpm virtual store on Windows
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Payments V1

- Added invoice, invoice line item, payment, provider, and status contracts
- Added `invoices`, `invoice_line_items`, and `payments` SQL migration with admin/dispatcher RLS
- Added Stripe Payment Links server boundary using `STRIPE_SECRET_KEY` behind a Next API route
- Added API client methods for invoice listing, creation, status updates, and payment-link metadata persistence
- Added domain validation, invoice totals, filtering, summaries, job de-duplication, and balance helpers
- Added `/payments` admin UI for completed-job invoice creation, search/filter, payment links, mark-paid, and void actions
- Added focused API, domain, and UI tests for payment behavior
- Kept recurring billing, refunds, dunning, webhooks, and accounting exports out of scope
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Automation V1

- Added automation rule and notification event contracts for follow-ups and recurring-service prompts
- Added `automation_rules` and `notification_events` SQL migration with admin/dispatcher RLS
- Added API client methods for rule listing/creation/status updates and notification listing/creation/handling/dismissal
- Added domain validation for rule type/status, offset days, notification targets, due dates, filtering, and summary counts
- Added `/automation` admin UI for reminder creation, rule creation, search/filter, pause/resume/archive, mark handled, and dismiss actions
- Added focused API, domain, and UI tests for automation behavior
- Kept SMS/email delivery, AI scheduling, and complex recurrence engines out of scope
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Production Readiness V1

- Added production setup documentation for required env vars, Supabase migration order, admin bootstrap, Vercel setup, smoke tests, and security boundaries
- Updated README environment and current-focus sections to match the implemented platform state
- Added Expo public Supabase variables to `.env.example`
- Added an admin navigation shell for completed admin surfaces
- Hid admin navigation on customer portal routes
- Converted the home screen cards into route links for faster smoke testing
- Added focused navigation tests for active route state and portal hiding behavior
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Web Auth Hardening V1

- Added shared admin auth domain helpers while preserving technician-only mobile auth
- Added admin web session/profile loading using Supabase Auth and `profiles.role = admin | dispatcher`
- Gated admin web routes behind auth while leaving `/portal/[customerId]` outside admin session requirements
- Added an admin sign-in flow, current role visibility, and sign-out in the shared admin shell
- Forwarded admin bearer tokens to the payment-link API route and rejected unauthenticated payment-link creation before Stripe access
- Added focused domain, web route-gate, sign-in, nav, and API route auth tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer Portal Access Hardening V1

- Added `customer_portal_access_tokens` SQL migration with hashed tokens, status, expiration, last-used timestamps, and admin/dispatcher RLS
- Added shared portal access token/grant contracts and `SUPABASE_SERVICE_ROLE_KEY` environment documentation
- Added token-validated server route for `/api/portal/[customerId]/closeouts`
- Moved customer portal closeout reads behind `packages/api-client` and domain validation instead of direct customer-id reads
- Added admin-authenticated server route and API-client entry point for creating portal access links
- Kept customer portal routes outside admin auth while requiring `?access_token=...` for closeout data
- Added focused API, domain, portal UI, and server route tests for missing/invalid access and token creation boundaries
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer Portal Link Management V1

- Added customer portal access token summaries so admin workflows can list tokens without exposing hashes
- Added admin-authenticated API-client and server routes for listing and revoking portal access tokens
- Added domain helpers for portal token validation, active/expired/revoked state, and admin-facing labels
- Added React Query hooks for portal token list, generate, and optimistic revoke behavior
- Added portal link management controls to active customer cards in `/customers`
- Supported optional expiration dates, one-time generated link copy, token status display, last-used display, and revoke actions
- Added focused API-client, domain, route, hook-adjacent UI, and customer UI tests for generation, listing, revocation, and copy affordances
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery V1

- Added delivery status, provider, attempts, sent timestamp, and error fields for notification events in a SQL migration
- Added shared notification delivery contracts and provider-result types
- Added a server-only delivery route with manual fallback, optional webhook provider, and provider-secret isolation
- Added API client, domain, and React Query send flow for pending notification events
- Added admin delivery status, attempts, error visibility, and Send action while preserving mark handled and dismiss workflows
- Documented notification delivery webhook environment variables and production smoke coverage
- Added focused API-client, domain, route, and admin UI tests for delivery success, failure, retry visibility, and secret boundaries
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Stripe Payment Webhooks V1

- Added shared payment webhook reconciliation result contracts
- Added a `payments` unique provider-payment-id migration for idempotent Stripe reconciliation without applying it locally
- Added a server-only `/api/payments/stripe-webhook` route with raw-body Stripe signature verification
- Reconciled `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed` events into existing payment records
- Marked invoices paid on successful provider events while preserving void/manual payment workflows
- Extended Payment Link creation to copy invoice metadata onto the resulting PaymentIntent
- Documented `STRIPE_WEBHOOK_SECRET`, Vercel setup, Stripe smoke coverage, and server-only webhook boundaries
- Added focused route tests for valid signatures, invalid signatures, duplicate events, missing metadata, and missing invoices
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer Portal Billing V1

- Added customer-safe portal invoice, line item, and billing response contracts
- Added customer-scoped invoice reads behind `packages/api-client`
- Added a token-validated `/api/portal/[customerId]/billing` server route using service-role access
- Added domain helpers for portal invoice shaping, open/paid labels, balances, and filtering
- Rendered open and paid invoices in `/portal/[customerId]` with payment-link actions
- Hid void invoices, draft invoices, provider payment ids, raw payment records, admin notes, and job service notes from customer payloads
- Added focused API-client, domain, server route, and portal UI tests for token scoping, invoice visibility, paid/open state, and hidden internals
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Automation Scheduler V1

- Added `notification_events.generated_key` migration and unique index for generated notification idempotency without applying it locally
- Added shared automation scheduler result contracts
- Added API-client support for completed scheduler job reads and generated notification inserts with duplicate handling
- Added domain scheduler planning for active follow-up and recurring-service rules
- Generated pending notification events from completed jobs while skipping inactive rules and future-due targets
- Added a server-only `/api/automation/scheduler` route protected by `AUTOMATION_CRON_SECRET`
- Kept scheduler generation separate from provider delivery and manual admin handling
- Documented `AUTOMATION_CRON_SECRET`, setup, smoke tests, and security boundaries
- Added focused API-client, domain, route, and existing automation UI/delivery tests for cron auth, due generation, duplicate prevention, and inactive rule skipping
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Vercel Cron Wiring V1

- Added `GET /api/automation/scheduler` support for Vercel Cron while preserving protected `POST` calls
- Accepted both Vercel `CRON_SECRET` bearer auth and existing `AUTOMATION_CRON_SECRET` manual/external scheduler auth
- Added root `vercel.json` cron configuration for daily scheduler runs at 05:00 UTC
- Documented Vercel setup, cron cadence, environment variables, smoke checks, and security boundaries
- Added focused route coverage for Vercel GET calls and existing manual POST behavior
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Admin Notification Scheduler Status V1

- Added an `automation_scheduler_runs` migration with success/failure status, evaluated counts, created counts, duplicate counts, errors, and admin/dispatcher read RLS
- Added shared scheduler run contracts plus API-client and domain helpers for scheduler status reads
- Recorded successful and failed runs from `/api/automation/scheduler` while preserving Vercel cron and manual secret behavior
- Added `/automation` scheduler visibility for last run status, created count, duplicate count, failure errors, and latest generated notifications
- Kept notification generation, provider delivery, and cron cadence editing as separate workflows
- Added focused API-client, domain, route, and admin UI tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Admin Scheduler Manual Run V1

- Added an admin-authenticated `/api/automation/scheduler/manual` route for running notification generation without exposing cron secrets to the browser
- Preserved the existing Vercel cron GET route and cron-secret-protected scheduler POST behavior
- Recorded successful and failed manual runs in `automation_scheduler_runs`
- Added API-client and domain wrappers for the manual scheduler action
- Added a React Query mutation that refreshes scheduler run history and generated notification events after manual runs
- Added a `/automation` Run scheduler action with pending, success, and failure states
- Added focused API-client, route, and admin UI tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Admin Scheduler Run Provenance Update

- Added scheduler run provenance columns so one run history can distinguish `cron` and `manual` executions
- Backfilled existing scheduler run history to `triggered_by = cron` through the migration default
- Recorded cron runs with no user id and manual runs with the authenticated admin/dispatcher user id
- Extended shared scheduler run contracts and API-client insert payloads for provenance
- Added `/automation` last-run source visibility for cron/manual runs and manual user ids
- Added focused route, API-client, domain, and admin UI test coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Templates V1

- Added a `notification_templates` migration with admin/dispatcher manage RLS without applying it locally
- Added shared notification template contracts for type, status, name, title, message, and timestamps
- Added API-client and domain flows for listing, creating, updating, archiving, restoring, validating, and filtering templates
- Added React Query hooks for template list/create/update/archive/restore
- Added a `/automation` templates panel with create, edit, archive, restore, search, and status filtering
- Let manual reminder creation copy type, title, and message from an active template
- Kept provider selection, campaign sending, AI drafting, and delivery behavior unchanged
- Added focused API-client, domain, and admin UI tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Automation Rule Template Binding V1

- Added an `automation_rules.template_id` migration referencing `notification_templates` without applying it locally
- Extended automation rule contracts with nullable `template_id` and optional joined template metadata
- Added API-client, domain, and React Query update flows so rules can bind, clear, and edit templates
- Updated scheduler generation to use active type-matching bound template title/message before rule/default fallback copy
- Added `/automation` rule editing with active matching-template selection and mismatched-template clearing
- Added focused API-client, domain scheduler, and admin UI tests for rule/template binding behavior
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Automation Template Variable Preview V1

- Added domain interpolation for allowlisted notification template variables
- Supported customer name, location address/nickname, and service date with safe fallback values
- Kept notification template records as raw copy while rendering preview output in the admin UI
- Updated scheduler-generated notifications to interpolate bound template copy before inserting events
- Added reminder preview behavior and saved manual reminders with interpolated copy
- Added focused domain scheduler and admin UI tests for interpolation, missing values, preview output, and manual reminder saves
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Automation Scheduler Preview V1

- Added a no-write scheduler preview domain helper that reuses `buildAutomationSchedulerPlan`
- Labeled preview items as new or duplicate by comparing generated keys against already-loaded generated notifications
- Added `/automation` scheduler preview counts for due items, evaluated active rules, and duplicate preview items
- Rendered preview notification cards with generated title, message, due date, target customer/location, and generated key
- Added a preview refresh action that updates preview timing without running cron or manual scheduler generation
- Added focused domain and admin UI tests for preview counts, generated copy, duplicate labels, and refresh behavior
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Bulk Delivery V1

- Added an API-client bulk delivery wrapper that sends notification ids sequentially through the existing server delivery route
- Added domain helpers for selecting visible pending deliverable notifications and returning bulk delivery counts
- Added a React Query bulk-send mutation that refreshes notification events after completion
- Added `/automation` controls for sending visible pending reminders while preserving each notification's individual Send action
- Displayed ready-to-send, sent, and failed counts so failed events remain visible for retry
- Added focused API-client, domain, and admin UI tests for bulk selection, sequential delivery, failure counts, and UI controls
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Triage V1

- Added delivery-status filtering for all, not sent, sending, sent, failed, and retryable notifications
- Added domain summary counts for failed, not-sent, sent, and retryable notification events
- Added `/automation` delivery-status controls plus failed and retryable quick filters
- Preserved lifecycle status filtering, search, individual Send, and bulk Send behavior
- Added focused domain and admin UI tests for combined lifecycle, search, and delivery-status filtering
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Provider Payload V1

- Added a shared notification delivery provider payload contract
- Added a domain helper that builds sanitized webhook payloads from notification events
- Included event, target, customer contact, job schedule, and location context when available
- Kept customer service notes, job service notes, location service notes, and provider secrets out of the webhook body
- Updated the server delivery route to send the standardized payload while preserving the manual fallback
- Added focused domain and route tests for payload shape, optional context, webhook delivery, and fallback delivery
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Provider Response Tracking V1

- Added a migration for nullable `notification_events.provider_message_id`
- Extended notification event contracts with `provider_message_id`
- Persisted manual and webhook provider message ids on successful delivery
- Cleared provider message ids on failed delivery retries to avoid stale provider references
- Displayed provider message metadata in `/automation` notification cards
- Kept provider secrets and raw provider responses out of database records
- Added focused route, API-client, domain, and admin UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery In-Flight Guard V1

- Marked eligible notification sends as `sending` before provider delivery starts
- Rejected duplicate delivery attempts for notifications already `sending` or `sent`
- Preserved retry behavior for pending `not_sent` and `failed` notifications
- Restored `failed` state and last error when provider delivery fails
- Disabled duplicate Send actions in `/automation` while a notification is in-flight
- Added focused route and admin UI tests for sending-state behavior and duplicate-send rejection
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Recipient Readiness V1

- Added a domain helper that resolves recipient contact from direct customer or job customer context
- Reported email, phone, and missing-contact readiness without choosing a provider channel
- Displayed recipient readiness on `/automation` notification cards
- Kept provider secrets and delivery routing out of the recipient-readiness UI
- Added focused domain and admin UI tests for email-ready, phone-ready, and missing-contact notifications
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Provider Configuration Status V1

- Added an authenticated notification provider status route
- Reported provider mode as webhook or manual fallback without exposing webhook URL or secret values
- Added API-client, domain, and React Query access for provider status
- Displayed provider mode and webhook-secret configured state in `/automation` delivery controls
- Added focused route, API-client, and admin UI tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Recipient Readiness Summary V1

- Added domain summary counts for reachable, missing-contact, email-ready, and phone-ready reminders
- Displayed reachable and missing-contact counts in `/automation` notification controls
- Kept readiness counts provider-neutral and based on direct customer or job customer context
- Added focused domain and admin UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Recipient Readiness Filter V1

- Added recipient readiness filtering for all, reachable, missing contact, email ready, and phone ready reminders
- Applied recipient filtering after lifecycle, delivery status, and search filters
- Added a `/automation` recipient readiness filter control
- Added focused domain and admin UI tests
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Last Attempt Tracking V1

- Added a migration for nullable `notification_events.last_delivery_attempted_at`
- Extended notification event contracts with `last_delivery_attempted_at`
- Recorded attempt timestamps when delivery transitions to `sending`, `sent`, or `failed`
- Displayed last attempt time in `/automation` notification cards
- Added focused route and UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Attempt Summary V1

- Added a domain helper that summarizes attempted, never-attempted, total attempts, and latest attempted time
- Displayed total delivery attempts in `/automation` notification controls
- Kept attempt summary separate from delivery lifecycle and provider response metadata
- Added focused domain and admin UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Delivery Retry Policy V1

- Added a domain helper that classifies retryable, manual-review, and non-applicable notification delivery states
- Treated pending `not_sent` reminders and failed reminders below three attempts as retryable
- Treated failed reminders at three or more attempts as manual review
- Kept bulk delivery and retryable filtering aligned with the same domain policy
- Displayed retry policy state and manual-review counts in `/automation`
- Added focused domain and admin UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer/Ops Demo Readiness V1

- Added a shared demo workflow helper for the customer-to-closeout walkthrough
- Rendered the live-data demo workflow on the admin home page
- Linked the walkthrough through customers, jobs, dispatch, closeouts, and billing/portal follow-up
- Kept the demo path explicit about adding only records admins want to keep
- Added focused domain and home page coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Demo Data Entry Helpers V1

- Added customer setup guidance that points admins from customer/location entry to job scheduling
- Added job scheduling guidance that links back to customer setup and forward to dispatch review
- Kept helper panels informational only with no automatic record creation
- Added focused customer and job UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Production Smoke Checklist V1

- Added a shared production smoke checklist contract for manual live-app validation
- Covered admin sign-in, customer/location creation, job creation, portal access, scheduler run history, and billing visibility
- Documented the checklist in production readiness guidance without adding live smoke automation
- Kept production seed data out of scope
- Added focused domain coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Notification Webhook Provider Setup V1

- Added `/automation` setup guidance for webhook delivery and manual fallback mode
- Named the server-only notification webhook env vars needed for webhook delivery
- Kept webhook URL and secret values hidden from browser UI
- Preserved existing notification provider delivery behavior
- Added focused automation UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Stripe Test Mode Readiness V1

- Added `/payments` setup guidance for Stripe test-mode readiness
- Named server-only `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` without exposing values
- Clarified that Stripe can remain unset for customer, job, closeout, and portal demos
- Preserved existing invoice and payment-link behavior
- Added focused payments UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Home Readiness Snapshot V1

- Added a compact readiness snapshot to the signed-in home dashboard
- Reused the manual production smoke checklist count from shared domain logic
- Added a shared remaining-readiness action for Supabase leaked password protection
- Kept the snapshot static, with no live Supabase reads or production data mutations
- Added focused domain and home page coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Customer Demo Flow Polish V1

- Added customer setup guidance for portal-link timing after closeout and billing are ready
- Added post-create and post-update success messages with the next scheduling action
- Preserved existing customer CRUD, portal-token controls, and optimistic archive behavior
- Added focused customer UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Job Scheduling Demo Polish V1

- Clarified the customer-first and dependent-location scheduling flow
- Clarified that technician assignment remains optional for v1 demos
- Added post-create and post-update success messages with a dispatch review handoff
- Preserved existing job CRUD, filters, and cancel behavior
- Added focused job UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Dispatch And Closeout Demo Bridge V1

- Added dispatch guidance for scheduled-job visibility, assignment, status changes, and closeout handoff
- Added dispatch empty-day next-action copy
- Added closeout guidance for completed jobs and field-capture review
- Added closeout empty-state next actions for search misses and no completed jobs
- Added focused dispatch and closeout UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Finish-Line Demo Polish V1

- Added payments guidance that invoices and manual paid status work without Stripe for non-payment demos
- Added automation guidance that manual scheduler runs and manual follow-up stay available without browser-side secrets
- Preserved existing provider behavior, server-only secret boundaries, and payment-link behavior
- Added focused payments and automation UI coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Mobile Technician Home Readiness V1

- Added shared mobile technician readiness copy for assigned-job count, identity, and next demo action
- Added a compact mobile technician header with refresh, sign-out, readiness, and sync status
- Kept the panel static and free of direct Supabase reads
- Added focused domain coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Mobile Assigned Job Card Polish V1

- Extracted the assigned-job card into a reusable mobile component
- Improved hierarchy for schedule, status, customer, address, service notes, and field controls
- Preserved existing assigned-job data flow and offline capture controls
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Mobile Field Capture Guidance V1

- Added field-friendly guidance to treatment forms, chemical logs, photos, signatures, and geofence controls
- Clarified that captures queue locally and sync later
- Preserved existing offline queue behavior and validation
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Mobile Sync Confidence V1

- Expanded mobile sync status copy for offline, pending, failed, syncing, synced, and no-local-change states
- Added synced counts, retry timing, disabled manual-sync states, and a Clear synced action
- Reused the existing offline queue clear-synced store behavior
- Added focused mobile store coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Mobile Demo Verification And Docs V1

- Added a manual mobile technician smoke checklist to production readiness docs
- Updated task tracking for the mobile demo-readiness batch
- Kept Supabase leaked password protection documented as a deferred Pro-plan item
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Password Reset Flow Fix V1

- Added `/forgot-password` as a public admin recovery request route
- Added `/auth/update-password` as a public recovery-session password update route
- Routed Supabase password reset emails through API-client and domain helpers with `/auth/update-password` redirects
- Added invalid, missing, and non-recovery link handling so magic-link URLs are rejected on the reset page
- Linked the admin sign-in screen to password recovery and documented Supabase Auth redirect setup
- Added focused API-client, domain, auth gate, sign-in, forgot-password, and update-password coverage
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`

## Technicians Admin V1

- Added a profile metadata migration for technician email, display name, and active/inactive status
- Added technician invite/list contracts through shared types, API-client, and domain helpers
- Added an admin-authenticated `/api/technicians` route that sends Supabase invite emails through the service-role boundary
- Added `/technicians` with technician search and invite form
- Updated job and dispatch technician selectors to show display names like `Testnician`
- Extended `/auth/update-password` to accept Supabase invite links in addition to recovery links
- Added focused API-client, domain, API route, admin nav, job, dispatch, password setup, and technicians UI coverage

## Agent Workflow Guidance V1

- Strengthened root `AGENTS.md` as a concise launch checklist
- Added plugin/MCP/skill trigger guidance to `docs/AGENTS.md`
- Preserved detailed workflow policy in existing docs
- Verified with `git diff --check`

## Web Home Command Center V1

- Added domain-backed home KPIs, alerts, schedule rows, next actions, and guided smoke prompts
- Replaced the static web home page with a live command-center dashboard
- Integrated demo seed controls and polished the admin nav
- Verified with focused domain/web tests and full verification

## GPS Arrival Proof + Dispatch Evidence V1

- Added API-client and domain read paths for synced job geofence events
- Added dispatch GPS evidence summaries and provider-free external map links
- Rendered compact arrival/departure evidence in `/dispatch`
- Kept customer portal, billing, and notification surfaces free of exact technician GPS
- Verified with focused API-client/domain/web tests and full verification

## Provider-Free Dispatch Route Intelligence V1

- Added domain route intelligence for scheduled-order stops, technician filtering, location readiness, and status counts
- Rendered provider-free route summaries, stop labels, and service-coordinate map links in `/dispatch`
- Kept Google Maps/Mapbox SDKs, env vars, background tracking, and migrations deferred
- Verified with focused domain/web tests

## Mobile Visit Flow Organization V1

- Grouped mobile field controls into a clear visit flow: start, arrive/depart, treatment, chemicals, photos, signature
- Reused existing offline queue, draft stores, geofence controls, and completion guard behavior
- Preserved manual foreground GPS capture only
- Verified with focused mobile component tests and mobile typecheck

## Closeout Proof Handoff V1

- Added admin proof handoff readiness in `/closeouts`
- Added customer-safe proof-of-service summaries in the portal
- Kept exact technician GPS, map URLs, chemical internals, storage paths, and provider internals out of customer portal payloads
- Verified with focused domain, admin, portal UI, and portal API tests

## Provider-Free Workflow Triage Polish V1

- Ran the read-only local demo smoke preflight and recorded sanitized blocked evidence
- Added dispatch triage for missing GPS evidence, missing coordinates/location, unassigned work, and late/at-risk stops
- Added mobile field-flow readiness for failed capture retries plus done/queued/needed counts
- Added admin closeout proof review labels for GPS, billing readiness, invoice state, and sync confidence
- Kept Google Maps/Mapbox SDKs, background GPS, provider setup, env changes, migrations, and production mutations deferred
- Verified with focused tests plus `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`
