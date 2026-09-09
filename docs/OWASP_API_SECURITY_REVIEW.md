# OWASP API Security Review V1

Focused repo-level review for Pest Patrol OS API routes against the OWASP API
Security Top 10 2023, with a companion cross-check against the broader OWASP
Top 10 2025 web application risks. This is not a penetration test and did not
mutate preview, production, Supabase, Vercel, Stripe, provider dashboards,
migrations, seed/reset data, or live compliance ingestion.

## Summary

- Scope: Next API routes, service-role server routes, customer portal routes,
  Stripe routes, compliance routes, notification/automation routes, mobile
  sync-facing migration/RLS evidence, dev-only Whisper rewrites, and supporting
  static safety checks.
- Current status: no production-blocking code defect was confirmed in this
  pass. The payment-link BOLA/API3 risk is already mitigated on `main` by
  accepting `invoice_id`, loading the invoice server-side through
  `packages/api-client`, rate-limiting, reusing existing links, and sanitizing
  Stripe failures.
- New durable evidence in this slice: static route-inventory coverage and a
  payment-link regression proving client-supplied invoice/provider fields are
  ignored.
- Existing evidence referenced here includes `docs/RLS_BOUNDARY_AUDIT.md`,
  `docs/CUSTOMER_DATA_PRIVACY_RETENTION.md`, `docs/AUTH_PRODUCTION_HARDENING.md`,
  route tests under `apps/web/app/api/**`, `tooling/security-baseline-check.ts`,
  and `tooling/rls-boundary-audit.ts`.

## Standards Used

- OWASP API Security Top 10 2023 remains the route-by-route API checklist for
  this review because it is the latest official API-specific OWASP Top 10.
- OWASP Top 10 2025 is broader web application guidance. It is used here as a
  companion lens for app-wide risks such as supply chain integrity,
  cryptography, injection, logging/alerting, and exception handling.

## OWASP Web Top 10 2025 Companion Mapping

| OWASP Top 10 2025 category | Pest Patrol review focus | Current evidence | Gap / next step |
| --- | --- | --- | --- |
| A01:2025 Broken Access Control | Admin, portal, cron, webhook, technician, media, payment, and mobile/RLS boundaries | API1/API5 route inventory rows; portal session tests; payment-link server-side invoice lookup; `docs/RLS_BOUNDARY_AUDIT.md` | Live Supabase RLS/advisor closure still requires operator-approved target verification. |
| A02:2025 Security Misconfiguration | Env placeholders, service-role server-only use, dev-only rewrites, CSP/security headers, provider readiness, Stripe live gate | `tooling/owasp-api-route-inventory.test.ts`; `tooling/security-baseline-check.ts`; readiness docs; `/api/ops/readiness` | Vercel Firewall/WAF and dashboard settings remain operator-owned preview/production tasks. |
| A03:2025 Software Supply Chain Failures | Dependency and CI hygiene without adding paid scanners or new services | lockfile presence in baseline checks; full `pnpm install --frozen-lockfile`, tests, typecheck, lint, build | Add SBOM/dependency-review policy later if the project wants stronger supply-chain evidence. |
| A04:2025 Cryptographic Failures | Portal grants/sessions, Stripe webhook HMAC, secret redaction, HTTPS/operator setup | hashed portal grants/sessions; Stripe raw-body HMAC with timestamp tolerance; no secret values in docs/tests | Production TLS/HSTS and key rotation are deployment/operator runbook items. |
| A05:2025 Injection | Supabase query boundaries, manifest-controlled compliance sources, route validation, no arbitrary server-side URL fetches | DB access through `packages/api-client`; compliance manifest tests; route input validation; SSRF notes | Live DB policy verification remains part of Supabase advisor/RLS closure. |
| A06:2025 Insecure Design | Sensitive business flows, manual fallback clarity, destructive confirmation, advisory-only compliance, customer-safe portal output | API6 section; payment/portal/notification idempotency tests; customer privacy and auth hardening docs | Threat-model review for new production workflows should become a recurring launch gate. |
| A07:2025 Authentication Failures | Staff bearer auth, portal cookie auth, cron secrets, provider signatures, password reset/update boundaries | `getAdminAccess`; `validatePortalSession`; Stripe/provider route tests; `docs/AUTH_PRODUCTION_HARDENING.md` | MFA/CAPTCHA and final auth-provider policy remain production hardening decisions. |
| A08:2025 Software or Data Integrity Failures | Webhook idempotency, Stripe metadata requirements, portal one-time grant consumption, demo seed/reset safeguards | Stripe webhook duplicate-event tests; generated-key idempotency; one-time portal grants; demo production refusal | Preview provider smoke should verify integrity behavior with test-mode provider payloads. |
| A09:2025 Security Logging & Alerting Failures | Sanitized logs, no secret/token leakage, critical event visibility | `safe-log` route usage; route tests asserting sanitized provider failures; readiness log guidance | External alerting/monitoring provider selection is out of scope and should be operator-owned. |
| A10:2025 Mishandling of Exceptional Conditions | Sanitized error paths, provider-unavailable fallbacks, schema-unavailable compliance behavior, manual fallback routes | compliance/provider unavailable tests; Stripe/provider failure tests; portal/notification manual fallback tests | Keep adding regression tests when new provider or customer-visible error paths are introduced. |

