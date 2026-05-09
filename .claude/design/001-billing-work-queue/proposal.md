# Proposal: Billing Work Queue V1

## Goal & non-goals

- **Goal:** Office users open one page and immediately see *which completed jobs are ready to bill, which still need captures, which already have invoices, and what to do next* — without inventing a new schema or moving data around.
- **Non-goals:** new schema, new RPCs, Stripe/provider work, portal changes, mobile changes, "Mark not billable" workflow (V2).

## Approach

Re-frame `/closeouts` as the **Billing work queue** (same URL, same data — just grouped, counted, and labeled by billing-readiness). `/payments` keeps its current shape with two additions: a "From closeouts" hand-off strip at the top and a contextual breadcrumb when a `?job_id=` lands. No new pages. All work lands behind two new pure helpers in `packages/domain/closeouts.ts`.

---

## Information hierarchy — `/closeouts` (rebranded "Billing work queue")

1. **Header** — `Admin` eyebrow → `Billing work queue` title → one-line subtitle:
   > *"Completed jobs grouped by billing readiness. Open one to review captures or create an invoice."*
2. **Counter strip** (4 tiles, click-to-filter; matches `/payments` KPI tile component for visual consistency):
   - `Ready to bill` (success token)
   - `Needs captures` (warning token)
   - `Invoiced` (info token)
   - `Total completed` (neutral, secondary)
3. **Two-column layout** (preserves current 340px / 1fr split):
   - **Left** — queue list, grouped into 3 sections (see next table). Search + status filter sits above.
   - **Right** — selected-job detail. Existing capture review unchanged below; **new "next action" card pinned at the top** of the detail.

## Queue sections (left column)

| Section | Includes | Default | Row content | Pill |
|---|---|---|---|---|
| **Ready to bill** | `status === "completed"`, captures complete, no invoice | Expanded | `Customer` (line 1) · `Address · Service date` (line 2) | `Ready` (success) |
| **Needs captures** | `status === "completed"`, captures incomplete | Collapsed | Same row · summary line `Needs photo and signature` | `Needs <missing>` (warning) |
| **Invoiced** (latest 10 + "Show all → /payments") | At least one invoice for the job | Collapsed | Same row | Invoice status: `Draft` / `Sent` / `Paid` / `Void` (info / neutral) |

**Sort within sections:** oldest-first in *Ready to bill* (so unbilled work surfaces); newest-first elsewhere.

## "Next action" card (detail panel, top)

One card, state-driven, exactly one primary action — kills the "what do I do next?" ambiguity:

| Job state | Title | Body | Primary CTA | Secondary |
|---|---|---|---|---|
| Ready, no invoice | `Ready to bill` | *"Forms, chemicals, photos, and signatures are captured."* | `Create invoice →` (existing handoff) | — |
| Needs captures | `Needs <missing>` | Reuse existing `readiness.summary` | (none — view-only) | — |
| Draft invoice | `Invoice in draft` | *"Review line items and create a payment link."* | `Open invoice →` (deep-link `/payments?invoice_id=…`) | — |
| Sent | `Invoice sent` | *"Awaiting payment. Balance $X.XX."* | `Open payment link` (if present) | `Mark paid` |
| Paid | `Paid` | *"$X.XX received <date>."* | (none) | `View invoice` |
| Void | `Voided` | *"Invoice was voided. Reissue if needed."* | `Create new invoice` | — |

---

## Information hierarchy — `/payments`

Two small additions, no structural change:

1. **"From closeouts" hand-off strip** (top, above the Stripe setup banner):
   > `3 ready to bill · 2 need captures` · `View queue →`
2. **Contextual breadcrumb** when arriving via `?job_id=…`:
   > `From closeout: Acme Pest @ 123 Main St` *(small, above the "Create invoice" form)*. Clears when the form submits or job changes.
3. **Existing Stripe setup banner** — collapse into a `Setup` accordion once configured. Out of scope to wire that detection; Codex's call.

The 4-tile KPI strip (`Draft / Sent / Open / Paid`) stays as-is — it's the right primitive on this page.

---

## State map

| State | Where | Treatment |
|---|---|---|
| **Loading** | counters + queue | Skeleton tiles + 3 skeleton rows. No full-page spinner. |
| **Empty (no completed jobs)** | queue | Single dashed-border block: *"No completed jobs yet. As technicians finish jobs in dispatch, they'll appear here."* No CTA — read-only state. |
| **Empty (section)** | inside Ready to bill | Inline one-liner under the section header: *"Nothing ready to bill — check Needs captures."* No card. |
| **Error (jobs fetch fails)** | top of queue | Inline banner: *"Couldn't load completed jobs."* + `Retry`. List below is hidden. |
| **Already invoiced** | row | Row appears only in the *Invoiced* section, with the invoice status pill. Detail panel shows the invoice "next action" card; the old `Create invoice` button does **not** appear. |
| **Selected job — captures still loading** | detail | Replace next-action card with skeleton. Capture sections below show *"Loading field captures"* (existing behavior). |
| **Mutation in flight** | next-action CTA | Disable the button, replace label with `Creating invoice…` / `Opening payment link…`. Toast on success/error (uses existing React Query mutation state). |

---

## Copy bank (utility, not marketing)

- Page title: **Billing work queue**
- Sections: **Ready to bill** · **Needs captures** · **Invoiced**
- Pills: `Ready`, `Needs photo`, `Needs photo and signature`, `Draft`, `Sent`, `Paid`, `Void`
- Status sentences (factual, terse):
  - *"Forms, chemicals, photos, and signatures captured."*
  - *"Needs photo and signature before billing."*
  - *"Awaiting payment. Balance $124.50."*
  - *"$124.50 received Apr 28."*
