# Backup and Rollback Runbook V1

This runbook is an operational checklist for Pest Patrol OS launch hardening. It is not a command recipe for Codex to execute. Operators must approve the exact target, shell, and command before any write-capable backup, migration, restore, rollback, seed/reset, provider, preview, or production action.

## Scope

- Local: developer-owned Supabase/local app state used for disposable testing.
- Protected preview: shared preview environment behind approved access controls.
- Production: customer, technician, payment, media, portal, compliance, and operational records that must be preserved.

## What must be backed up or inventoried

- Supabase Postgres database, including auth/profile, customers, locations, jobs, media metadata, forms, signatures, invoices, payments, notifications, portal sessions/tokens, technician credentials, chemical logs, WDO/Escrow records, compliance source state, scheduler history, and migration history.
- Supabase Storage buckets and media objects, especially job photos, signatures, and customer portal signed-url source media.
- Environment variable inventory by name only, without values.
- Stripe dashboard configuration notes, webhook endpoint paths, event types, and signing-secret rotation owner.
- Vercel project settings notes, build settings, deployment protection posture, cron paths, firewall/rate-limit policies, and rollback owner.
- Compliance source ingestion state, source manifests, chunk/document counts, and whether embeddings were enabled.
- Migration list, git SHA, applied migration history, and pending migration files.

## Pre-migration checklist

- Confirm the target is local, protected preview, or production.
- Confirm the git SHA and branch being deployed.
- Confirm the migration list in timestamp order.
- Confirm a current database backup exists for the target.
- Confirm storage/media backup posture and restore owner.
- Confirm rollback owner and decision maker are available.
- Confirm no demo seed/reset is pointed at production.
- Confirm production env values are loaded only in the operator shell and are not pasted into docs, chat, logs, or commits.
- Confirm no Codex-run write-capable command will run without explicit operator approval of the target and command.

## Migration failure response

- Stop further writes or deployment retries until the target is understood.
- Capture sanitized logs, failing migration name, git SHA, deployment ID, and timestamp.
- Identify whether the failure is schema, permissions, data-shape, provider, or deployment-order related.
- Do not rerun blindly.
- Inspect Supabase migration history carefully before deciding repair, rollback, or forward-fix.
- Use migration repair only with explicit operator approval.
- Document the rollback/forward-fix decision and the owner who approved it.

## Vercel rollback

- Identify the last known good deployment and its git SHA.
- Roll back from the Vercel dashboard or CLI only after operator approval.
- Do not mutate Vercel env vars or firewall settings during rollback unless explicitly approved.
- Validate the app shell, admin login route, readiness/health path if present, and customer-safe portal behavior after rollback.

## Stripe incident response

- If a webhook secret is suspected compromised, disable or rotate it through Stripe-owned operator steps.
- Preserve manual fallback for invoice/payment reconciliation.
- Reconcile duplicate, partial, pending, or failed payments against Stripe records before changing invoice state.
- Never delete payment records casually; preserve audit history.
- Refunds, disputes, chargebacks, and payment reversals are manual/operator-owned workflows.

## Customer portal incident response

- Revoke affected portal access tokens or sessions where supported.
- Rotate customer links by generating fresh access for affected customers.
- Confirm old tokened or session-backed links no longer load closeouts or billing.
- Keep customer-visible proof customer-safe: no internal notes, exact GPS, token hashes, provider internals, or compliance warnings.

## Notification incident response

- Disable provider env or delivery webhook from the operator dashboard/shell when needed.
- Keep manual follow-up available.
- Prevent duplicate arrival or reminder notices before retrying.
- Audit notification event history, generated keys, delivery attempts, and provider message IDs without exposing provider secrets.

## Compliance ingestion rollback

- Treat compliance output as staff-only and advisory.
- If ingestion is bad, prefer marking sources draft/archived if supported instead of deleting evidence.
- Do not delete compliance evidence without review.
- Rerun ingestion only after source manifest review and with operator-approved target/env names.
- Prefer `corepack pnpm compliance:ingest -- --dry-run --no-embed` for read-only evidence.

## Restore verification checklist

After a restore or rollback, verify at minimum:

- Admin login and role-gated admin shell.
- Dispatch schedule and assignment views.
- Customers, locations, and customer account ledger.
- Jobs and closeout readiness.
- Closeouts, proof media, signatures, and forms.
- Payments, invoices, manual reconciliation, and Stripe fallback state.
- Compliance advisory workspace remains staff-only/advisory.
- Inventory and chemical logs.
- Technicians, credentials, and invite/password setup paths.
- WDO/Escrow readiness.
- Customer portal session/access revocation and customer-safe proof.
- Mobile technician offline queue and basic sync behavior.

## Production launch gate

Production migration or deployment is blocked until this runbook is reviewed by the operator and the target-specific backup owner, rollback owner, and communication owner are named.
