# Critique: Billing Work Queue V1 (post-implementation)

Reviewed: `da6eb66`, `746a541`, merge `2ffdd52`. Implementation lives in `apps/web/app/closeouts/closeouts-client.tsx`, `apps/web/app/payments/payments-client.tsx`, `packages/domain/closeouts.ts`, `packages/api-client/closeouts.ts`.

## What's correct against the proposal

- Page retitled **Billing work queue** with the proposed eyebrow + subtitle
- Four-tile counter strip with click-to-filter (✨ also URL-persisted via `?queue=…`, beyond what the proposal asked)
- Two-column layout (340px / 1fr) with three queue sections in the proposed order: Ready to bill → Needs captures → Invoiced
- Section headers carry `({n})` count badges
- `NextActionCard` is state-driven and one primary CTA per state — matches the proposal's table
- Sort behavior verified in `closeouts.ts`: `sortOldestFirst` for ready, `sortNewestFirst` for needsCaptures and invoiced
- Aggregate path uses `listCloseoutCaptureSummaryRecords` via `api-client` — picked open-question option (a). No schema change.
- `/payments` "From closeouts" strip with `View queue →` link
- All AGENTS rules honored: data via React Query hooks, domain pure, no Supabase from UI, no schema changes
- Bonus: `746a541` pulled `getBillingQueueItemSummary` back into domain rather than letting it live in the client. Right instinct.

## Visual / copy issues

1. **`closeouts-client.tsx:184-188` — pill copy loses precision when >1 capture missing.**
   Current:
   ```ts
   item.readiness.missing.length === 1
     ? `Needs ${item.readiness.missing[0]}`
     : "Needs captures"
   ```
   Proposal called for `Needs photo and signature` / `Needs photo, signature, and chemical log` for the multi-missing case. The fix is mechanical — the `joinMissing` helper already exists in `packages/domain/closeouts.ts:129` and produces the right string. Replace the multi-case fallback with `Needs ${joinMissing(item.readiness.missing)}`.

2. **`closeouts-client.tsx:380` — paid copy dropped the date.**
   Current: `${formatMoney(invoice.total_cents, invoice.currency)} received.`
   Proposal: `$X.XX received <date>`. `invoice` carries `paid_at` (or first paid `payment.paid_at` via the invoice's `payments[]`). Office staff use this to reconcile against bank deposits. Cheap fix:
   ```ts
   paid: `${formatMoney(invoice.total_cents, invoice.currency)} received ${formatDateMedium(invoice.payments?.[0]?.paid_at ?? invoice.updated_at)}.`
   ```

3. **`payments-client.tsx` — no breadcrumb when arriving via `?job_id=`.**
   `searchParams.get("job_id")` is correctly threaded into form state (line 97), but the user gets no visual cue they got there from a closeout deep-link. Proposal called for a small `From closeout: <customer> @ <address>` line near the Create invoice form. Builds confidence that the right job is selected.

4. **`closeouts-client.tsx:557-562` — loading + error states are text-only `EmptyState`s.**
   Functional, but lower fidelity than the proposed skeleton tiles + 3 skeleton rows. Also: error state omits a `Retry` button and tells the user to "Retry from the browser or refresh the page." React Query already retries on focus, so a button isn't strictly required — but a one-liner `<button onClick={() => jobsQuery.refetch()}>Retry</button>` is friendlier than telling the user to refresh.

5. **`closeouts-client.tsx:619-625` — `NextActionCard` is rendered *inside* the job-header section, not pinned at the top of the detail panel.**
   This means on small viewports the action scrolls with the header rather than staying anchored. Visually the card lands first (inside the same `<section>`), so impact is small — but if we ever add a sticky-on-scroll behavior, it'll need to move out into its own panel-top region.

## Interaction / state issues

6. **Filter switch doesn't clear stale selection.**
   If you have an `invoiced` job selected and click the **Ready to bill** counter, `selectedJobId` keeps pointing at the invoiced job (which is no longer in `queueItems`). The fallback `queueItems[0]` saves you (auto-selects the first ready item), but the previously selected job's detail flashes momentarily. Trivial fix: in `setFilter`, also call `setSelectedJobId(null)`.

7. **Filter state in URL but selection is not.**
   `?queue=ready` survives reload, `&job_id=…` does not. Considered an enhancement, not a bug. The proposal didn't strictly require URL-persisted selection.

## Scope drift

8. **`closeouts-client.tsx:588-614` — "Other jobs" section appears when `status === "all"`.**
   Brief was *completed* jobs only. The "Other jobs" list shows non-completed jobs in the queue panel when the status filter is widened. Defensible (the page had a status filter pre-slice), but it's outside the queue's brief and arguably confuses the page's identity ("Billing work queue" + non-completed jobs). Two options:
   - **Drop it.** If users want to see non-completed jobs, send them to `/jobs` or `/dispatch`. Cleaner.
   - **Keep it but rename the page to reflect dual purpose.** The proposal recommended keeping the URL `/closeouts` *and* renaming to "Billing work queue" — those are now in tension.
   - Recommend: drop the "All jobs" status filter from this page entirely. It's a pre-slice artifact that no longer fits.

9. **Stripe Setup banner left as a permanent block on `/payments`** (lines 214-232).
   The proposal suggested collapsing it into a `Setup` accordion once Stripe is configured. Codex correctly tagged this as a separate slice ("Stripe Test Mode Readiness V1") rather than expanding scope here. Noting the deferral, not flagging as an issue.

## Out of scope (parked, OK)

- **Admin-nav `Closeouts (n)` badge** — proposal tagged this as optional. Codex correctly skipped. Cheap follow-up if anyone wants it.
- **`decisions.md`** for the option (a)/(b)/(c) readiness fan-out choice — would memorialize the rationale for picking the server aggregate over per-job hydration. Worth adding for future relay context, not blocking.
- **Section collapse persistence** — open question 4 from the proposal. Sections always expand on load. Fine for now; revisit if the queue grows past ~20 items per section.
- **Invoiced section paging** — open question 3. Currently shows all invoiced items in the section rather than 10 + `Show all → /payments`. Acceptable until invoice volume forces the cut.

## Verification needed after fixes

- Issue 1 (pill copy): confirm `joinMissing` output reads naturally for 2 and 3 missing items in real layouts
- Issue 2 (paid date): confirm `invoice.payments` is populated when status is `paid` (it should be after a Stripe webhook, but check the `useInvoices` hook's join shape)
- Issue 6 (selection clear): verify the auto-select-first-item fallback doesn't briefly flash the old selection during state transition

## Suggested ordering

If you batch the fixes, **issues 1 + 6** are 5-line patches with clear visual wins. **Issue 2** is one helper function and a small copy change. **Issue 3** is the highest-confidence UX win on `/payments`. **Issues 4, 5** are polish — defer if velocity matters more.

**Issue 8** is the only judgment call worth a quick chat — keep "Other jobs" or drop the `status` filter? My preference is drop it; the page identity is cleaner.