## API Inventory

| Route | Method | Auth type | Object IDs accepted | Sensitive data touched | Expected authorization check | Rate limit / resource guard | External provider called | Customer-visible output? | OWASP categories | Current coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/automation/notifications/[notificationId]/deliver` | POST | admin bearer token | `notificationId` | notification events, customer contact, job/location context, provider message id | `getAdminAccess`; service-role lookup after auth | `checkApiRateLimit`; rejects `sending`/`sent` duplicates; attempt counter | optional notification delivery webhook from env | no | API1, API2, API3, API4, API5, API6, API7, API10 | tested |
| `/api/automation/notifications/provider-status` | GET | admin bearer token | none | provider readiness flags | `getAdminAccess` | cheap read only | no | no | API2, API3, API5, API8 | tested |
| `/api/automation/scheduler` | GET, POST | cron/provider bearer secret | none | jobs, automation rules, notification events, scheduler runs | `CRON_SECRET` or `AUTOMATION_CRON_SECRET` bearer match | generated-key idempotency; run history | no | no | API2, API4, API5, API6, API8 | tested |
| `/api/automation/scheduler/manual` | POST | admin bearer token | none | jobs, automation rules, notification events, scheduler runs | `getAdminAccess` | generated-key idempotency; run history | no | no | API2, API4, API5, API6 | tested |
| `/api/compliance/advisories` | POST | admin bearer token | `chemical_log_id`, workflow/source context | chemical logs, jobs, compliance chunks, advisory audits | `getAdminAccess`; schema-readiness check before provider call | `checkApiRateLimit`; disabled/no-schema paths avoid OpenAI call | OpenAI embeddings only when configured | staff only | API2, API3, API4, API5, API6, API7, API10 | tested |
| `/api/csp-report` | POST | unauthenticated by design | none | browser-reported CSP violation details (blocked and document URI, violated directive) | none by design; browsers post violation reports without credentials | no route-level limit; body is read once, malformed bodies are discarded, and `safeLogWarn` sanitizes the report before logging | no | no, empty 204 | API2, API4, API9, API10 | tested |
| `/api/demo-seed` | GET, POST | admin bearer token | action target | synthetic demo customer/job/media/payment data | `getAdminAccess`; target guardrails and confirmation for writes | production refusal; explicit confirm token for seed/reset | no | no | API2, API4, API5, API6, API8, API9 | tested |
| `/api/demo-seed/local-login` | POST | unauthenticated but localhost/dev-only safe | none | synthetic demo records and demo auth session setup | localhost and non-production checks before service-role work | local-development only | no | no | API2, API5, API6, API8, API9 | tested |
| `/api/demo-seed/login-refresh` | POST | admin bearer token | signed-in demo user id/email | synthetic demo records | `getAdminAccess`; demo-account-only and production refusal | guarded demo refresh only | no | no | API2, API5, API6, API8 | tested |
| `/api/ops/readiness` | GET | admin bearer token | none | env-name presence booleans and provider readiness | `getAdminAccess` | cheap read only; no secret values | no | no | API2, API3, API5, API8, API9 | tested |
| `/api/payments/payment-link` | POST | admin bearer token | `invoice_id` | invoice, line items, customer/job ids, Stripe link id/url | `getAdminAccess`; server-side invoice lookup through `packages/api-client` | `checkApiRateLimit`; existing-link reuse; Stripe idempotency key; live-mode approval gate | Stripe Payment Links fixed endpoint | no direct customer response; URL later customer-visible | API1, API2, API3, API4, API5, API6, API7, API10 | tested |
| `/api/payments/provider-status` | GET | admin bearer token | none | Stripe readiness flags | `getAdminAccess` | cheap read only | no | no | API2, API3, API5, API8 | tested |
| `/api/payments/stripe-webhook` | POST | Stripe signature | Stripe event/payment/invoice ids | invoice/payment records, Stripe metadata | `STRIPE_WEBHOOK_SECRET`; HMAC raw-body signature and timestamp tolerance | provider signature; idempotent payment upsert; live-mode approval gate | Stripe webhook only inbound | no | API2, API3, API4, API5, API6, API8, API10 | tested |
| `/api/portal/[customerId]/billing` | GET | portal session cookie | `customerId` | customer invoices, line items, payment state | `validatePortalSession` scoped to same `customerId` | portal session expiry/revocation | no | yes | API1, API2, API3, API5 | tested |
| `/api/portal/[customerId]/closeouts` | GET | portal session cookie | `customerId` | jobs, forms, media, signed URLs, invoices | `validatePortalSession` scoped to same `customerId` | `checkApiRateLimit` keyed by client/customer; session expiry/revocation | no | yes | API1, API2, API3, API4, API5 | tested |
| `/api/portal/[customerId]/sessions` | GET | portal grant exchange | `customerId`, one-time `grant` | portal access token/session hashes, token audit events | hashed grant lookup scoped to same `customerId`; revoked/expired check | one-time grant consumed; HttpOnly/SameSite/Secure session cookie | no | redirects to customer portal | API1, API2, API3, API5, API6 | tested |
| `/api/portal/[customerId]/upgrade-intents` | POST | portal session cookie | `customerId` | notification event for recurring-service follow-up | same-origin guard; `validatePortalSession` scoped to same `customerId` | `checkApiRateLimit`; generated-key idempotency | no | yes, customer request result | API1, API2, API3, API4, API5, API6 | tested |
| `/api/portal/access-tokens` | GET, POST | admin bearer token | `customer_id` | portal access token hashes, one-time grants, audit events | `getAdminAccess`; service-role token work after auth | `checkApiRateLimit`; one-time raw grant only on create | no | no | API1, API2, API3, API4, API5, API6 | tested |
| `/api/portal/access-tokens/[tokenId]/events` | GET | admin bearer token | `tokenId` | portal access audit history | `getAdminAccess`; token id validation | cheap read only | no | no | API1, API2, API3, API5 | tested |
| `/api/portal/access-tokens/[tokenId]/revoke` | POST | admin bearer token | `tokenId` | portal token/session revocation | `getAdminAccess`; token id validation | revocation state; UI confirmation outside route | no | no | API1, API2, API5, API6 | tested |
| `/api/portal/access-tokens/provider-status` | GET | admin bearer token | none | portal delivery readiness flags | `getAdminAccess` | cheap read only | no | no | API2, API3, API5, API8 | tested |
| `/api/portal/access-tokens/send` | POST | admin bearer token | `customer_id`, `token_id`, portal URL grant | customer contact, portal grant, token hash, send audit events | `getAdminAccess`; token/customer/hash/origin/path validation | `checkApiRateLimit`; active/unexpired link only; manual fallback | optional portal delivery webhook from env | no | API1, API2, API3, API4, API5, API6, API7, API10 | tested |
| `/api/technicians` | GET, POST | admin bearer token | technician profile ids/email input | profiles, invite metadata, technician setup redirect | `getAdminAccess`; service-role invite/list after auth | route validation; provider invite path | Supabase auth invite | no | API1, API2, API3, API5, API6, API10 | tested |

Dev-only rewrites:

| Route | Method | Auth type | Object IDs accepted | Sensitive data touched | Expected authorization check | Rate limit / resource guard | External provider called | Customer-visible output? | OWASP categories | Current coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/transcribe` | POST | dev-only rewrite | audio body | local transcription audio | `buildLocalWhisperRewrites("development")` only | local dev helper only | local Whisper helper at `127.0.0.1:8765` | no | API7, API8, API9, API10 | tested |
| `/api/whisper-health` | GET | dev-only rewrite | none | local helper health | `buildLocalWhisperRewrites("development")` only | local dev helper only | local Whisper helper at `127.0.0.1:8765` | no | API7, API8, API9 | tested |

