# Proposal: Customer Ledger Drill-Down V1

## Goal & non-goals

- **Goal:** Office users expand the existing compact `CustomerLedgerSummary` inside a customer card to see the full account timeline — all services and invoices — filterable by type and status, with one clear primary action per entry. No new route, no new hooks, no schema changes.
- **Non-goals:** replacing `/payments` as the invoice workspace, replacing `/closeouts` as the billing work queue, customer-facing portal redesign, schema or RLS changes, new provider config, email/SMS, or any data outside existing React Query hooks.

## Approach

Extend `CustomerLedgerSummary` with an inline expand/collapse toggle. The collapsed state (current) shows the 4-row preview + summary metrics. The expanded state reveals the full `buildCustomerLedger` output behind a 5-tab filter strip. No new route. No new hooks. All business logic stays in `packages/domain/customerLedger.ts`.

The expand trigger replaces the current `Open billing` text link with a two-button row: `Show all activity` (expands inline) and `Open billing →` (navigates to `/payments?customer_id=…` as today). On mobile, both fit on one line at `text-xs`.

---

## Information hierarchy — `CustomerLedgerSummary` (expanded)

```
┌─────────────────────────────────────────────────────────────┐
│  Account ledger                           [Open billing →]  │
│  Latest service Apr 28                                      │
├─────────────────────────────────────────────────────────────┤
│  SUMMARY STRIP                                              │
│  Open balance   Paid total   Latest invoice                 │
│  $340.00        $1,200.00    May 1                          │
├─────────────────────────────────────────────────────────────┤
│  ⚠ 2 payments need review.  [Review →]                     │  ← only if reviewCount > 0
├─────────────────────────────────────────────────────────────┤
│  [All (8)] [Services (3)] [Invoices (5)] [Open (2)]        │
│  [Review (2)]                                               │  ← tab strip
├─────────────────────────────────────────────────────────────┤
│  LEDGER ROWS (full list, newest first)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ● Paid invoice          May 1                        │  │
│  │    123 Oak St            $320.00          [Open →]   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ● Service completed     Apr 28                       │  │
│  │   123 Oak St                       [View closeout →] │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ⚠ Payment needs review  Apr 15                       │  │
│  │   456 Elm Ave           $180.00    [Review payment →]│  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [Hide activity ↑]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Expand / collapse trigger

**Collapsed state (default — current behavior):**
- Shows 4 most-recent entry rows from `entries.slice(0, 4)`.
- Bottom row: `[Show all activity]` (secondary button, left) + `Open billing →` (text link, right).
- If `entries.length <= 4`, the `Show all activity` button is absent; only `Open billing →` remains.

**Expanded state:**
- Full entry list behind the tab strip.
- `[Show all activity]` button replaced by `[Hide activity ↑]` (same position, same style, toggles back).
- `Open billing →` link stays in place at the top-right.

**State management:** a single `const [expanded, setExpanded] = useState(false)` inside `CustomerLedgerSummary`. No URL state needed for V1.

---

## Summary strip

Unchanged from current implementation — three `<dl>` tiles:

| Tile | Source | Format |
|---|---|---|
| Open balance | `summary.openBalanceCents` | `formatMoney()` |
| Paid total | `summary.paidCents` | `formatMoney()` |
| Latest invoice | `summary.latestInvoiceAt` | `formatDate()` (returns "None yet" if null) |

Keep existing `sm:grid-cols-3` layout.

---

## Review alert

Show only when `summary.reviewCount > 0`. Replace the current plain-text alert with a two-element row:

```
⚠ {n} payment{n === 1 ? '' : 's'} need{n === 1 ? 's' : ''} review.   [Review →]
```

`[Review →]` links to `/payments?customer_id={customer.id}&filter=review` — same destination as the existing `Open billing` link but with a `filter=review` hint for `/payments` to consume (already compatible with `?queue=…` URL pattern from the billing work queue slice).

**Styling:** `rounded-md border border-amber-200 bg-amber-50 p-2 text-sm font-medium text-amber-800 flex items-center justify-between` — keeps existing amber visual, adds the right-aligned link.

---

## Tab strip (expanded only)

Five tabs, rendered as a `<div role="tablist">` above the ledger rows:

| Tab | Filter condition | Badge |
|---|---|---|
| All | none | entry count |
| Services | `type === "scheduled_service" \| "completed_service"` | count |
| Invoices | `invoice_id !== null` | count |
| Open | `type === "sent_invoice" \| "draft_invoice" \| "partial_payment"` | count, accented if > 0 |
| Review | `review === true` | count, amber if > 0 |

Default active tab: **All**.

**Tab styling:** `text-xs font-semibold px-3 py-1.5 rounded-full` with `bg-primary text-white` for active, `text-gray-600 hover:bg-gray-100` for inactive. Badge: `ml-1 rounded-full bg-white/30 px-1.5 text-[10px] font-bold` inside the active tab; `bg-gray-100 text-gray-500` inside inactive tabs. Amber accent for Review badge when count > 0 and tab is inactive: `bg-amber-100 text-amber-700`.

The tab strip is a pure derived filter over `entries` — no additional queries, no domain changes.

---

## Ledger rows (expanded)

One row per `CustomerLedgerEntry`, newest first (already sorted by `buildCustomerLedger`).

**Row layout:**

```
[dot]  [label]              [date right-aligned]
       [detail]   [amount]  [primary action]
