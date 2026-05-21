# Proposal: Inventory Usage + Closeout Proof States V1

## Goal and non-goals

**Goal:** Help office operators answer two scan-time questions without adding
new data fetches, layout overhauls, or infrastructure: "What has this chemical
been used on recently?" and "What exactly unblocks this closeout job?"

**Non-goals:** New API routes, schema changes, pagination, new domain helpers
(those are Codex-owned planning items), or any departure from the dense
operations-first density the 013 refinement established. This proposal is
design-direction and copy only.

---

## Inventory: per-chemical usage affordance

### Current situation

`logsQuery.data` is already fetched and available in `InventoryClient`. It is
shown as a global recent-usage list (last 5 across all chemicals) at the
bottom of the right rail. Chemical cards show name, stock, reorder level, and
EPA number — but there is no path from a specific chemical to its own usage
history.

The operator question is: *"This chemical is at reorder level — has it actually
been used recently, or has the stock just aged out?"*

### Proposed addition: usage count line + inline expand strip

**Level 1 — usage count on the card (always visible)**

Add a compact secondary line below the EPA number on each chemical card:

```
EPA 432-1432
4 uses logged  ← new line
```

This is derived client-side from `logsQuery.data.filter(log =>
log.chemical_id === item.id).length`. No new fetch. When `length === 0`, show
`"No uses logged yet"` in `text-theme-text-muted`. When `length > 0`, show
`"{N} use{s} logged"` in `text-theme-text-secondary`.

This answers the reorder question at a glance without any interaction.

**Level 2 — inline expand strip (on demand)**

Add a `"View uses"` text button after the Edit/Archive buttons, shown only
when `logsCount > 0`. On click, a compact strip expands inline below the card
content showing the last 3 log entries for that chemical:

```
┌──────────────────────────────────────────────┐
│  Recent uses                                  │
│  Rivera Cafe · 2.5 oz · May 19              │
│  Nguyen Residence · 4 oz · May 15           │
│  Park Apartments · 1.5 oz · May 10          │
│  [Collapse]                                   │
└──────────────────────────────────────────────┘
```

Each row: customer name (`text-sm font-medium text-neutralDark`), amount +
unit (`text-sm text-theme-text-secondary`), date (`text-xs text-theme-text-muted`).

Collapsed by default. Toggle state is local to the card (`useState` per item,
no shared state). The `[Collapse]` affordance is the same `"View uses"` button
relabeled — no separate control needed.

**Copy conventions**

| State | Usage count line | Strip empty state |
|---|---|---|
| No logs for this chemical | `"No uses logged yet"` | — |
| 1 log | `"1 use logged"` | — |
| N logs | `"{N} uses logged"` | — |
| Strip open, no logs (filtered) | — | `"No uses found for this chemical."` |

**"What to inspect next" guidance**

The brief asks for inspection guidance. The right place for this is not a
generic label but the reorder watchlist card at the top of the page, which
already surfaces chemicals at or below reorder level. Add a secondary line to
each watchlist card:

```
┌──────────────────────────────────────────┐
│  Demand CS        [Reorder]               │
│  3 oz on hand / reorder at 8             │
│  Last used May 19 · Rivera Cafe          │  ← new
└──────────────────────────────────────────┘
```

"Last used [date] · [customer]" — derived from the most recent log for that
chemical in `logsQuery.data`. When no log exists: `"No uses logged — inspect
for aging stock"` in `text-theme-text-muted`. This tells the operator whether
a reorder alert is from active use (likely legitimate reorder) or from aged
stock that was never logged (possible data gap to resolve first).

---

## Inventory: state coverage

| State | Treatment |
|---|---|
| Loading | Existing loading card; usage count line renders as `"—"` until logs load |
| No logs for chemical | `"No uses logged yet"` — muted, no expand button |
| Has logs | Count line + `"View uses"` button |
| Strip expanded | Last 3 logs inline; `[Collapse]` button |
| Filtered (search active) | Count reflects all-time logs, not filtered view |
| Reorder watchlist, no log | `"No uses logged — inspect for aging stock"` |
| Reorder watchlist, has log | `"Last used [date] · [customer]"` |
| Error (logsQuery.error) | Usage count line omitted; no expand button shown |

---

## Closeouts: proof-state clarity

### Current situation

`ProofHandoffCard` renders six `StatusPill dot={false}` items in a flat
`flex-wrap gap-2` strip: arrival GPS, departure GPS, GPS label, billing label,
invoice label, sync confidence. When multiple items are in warning or danger
tone, the operator has to read each pill individually to find what's blocking
the closeout. The queue rows show a pill and a `getBillingQueueItemSummary`
line — but the summary line can be verbose and wraps under `line-clamp-2`.