## OWASP Control Notes

- API1 Broken Object Level Authorization: portal billing, closeouts, sessions,
  and upgrade intents validate a portal session or grant scoped to the same
  `customerId`; portal send validates token/customer/hash/path/origin; payment
  links load invoice data server-side by `invoice_id`; technician assigned-job
  scope is enforced through RLS/RPC migration evidence in
  `docs/RLS_BOUNDARY_AUDIT.md`.
- API2 Broken Authentication: admin routes use `getAdminAccess`; cron routes
  use configured bearer secrets; Stripe webhook uses raw-body HMAC signature and
  timestamp tolerance; customer portal routes use a separate HttpOnly session
  cookie and do not accept staff auth as portal auth. The CSP violation report
  endpoint is deliberately unauthenticated, because browsers post reports
  without credentials; it accepts no object ids and returns an empty 204.
- API3 Broken Object Property Level Authorization: portal DTOs exclude raw
  grants, token/session hashes, exact GPS, provider internals, admin notes, and
  internal compliance warnings. Payment-link Stripe metadata is limited to
  invoice/job/customer ids and ignores client-supplied invoice/provider fields.
- API4 Resource Consumption: high-cost or repeated flows use route rate limits,
  generated-key idempotency, Stripe idempotency, existing-link reuse, provider
  disabled paths before expensive work, and duplicate-send guards. The CSP
  violation report endpoint has no route-level limit and depends on the edge
  rate limit recorded under Open Gaps; it does no provider or database work, so
  an unthrottled report costs one sanitized log line.