- Buttons (verb-first, ≤3 words): `Create invoice`, `Open invoice`, `Open payment link`, `Mark paid`, `View invoice`, `Create new invoice`, `Retry`

---

## Layout notes (Next/Tailwind, existing patterns)

- **Counters** — same `rounded-lg border bg-white p-4` tile as `/payments` summary; `grid grid-cols-2 sm:grid-cols-4 gap-3`. Click sets the queue filter.
- **Section headers** — `flex items-center justify-between`, button-collapse with chevron. Count badge: small muted `({n})` after the title.
- **Queue rows** — keep existing `<button>` pattern; add `flex items-start justify-between gap-3` to right-align the status pill. Two-line row at `text-sm` / `text-xs`. Density target: ~64–72px per row.
- **Status pill** — inline span until `packages/ui` primitives ship: `rounded-md px-2 py-0.5 text-xs font-semibold uppercase`. Color via `bg-semantic-status-{success|warning|info}-bg text-semantic-status-{…}-fg border border-semantic-status-{…}-border`. Drop-in replaceable later with a `<StatusPill>` primitive.
- **Next-action card** — same shape as the existing readiness card on `/closeouts` (`rounded-md border p-4`), variant by status. The existing helper already produces the success/warning copy — reuse it.
- **Hand-off strip on `/payments`** — `rounded-md border bg-semantic-background-canvas px-4 py-3 text-sm` with a right-aligned `View queue →` link.

## Optional, low-risk admin-nav cue

Add a small numeric badge to the `Closeouts` (→ `Billing work queue`) link in the admin sidebar: `Billing work queue (3)` — count = `Ready to bill`. Same data already loaded by the page, so adding it to the sidebar context is cheap. Tag as optional in case Codex prefers to ship the queue first and the badge later.

---

## Data sources & state boundaries (AGENTS conformance pre-check)

| Concern | Plan |
|---|---|
| **No direct Supabase from UI** | Pages keep using `useJobs()` and `useInvoices()` (existing React Query hooks). New views derive from those. ✅ |
| **Business logic in `packages/domain`** | Two new pure helpers in `packages/domain/closeouts.ts`: `groupBillingQueue(jobs, invoices, reviews?) → { ready, needsCaptures, invoiced }` and `getBillingQueueCounts(...)`. Both unit-testable without React. ✅ |
| **No schema changes** | All groupings derived from existing `Job.status`, existing invoice records, and existing `JobCloseoutReview`. ✅ |
| **State boundaries** | Selection state stays in component. Filter state via URL search params (so deep-links from the counters survive refresh + Vercel previews). Server state stays in React Query. Mutations remain on `/payments` — clicking `Open invoice` deep-links rather than mutating from `/closeouts`. ✅ |
| **Optimistic mutations** | Reuse the existing `useMarkInvoicePaid` / `useCreateInvoicePaymentLink` mutations on the next-action card; same patterns as `/payments`. ✅ |
| **Mobile / offline** | N/A — admin web only. ✅ |

---

## Open questions for Codex

1. **Readiness fan-out cost.** Computing the *Ready to bill* vs *Needs captures* split for N completed jobs needs each job's capture counts. Today, `useJobCloseoutReview` only fetches for the selected job. Three options, in order of preference:
   - (a) **Add a server-side aggregate** to `api-client` (`listJobsWithCloseoutCounts`) returning `{ jobId, formCount, chemicalCount, photoCount, signatureCount, invoiceStatus }` per completed job. No schema change — it's a join. Best UX.
   - (b) **Best-effort grouping**: assume all completed jobs are in `Needs captures` until clicked; hydrate per-job on selection. Simple but poor UX (counter tiles can't be accurate).
   - (c) **Eager parallel fetches** of `useJobCloseoutReview` for every completed job. OK for ≤50 jobs, bad beyond.
   - **Recommendation:** (a) if `api-client` can extend cheaply; otherwise (b) for V1 with a follow-up.
2. **Default sort.** Confirm oldest-first within *Ready to bill* (highest billing urgency) and newest-first elsewhere.
3. **Invoiced section paging.** Show last 10 + `Show all → /payments`, or push entirely to `/payments`?
4. **Section collapse persistence.** Remember per-user via localStorage, or always-default?
5. **URL.** Keep `/closeouts` and re-title only, or `/billing` with `/closeouts` redirect? *(Recommend keep — bookmarks survive.)*

---

## Follow-up ideas (out of scope, noting per the brief)

- **Customer portal**: surface *"Service complete — awaiting invoice"* on the portal billing tab so customers don't ping the office. Out of scope for V1.
- **"Mark not billable"** workflow + reason. Useful but needs schema (status or note) — V2.
- **Stale captures alerting** — completed >7 days ago and no invoice. Counter tile candidate, V2.


---

## Addendum (post-implementation, 2026-05-08)

**Decision: drop the `status` filter from `/closeouts` entirely.**

Now that the page is named "Billing work queue," showing non-completed jobs via a `status="all"` toggle (and the resulting "Other jobs" section in the queue panel) confuses the page identity. Users wanting non-completed jobs go to `/jobs` or `/dispatch`.

**Scope for next pass:**
- Remove the `Queue status` `<select>` from the header.
- Remove the `status` state + URL handling from `CloseoutsClient`.
- Remove the `otherJobs` block (`closeouts-client.tsx:588-614`) and its surrounding conditional.
- `filterCloseoutJobs` in `packages/domain/closeouts.ts` no longer needs the status arg — simplify or drop.
- Update tests in `closeouts-client.test.tsx` and `closeouts.test.ts` accordingly.

No schema changes. No copy changes outside the dropped filter. Header reflows to a single search input.