The operator question is: *"Of the six things that need to be true, which ones
aren't, and what do I do about it?"*

### 1. Queue row: add a compact blocking-step line

When `item.state === "needsCaptures"`, replace the truncated
`getBillingQueueItemSummary` summary with a compact blocking-step micro-line:

```
Rivera Cafe                          [Needs GPS, form]
412 Oak Street, San Diego
May 19, 2:30 PM
Missing: GPS · photo                 ← new
```

Format: `"Missing: {item1} · {item2} · …"` — dot-separated, `text-xs
text-theme-text-muted`. Max three items displayed; if more than three are
missing, show the first two + `"+ {N} more"`.

When `item.state === "ready"`, omit the blocking line entirely — the success
pill is sufficient signal.

When `item.invoice` is present (invoiced items), keep the existing
`service_notes` summary — invoice state is the operator's primary signal, not
missing captures.

**Design-only note:** The specific capture names in the missing list come from
`formatMissingCaptureList(item.readiness.missing)`. This proposal recommends
presenting them in the dot-separated micro-line format rather than the inline
pill text on the queue row. The underlying data source is unchanged.

### 2. Proof handoff card: two-zone structure

Restructure `ProofHandoffCard` into two clearly separated zones:

**Zone A — completion header (always visible)**

```
Proof handoff readiness         [Ready]
All proof captured. Create invoice to close out.
```

or when blocked:

```
Proof handoff readiness         [Missing evidence]
2 items need review before billing handoff.
```

The completion `StatusPill` stays top-right. Add one unblock line beneath the
`proof_label` — a single sentence that tells the operator what to do, not just
what state they're in. Copy table:

| Completion label | Unblock line | Tone |
|---|---|---|
| `"Ready"` | `"All proof captured. Create invoice to close out."` | success |
| `"Missing evidence"` | `"{N} item{s} need{s} review before billing handoff."` | danger |
| Anything else | `"Review evidence before billing handoff."` | warning |

The N in `"{N} items need review"` is the count of non-success pills in zone B.
This is derivable from the existing pill data — design-only, Codex-owned count.

**Zone B — evidence detail (grouped)**

Keep all six status pills but arrange them in two named groups instead of a
flat wrap:

```
Location evidence
  [Arrival GPS captured]  [Departure GPS captured]  [GPS partial]

Billing captures
  [Billing captures ready]  [Invoice sent]  [High sync confidence]
```

Group headers: `Eyebrow tone="muted"` — `"Location evidence"` and `"Billing
captures"`. Group wrapper: `flex-wrap gap-2` within each group. The two groups
are separated by `mt-3`.

This grouping reduces the visual parse cost from "6 flat items" to "2 groups
of 3." The operator sees immediately whether the location evidence cluster or
the billing captures cluster is the problem — not which of 6 pills to read.

**Zone C — GPS items list (keep as-is)**

The `handoff.gps_items` `<ul>` and `missing_capture_guidance` paragraph
beneath the pills stay. No change.

**Zone D — portal handoff label (keep as-is)**

`handoff.portal_handoff_label` and `handoff.portal_handoff_summary` at the
bottom stay.

### 3. `NextActionCard`: add a one-line context cue

`NextActionCard` correctly surfaces the primary action (create invoice, review
line items, open payment link). Add a single `text-xs text-theme-text-muted`
context line beneath the body copy that anchors the operator to the overall
proof state:

```
Ready to bill
All proof captured.                   ← body (existing)
Invoice will include GPS + form evidence.  ← new context cue
```

or for missing captures:

```
Needs captures
GPS and form evidence are missing.    ← body (existing)
Billing handoff is blocked until captures sync.  ← new context cue
```

Context cue copy by state:

| State | Context cue |
|---|---|
| Billing ready, no invoice | `"Invoice will include GPS + form evidence."` |
| Needs captures | `"Billing handoff is blocked until captures sync."` |
| Invoice draft | `"Review and finalise line items before sharing with the customer."` |
| Invoice sent | `"Awaiting customer payment. No action needed until paid or overdue."` |
| Invoice paid | `"Job is closed. Archive or move to the next stop."` |
| Invoice voided | `"Reissue a new invoice if this job needs to be rebilled."` |

**Design-only:** the copy maps to the existing invoice status values (`draft`,
`sent`, `paid`, `void`) and the `billingReady` flag — no new domain values
needed.

---

## Closeouts: full state coverage