- API5 Broken Function Level Authorization: admin/dispatcher APIs, portal
  customer APIs, cron APIs, and provider webhooks use separate trust mechanisms.
  Provider-status and ops-readiness routes require staff auth even though they
  return only booleans/readiness states.
- API6 Sensitive Business Flows: portal link generation/send/revoke, payment
  links, notification delivery, scheduler runs, compliance advisories, demo
  seed/reset, and technician invites are guarded by auth, confirmations,
  idempotency, live-mode gates, or production refusal where appropriate.
- API7 SSRF: server-side fetches use fixed Stripe/OpenAI URLs or provider URLs
  from server env. Portal send validates that the user-visible portal URL
  matches the current app origin and customer path before provider delivery.
  Local Whisper rewrites are development-only.
- API8 Security Misconfiguration: `.env.example` contains placeholders only;
  service-role references are confined to server API code; CSP/security headers,
  origin guard, rate-limit helper, security baseline tooling, RLS audit tooling,
  and live Stripe approval gates are present.
- API9 Improper Inventory Management: this document plus the static inventory
  test are the durable API inventory. Dev-only rewrites and guarded demo routes
  are explicitly identified.
- API10 Unsafe Consumption of APIs: Stripe, OpenAI, notification delivery, and
  portal delivery failures are sanitized; raw provider payloads/secrets are not
  returned to browser routes or customer portal output.

## Open Gaps And Blockers

| Severity | Gap | Recommended next step |
| --- | --- | --- |
| High | Static review cannot prove live Supabase RLS/advisor state or whether `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql` has been applied to the approved target. | Operator approves target, applies pending security migration if needed, then reruns Supabase Security/Performance Advisors. |
| Medium | Rate limiting depends on the deployed Vercel Firewall/WAF integration; local and non-Vercel fallback is intentionally no-op. | Confirm Vercel Firewall/rate-limit policy coverage during protected preview setup. |
| Medium | Provider webhook destinations are env-controlled and not live-smoked here. | In preview, configure test provider endpoints only after approval, then smoke with sanitized logs and no raw payloads in docs. |
| Medium | Customer data retention/deletion/export is operational guidance, not final legal policy. | Finalize privacy/retention commitments with operator/counsel before customer-facing publication. |
| Low | API inventory is static and must be kept current as routes are added. | Keep `tooling/owasp-api-route-inventory.test.ts` in the focused test path and update this doc with each new API route. |

## Recommended Next Slices

1. Supabase Advisor Closure V1: operator-approved target verification, security
   migration apply readiness, advisor rerun, and sanitized closure evidence.
2. Provider Smoke V1: test-mode Stripe, portal delivery, and notification
   delivery smoke against approved preview settings without dashboard mutation
   from Codex.
3. API Rate Limit Policy V1: explicit Vercel Firewall policy documentation and
   preview verification for payment, portal send, compliance, notification, and
   portal read routes.
