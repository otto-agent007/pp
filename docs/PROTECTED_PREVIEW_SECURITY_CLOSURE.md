# Protected Preview Security Closure V1

This ledger tracks the remaining work required before Pest Patrol OS can be
called production-readiness protected. It is not a penetration test and it does
not record secrets, raw provider payloads, reset links, portal tokens, or
dashboard-only values.

## Current Status

| Gate | Status | Evidence | Owner / next action |
| --- | --- | --- | --- |
| OWASP API and web-risk inventory | Passed | PR #123 merged; `docs/OWASP_API_SECURITY_REVIEW.md` maps API Security Top 10 2023 and OWASP Top 10 2025 companion risks. | Keep `tooling/owasp-api-route-inventory.test.ts` in focused and full verification. |
| Static route inventory and RLS audit | Passed | `corepack pnpm exec vitest run tooling/owasp-api-route-inventory.test.ts tooling/rls-boundary-audit.test.ts` passed on this branch. | Rerun after route, migration, or RLS changes. |
| Static baseline guardrails | Passed | `corepack pnpm security:baseline` passed with no static guardrail findings. | Keep in CI and rerun before production sign-off. |
| Compliance source preflight | Passed, read-only | `corepack pnpm compliance:ingest -- --dry-run --no-embed` processed 6 sources, 6 documents, and planned 6 chunks with Supabase writes and embeddings disabled. | Only run live ingest after target/env approval. |
| Local demo smoke preflight | Blocked by env | `corepack pnpm demo:smoke -- --target local` blocked on missing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. | Operator loads approved local or preview env names before seed/reset or browser smoke. |
| Protected preview browser smoke | Blocked by access | No approved protected-preview URL/session and admin or dispatcher sign-in path were available in this shell. | Operator provides protected-preview access and an approved sign-in path through a safe channel. |
| Supabase migration/advisor closure | Blocked by approval | Static docs identify pending `20260609000000_supabase_rpc_execute_grants_hardening_v1.sql`; no migration apply was run here. | Operator approves target, applies pending migrations in order, reruns Security and Performance Advisors, and records sanitized results. |
| Supabase leaked-password protection | Blocked by dashboard/plan | `docs/AUTH_PRODUCTION_HARDENING.md` and `docs/PRODUCTION_READINESS.md` track this as an operator dashboard action or accepted plan limitation. | Enable if available on the current plan, otherwise record the accepted limitation before production. |
| Vercel Firewall/WAF and rate limits | Blocked by dashboard approval | Route-level rate-limit helpers exist; dashboard WAF/rate-limit rules were not mutated here. | Operator configures and records rule IDs for `/api/*`, `/api/portal/*`, `/api/compliance/*`, and `/api/payments/stripe-webhook`. |
| Stripe test-mode smoke | Blocked by provider setup | Stripe route tests pass in repo, but no live provider call or dashboard check was run here. | Configure test-mode keys/webhook, create a payment link, complete a test-card payment, and replay the webhook idempotently. |
| Portal delivery smoke | Blocked by provider/setup choice | Manual fallback and provider-safe route tests exist; no portal delivery webhook was called here. | If webhook configured, send one test portal link; otherwise verify manual fallback in authenticated preview. |
| Notification delivery smoke | Blocked by provider/setup choice | Notification delivery route tests cover duplicate/failure states; no notification webhook was called here. | If webhook configured, send one test notification; otherwise verify manual fallback in authenticated preview. |
| Customer portal privacy smoke | Blocked by preview access | Repo tests cover customer-safe DTOs, token/session boundaries, revoke, and hash omission; no authenticated preview session was available. | Run customer portal token, revoke, billing, closeout, media, and privacy smoke in protected preview. |
| Technician/mobile assigned-job smoke | Blocked by preview access | Static RLS audit and mobile tests cover queue-first behavior; no authenticated technician preview/mobile smoke was available. | Verify technician-only auth and assigned-job sync against the approved preview Supabase target. |
| Privacy and retention sign-off | Blocked by operator/legal review | `docs/CUSTOMER_DATA_PRIVACY_RETENTION.md` is operational guidance only. | Operator/counsel finalizes retention, deletion, export, and notice commitments before customer-facing publication. |

## Production-Readiness Exit Criteria

Production remains blocked until all High gates are closed and every Medium gate
is either closed or explicitly accepted with an owner, date, and rationale.

Required closeout evidence:

- Supabase migration history inspected for the approved preview target.
- Pending security migrations applied in timestamp order.
- Supabase Security and Performance Advisors rerun and summarized without raw
  secrets or dashboard-only values.
- Private `job-media` bucket posture verified.
- Leaked-password protection enabled or explicitly accepted as unavailable on
  the current plan.
- Vercel Firewall/WAF rule IDs recorded for API, portal, compliance, and Stripe
  webhook paths.
- Stripe test-mode payment-link and webhook replay smoke passed.
- Portal and notification provider/manual-fallback smoke passed.
- Authenticated admin/dispatcher, technician, mobile/offline sync, and customer
  portal privacy smoke passed.
- Customer data privacy/retention commitments reviewed by the operator before
  customer-facing production launch.

## Safe Commands

Run these before any security readiness PR is marked ready:

```bash
corepack pnpm exec vitest run tooling/owasp-api-route-inventory.test.ts tooling/rls-boundary-audit.test.ts tooling/production-readiness-protection.test.ts
corepack pnpm security:baseline
corepack pnpm compliance:ingest -- --dry-run --no-embed
corepack pnpm demo:smoke -- --target local
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
git diff --check
```

After operator setup, run the protected-preview checks with the approved preview
URL and access path:

```bash
corepack pnpm demo:smoke -- --target preview --base-url <protected-preview-url>
corepack pnpm compliance:ingest -- --dry-run --no-embed
```

## Non-Goals For This Slice

- No migration apply.
- No Supabase, Vercel, Stripe, notification, portal delivery, or OpenAI dashboard
  mutation.
- No live provider call.
- No preview or production data mutation.
- No seed/reset write.
- No paid scanner or new external service.
- No secret, token, reset-link, or raw provider-payload capture in repo docs.