```

- **Dot:** `inline-block w-1.5 h-1.5 rounded-full align-middle mr-2` — color by entry type (see table below).
- **Label:** `text-sm font-semibold text-neutralDark`
- **Detail:** `text-xs text-gray-600`
- **Date:** `text-xs text-gray-500` — same `formatDate()` helper
- **Amount:** `text-xs font-semibold text-neutralDark` — shown only when `entry.amount_cents !== null`; format as `formatMoney(entry.amount_cents)`
- **Balance pill** (open/partial only): `text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 rounded px-1` — shown when `entry.balance_cents > 0`; text: `Balance {formatMoney(entry.balance_cents)}`
- **Primary action:** `text-xs font-semibold text-primary hover:underline` — right-aligned; content per entry type (see action table)
- **Row container:** `flex items-start justify-between gap-2 py-3 border-b border-gray-100 last:border-0`
- **Review flag:** if `entry.review === true`, wrap label in `text-amber-800` and prefix with `⚠ ` (no structural change — just class swap)

### Entry type → dot color + primary action

| Entry type | Dot color | Action label | Href |
|---|---|---|---|
| `scheduled_service` | `bg-blue-400` | View job | `/jobs?job_id={entry.job_id}` |
| `completed_service` | `bg-emerald-500` | View closeout | `/closeouts?job_id={entry.job_id}` |
| `paid_invoice` | `bg-emerald-500` | View receipt | `/payments?invoice_id={entry.invoice_id}` |
| `sent_invoice` | `bg-blue-400` | Open invoice | `/payments?invoice_id={entry.invoice_id}` |
| `draft_invoice` | `bg-gray-300` | Open invoice | `/payments?invoice_id={entry.invoice_id}` |
| `partial_payment` | `bg-amber-400` | Review payment | `/payments?invoice_id={entry.invoice_id}` |
| `needs_review_payment` | `bg-amber-400` | Review payment | `/payments?invoice_id={entry.invoice_id}` |
| `void_invoice` | `bg-gray-300` | View invoice | `/payments?invoice_id={entry.invoice_id}` |

All hrefs use `encodeURIComponent`. All navigate via `<Link>` (Next.js) — no imperative pushes.

---

## State map

| State | Where | Treatment |
|---|---|---|
| **Loading (customers / jobs / invoices)** | Whole card | Not in scope — parent `CustomersClient` handles loading at the list level. `CustomerLedgerSummary` receives data after queries resolve. |
| **Empty (no entries)** | Ledger area | `No service or billing activity yet. Schedule a job, then create an invoice before sharing the portal.` (existing copy — keep) |
| **Empty (filter produces no rows)** | Tab body | `No {tab label} entries for this customer.` — `text-sm text-gray-500 py-4 text-center` |
| **Entry: scheduled service** | Row | Blue dot, label "Service scheduled", action "View job" |
| **Entry: completed service** | Row | Green dot, label "Service completed", action "View closeout" |
| **Entry: paid invoice** | Row | Green dot, amount shown, no balance pill |
| **Entry: sent invoice** | Row | Blue dot, amount shown, balance pill if > 0 |
| **Entry: draft invoice** | Row | Gray dot, amount shown (or `—` if null) |
| **Entry: partial payment** | Row | Amber dot, amount + balance pill, action "Review payment" |
| **Entry: needs review** | Row | Amber dot, ⚠ label prefix, action "Review payment" |
| **Entry: void invoice** | Row | Gray dot, amount struck-through via `line-through text-gray-400` |
| **Review alert: 0** | Alert area | Hidden |
| **Review alert: 1+** | Alert area | Amber banner with count + "Review →" link |
| **Collapsed, ≤4 entries** | Footer | No "Show all activity" button; only "Open billing →" |
| **Collapsed, >4 entries** | Footer | "Show all activity" button + "Open billing →" |
| **Expanded** | Full section | Tab strip + full list + "Hide activity ↑" button |

---

## Copy bank

**Section title:** `Account ledger`
**Section subtitle:** `Latest service {formatDate(summary.latestServiceAt)}`

**Summary strip:**
- `Open balance`
- `Paid total`
- `Latest invoice`

**Review alert:**
- `{n} payment needs review.` / `{n} payments need review.`
- `Review →`

**Tab labels:**
- `All` / `Services` / `Invoices` / `Open` / `Review`

**Entry labels (from domain `invoiceLabel` — keep as-is):**
- `Service scheduled`
- `Service completed`
- `Draft invoice`
- `Invoice paid`
- `Partial payment`
- `Payment needs review`
- `Invoice sent`
- `Invoice voided`

**Action labels:**
- `View job`
- `View closeout`
- `View receipt`
- `Open invoice`
- `Review payment`
- `View invoice`

**Footer:**
- `Show all activity`
- `Hide activity ↑`
- `Open billing →`

**Empty states:**
- `No service or billing activity yet. Schedule a job, then create an invoice before sharing the portal.` (existing)
- `No {tab} entries for this customer.`

---

## Layout notes (Next / Tailwind, existing patterns)

- **Expand/collapse button:** `min-h-9 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50` — matches existing secondary button pattern from Portal Share slice.
- **Footer row:** `mt-4 flex items-center justify-between gap-3` — left: expand button, right: `Open billing →` link (existing `text-sm font-semibold text-primary hover:text-blue-900`).
- **Tab strip container:** `mt-4 flex flex-wrap gap-1.5` — wraps naturally on narrow viewports.
- **Ledger full list:** `mt-3 divide-y divide-gray-100` — replaces the `<ol>` used by the preview rows; same `divide-y` pattern from Portal Share token audit list.
- **Review flag on row label:** swap `text-neutralDark` for `text-amber-800` when `entry.review === true`; prepend `⚠ ` inside the label `<p>`.
- **Void amount:** `text-gray-400 line-through` on the amount `<p>` when `entry.type === "void_invoice"`.
- **Balance pill:** `inline-flex items-center rounded px-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 ml-1`.
- **Section container:** keep existing `mt-5 rounded-md border border-gray-200 bg-gray-50 p-4`.
- **Expanded section max-height:** none for V1 — let it grow naturally inside the card. If customer cards become unwieldy, a future slice can add `max-h-[480px] overflow-y-auto` with a scrollable ledger region.

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | All data through `useCustomers`, `useJobs`, `useInvoices` — no change to hook architecture. | ✅ |
| **Business logic in `packages/domain`** | `buildCustomerLedger`, `getCustomerLedgerSummary` already exported from domain. Tab filtering is pure array derivation in the component — no new domain helpers needed. | ✅ |
| **No schema changes** | All entry fields (`type`, `date`, `amount_cents`, `balance_cents`, `review`, `job_id`, `invoice_id`) already present on `CustomerLedgerEntry`. | ✅ |
| **No new secrets / providers** | Zero provider calls. All navigation is `<Link href=…>`. | ✅ |
| **No raw token / internal field exposure** | Ledger rows surface only `label`, `detail`, `date`, `amount_cents`, `balance_cents`, `type`, `review` — same fields as today. | ✅ |
| **No customer-id authorization shortcut** | Portal and billing links follow existing handoff patterns (`/payments?invoice_id=…`, `/closeouts?job_id=…`). No shortcut auth. | ✅ |
| **No migrations, RLS changes, new routes** | Inline expansion only. No new page segment. | ✅ |

---

## Open questions for Codex

1. **Expanded state and card height.** Active customer lists with many entries could produce very tall cards. Should V1 cap the expanded ledger at a scrollable `max-h` (e.g. 480 px)? Or is unbounded height acceptable while the list is short? Recommend bounded scroll for >10 entries; the threshold can be a constant.
2. **"View closeout" destination.** `/closeouts?job_id=…` assumes `/closeouts` accepts a `job_id` search param to pre-select the right item. Confirm the `closeouts-client.tsx` URL param handling supports this (the billing work queue slice wired `?queue=…`; a parallel `?job_id=…` may need a small addition).
3. **"View job" destination.** `/jobs?job_id=…` — does `/jobs` accept and act on a `job_id` param? If not, the fallback `View job` action can be omitted for V1 and restored when the param is wired.
4. **Draft invoice amounts.** `draft_invoice` entries may have `amount_cents = null` if no line items exist yet. Confirm whether `—` (em-dash) is the right placeholder or whether draft entries should be suppressed from the ledger entirely until an amount is set.
5. **Tab "Open" definition.** Currently proposed as `sent_invoice | draft_invoice | partial_payment`. Should `draft_invoice` be included in "Open"? Drafts haven't been sent to the customer yet, so they're more of a work-in-progress than an open receivable. Codex's call — excluding drafts from "Open" and showing them only in "Invoices" / "All" is a defensible alternative.
6. **`?filter=review` on `/payments`.** The `Review →` link appends `filter=review` to the payments URL as a hint. Confirm whether `payments-client.tsx` reads and applies this param, or whether the link should simply be `?customer_id=…` (the admin can filter manually).

---

## Follow-up ideas (out of scope, noted per the brief)

- **Scrollable ledger region.** Cap expanded height at ~480 px with `overflow-y-auto` once entry counts grow beyond ~10 per customer. Keeps card height predictable across the list.
- **"Portal ready" badge.** Small inline chip on the customer card header — `Portal: active` / `Portal: none` — derived from the existing portal token query. No schema change. Complements the ledger by surfacing portal status at the card-header level without scrolling.
- **Deep-link selection.** Persist `?customer_id=…` in the URL so direct links land with the right card expanded. Pairs naturally with the `?job_id=…` deep-link from the billing work queue. No schema change.
- **Inline "Create invoice" shortcut.** For `completed_service` entries that have no linked `invoice_id`, surface a secondary `Create invoice →` action in the row (linking to the existing invoice creation handoff). Currently `getInvoiceHandoffHref(job_id)` in `packages/domain` already produces this URL. Deferred to keep V1 rows simple.
- **Entry grouping by month.** Once a customer has >12 entries, group rows by `MMM YYYY` with a sticky group header. Pure UI change; no domain work needed.
- **`decisions.md`.** Log the inline-expansion vs. side-panel vs. route decision once Codex confirms the direction. Useful relay context for future slices.
