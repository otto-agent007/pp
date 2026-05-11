# Codex Review: Billing Work Queue V1

## Adopt

- Reframe `/closeouts` as a focused Billing work queue.
- Use readiness grouping, counter tiles, state-driven next-action cards, and a `/payments` handoff strip.
- Preserve no-migration, no-provider, domain/API-client boundaries.
- Keep the `/closeouts` URL while clarifying the page identity.

## Adapt

- Treat the proposal's original aggregate-readiness concern as historical context; current implementation should be checked before reusing old helper names.
- Treat the post-implementation addendum as the actionable remaining design note: remove status-filter/other-jobs behavior from the Billing work queue when that follow-up is selected.

## Defer

- Admin nav badge.
- Section collapse persistence.
- Portal-facing "awaiting invoice" messaging.
- "Mark not billable" workflow, because it likely needs schema and product decisions.

## Reject

- Eager per-job closeout fetches for queue grouping.
- Schema, provider, Stripe, or portal expansion inside the Billing work queue follow-up.

## Next Recommendation

This proposal is reviewed. Future watcher runs should skip this folder and wait for `.claude/design/002-portal-share-resend/proposal.md`.
