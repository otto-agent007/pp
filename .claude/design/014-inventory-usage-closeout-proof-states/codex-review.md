# Codex Review: Inventory Usage + Closeout Proof States V1

## Adopt

- Use the proposal as the design direction for a small UI-only admin polish
  slice. It answers the 014 brief without adding routes, schema work, provider
  setup, Supabase dashboard work, preview/production mutation, or direct
  database access from UI.
- Add per-chemical usage visibility on `/inventory` using the already-loaded
  `logsQuery.data`: a compact usage-count line on chemical cards and an
  optional inline last-3 usage strip for chemicals that have logs.
- Add low-stock watchlist recency copy when it can be derived cleanly from the
  same loaded logs: `Last used [date] - [customer]` or `No uses logged -
  inspect for aging stock`.
- Add a compact blocking-step line for `needsCaptures` closeout queue rows so
  operators can see the missing capture path without parsing the full summary.
- Restructure `ProofHandoffCard` into a clearer completion header plus grouped
  evidence-pill clusters: `Location evidence` and `Billing captures`.
- Add a short context cue to `NextActionCard` so the primary billing action is
  tied to the proof state.

## Adapt

- Do not put `useState` directly inside a mapped chemical-card render. Either
  keep expanded chemical ids in `InventoryClient` state or extract a focused
  child component if the implementation stays readable.
- Keep all inventory usage counts explicitly scoped to the logs currently
  loaded by `useChemicalLogs`. Do not imply full audit-history completeness
  until a dedicated paginated history route or API contract exists.
- Omit usage affordances while logs are loading or errored. Avoid rendering a
  temporary `0 uses` state that could flip after data arrives.
- Preserve the existing queue-row readiness pill. The new missing-capture line
  should complement, not replace, the visual status treatment.
- Derive queue-row missing labels from existing readiness data and cap the
  visible line at three readable items. If the existing formatter cannot
  produce dot-separated labels cleanly, add a tiny local formatting helper
  rather than changing domain contracts.
- In `ProofHandoffCard`, compute the "items need review" count from local pill
  metadata, but do not count a neutral `No invoice yet` state as missing
  evidence when the proof is otherwise ready to bill.
- Adjust completion copy so it does not contradict invoice state. For example,
  `All proof captured. Create invoice to close out.` fits only when no invoice
  exists; sent, paid, draft, or void invoice states need invoice-specific copy.
- Use existing US product copy conventions, including `finalize` rather than
  `finalise`.
- Keep this as web presentation work. Any future typed proof-state export from
  `packages/domain` remains Codex-owned shared-domain work and should be a
  separate approved slice.

## Defer

- Dedicated `/inventory/[chemical-id]` or full chemical usage-history routing.
- Pagination, usage charts, or trend visualization.
- Bulk missing-capture requests from the closeout queue.
- Compliance cross-reference treatment on chemical cards.
- A typed domain-state replacement for `proofCompletionTone`.
- Any provider, migration, RLS, env, preview, production, or Supabase dashboard
  work.

## Reject

- New API routes or schema changes hidden inside this UI polish.
- Direct Supabase reads or writes from `/inventory` or `/closeouts`.
- Broad layout rewrites that undo the dense 013 operations-first admin surface.
- Customer-facing exposure of exact technician GPS in portal or billing copy.

## Implementation recommendation

Implement this as one narrow, test-first UI slice after the current dirty
worktree is either preserved on this branch or split into explicit review
surfaces:

1. Add focused inventory tests for usage-count copy, no-log copy, and the
   inline last-3 usage strip.
2. Add focused closeouts tests for missing-capture micro-lines, grouped proof
   evidence headings, non-contradictory proof header copy, and `NextActionCard`
   context cues.
3. Implement using existing hooks and domain data only.
4. Verify with focused web tests plus the project gates required by
   `docs/AGENTS.md`.

## Implementation risks Codex must test

- Usage counts must not show misleading zeros while chemical logs are loading
  or unavailable.
- Expanded usage strips must not resize or destabilize chemical-card controls
  on narrow screens.
- Closeout proof copy must stay correct across ready, missing-capture, draft,
  sent, paid, void, and no-invoice states.
- The grouped evidence-pill layout must not hide GPS privacy boundaries or
  expose exact technician coordinates to customer-safe surfaces.