| State | Queue row treatment | Detail rail treatment |
|---|---|---|
| Ready | Success pill, no blocking line | Zone A success copy, all pills green |
| Missing GPS only | Warning pill, `"Missing: GPS"` micro-line | Zone A danger/warning, location evidence cluster highlighted |
| Missing form + GPS | Warning pill, `"Missing: GPS · form"` micro-line | Zone A danger, both clusters may show warnings |
| Partial GPS | Warning pill, `"Missing: GPS evidence"` | Zone A warning, GPS pill is `warning` tone |
| No GPS | Warning pill, `"Missing: arrival GPS · departure GPS"` | Zone A danger, both arrival/departure pills `warning` |
| Proof ready, no invoice | Success pill | Zone A success, `NextActionCard` billing-ready state |
| Invoice draft | Info pill (`Draft`) | Zone A success → invoice zone, `NextActionCard` draft state |
| Invoice sent | Info pill (`Sent`) | `NextActionCard` sent state with payment link |
| Invoice paid | Success pill (`Paid`) | `NextActionCard` paid state |
| Invoice voided | Neutral pill (`Voided`) | `NextActionCard` voided state |
| Blocked / no data | Existing `EmptyState` component | Existing loading/error `EmptyState` |

---

## `proofCompletionTone` — design guidance only

The 013 critique flagged that `proofCompletionTone` derives tone from
user-facing label strings. This proposal does not ask Codex to fix that now.
The two-zone proof handoff structure proposed here is resilient to future label
changes: Zone A uses the raw `completionLabel` string for the pill text, and
the unblock copy is derived from a count of non-success pills (a UI-local
computation). Neither requires the domain layer to export a typed state.

When Codex does add a typed completion state to the domain package, the unblock
copy table above maps directly to the typed values.

---

## AGENTS conformance self-check

| Concern | Status |
|---|---|
| No Supabase from UI | ✅ — all data already fetched via existing hooks |
| No schema changes | ✅ — no new DB fields |
| No new domain logic | ✅ — usage count and inline strip filter `logsQuery.data` client-side; all closeout data already available |
| No migrations | ✅ |
| No provider setup | ✅ |
| No production mutations | ✅ — UI-only guidance |
| Scan-first density preserved | ✅ — no marketing-style cards; expand strip is opt-in |

---

## Adopt/adapt/defer guidance for Codex

### Adopt

- Usage count line on each chemical card (`"{N} uses logged"` / `"No uses
  logged yet"`), derived from existing `logsQuery.data` filtered by
  `chemical_id`. Pure presentational addition, no new fetch.
- `"View uses"` expand strip per card showing last 3 logs for that chemical.
  Local toggle state per card.
- `"Last used [date] · [customer]"` secondary line on reorder watchlist cards.
- Compact `"Missing: {item} · {item}"` blocking-step micro-line on
  `needsCaptures` queue rows.
- Two-zone structure for `ProofHandoffCard`: completion header (Zone A) +
  grouped evidence pills (Zone B).
- Group headers `"Location evidence"` / `"Billing captures"` above the pill
  clusters.
- One-line unblock copy in Zone A.
- Context cue line in `NextActionCard` per state.

### Adapt

- The N in `"{N} items need review"` in Zone A should be computed from the
  count of pills in Zone B that are not `success` tone. Codex should derive
  this from the existing proof review data — Claude is not prescribing which
  domain value to count from.
- The `"View uses"` expand strip should render only when `logsQuery.data` has
  finished loading and `logsQuery.error` is null. If logs are still loading,
  omit the count line and the button — do not show a `0 uses` count that would
  flip to the real value after load.
- The blocking-step micro-line on queue rows should gracefully handle the
  `formatMissingCaptureList` output for 0 or 1 missing items (no dot separator
  needed for a single item).

### Defer

- Pagination or "View all uses" routing to a dedicated chemical history page.
  The inline last-3 strip is sufficient for V1.
- Any typed domain state for `proofCompletionTone`. Design guidance above is
  resilient to the current string-match approach.
- Reorder watchlist "last used" line requires the logs to be filtered by
  chemical in the watchlist render path — if this adds complexity to the
  watchlist section's data derivation, defer it and keep the watchlist cards
  as-is for now. The chemical card usage count is the higher-priority addition.

---

## Follow-up ideas (out of scope)

- Dedicated `/inventory/[chemical-id]` usage history route with full log
  pagination and usage trend over time. Natural follow-on to the inline strip.
- Bulk "Request missing captures" action from the queue list for multiple
  `needsCaptures` jobs at once.
- Compliance field cross-reference on the chemical card — highlight which
  active chemicals have incomplete EPA numbers that would block DPR/SDS
  compliance check-in.
