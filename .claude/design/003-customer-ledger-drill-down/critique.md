# Critique: Customer Ledger Drill-Down V1 (post-implementation)

Reviewed: `5ec8d66`, `3cb9857`. Implementation lives in `apps/web/app/customers/customers-client.tsx` (CustomerLedgerSummary, CustomerLedgerEntryRow, and the five helper functions above them).

## What's correct against the proposal

- Inline expand/collapse via `useState(false)` — no new route, exactly as proposed
- Five-tab filter strip (`All`, `Services`, `Invoices`, `Open`, `Review`) with live per-tab counts derived from `filterLedgerEntries` — matches proposal exactly
- Draft invoices correctly excluded from the Open filter (`isOpenLedgerEntry` covers `sent_invoice | partial_payment | needs_review_payment` — honors Codex's Adapt note)
- Scroll cap: `max-h-[480px] overflow-y-auto` applied only when expanded and `entries.length > 10` — honors Codex's Adapt note
- Dot colors match the proposal's type table exactly: emerald for completed/paid, amber for partial/review, gray for draft/void, blue for everything else
- Action labels (`View job`, `View closeout`, `View receipt`, `Review payment`, `View invoice`, `Open invoice`) and hrefs all match the proposal's action table
- Tab resets to "all" on collapse — correct UX
- Review alert upgraded from a plain `<p>` to a two-element row with the `Review` link; copy pluralisation is correct
- Empty state for zero entries keeps existing copy; filtered empty state renders "No {tab} entries for this customer." in the right position and style
- `showExpandButton` correctly absent when `entries.length ≤ 4`
- `Open billing` link preserved at both header and footer positions — matches the proposal's wireframe
- AGENTS conformance clean: no Supabase from UI, no schema changes, no token or provider payload exposure, all data through existing React Query hooks
- Tests cover: expand/collapse, tab filter (Services), review alert + invoice actions, empty-filter state, and provider metadata non-exposure

## Visual / copy issues

1. **`customers-client.tsx:394` — `"Warning: "` renders as visible English text on review rows.**
   Current:
   ```tsx
   {entry.review ? "Warning: " : ""}
   {entry.label}
   ```
   This produces "Warning: Payment needs review" in the DOM — verbose and not the right pattern. The proposal called for a `⚠ ` unicode prefix (visually compact, screen-reader-meaningful). The amber label color and dot already carry the visual signal; the text prefix doubles it awkwardly. Replace with:
   ```tsx
   {entry.review ? "⚠ " : ""}
   {entry.label}
   ```
   Or drop the prefix entirely and rely on the amber class + dot (both already `aria-hidden="true"` on the dot means a screen reader will read the label alone — `⚠ ` gives it an audible signal too, so keep it).

2. **`customers-client.tsx:412` — balance pill appears on paid invoices where `balance_cents === 0`.**
   `buildCustomerLedger` sets `balance_cents` on all invoice entries, including `paid_invoice` (where `reconciliation.balanceCents` is 0). The guard `entry.balance_cents !== null` renders "Balance $0.00" on every fully-paid row. Change to:
   ```tsx
   {entry.balance_cents !== null && entry.balance_cents > 0 ? (
     <p className="inline-flex items-center rounded bg-amber-50 px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
       Balance {formatMoney(entry.balance_cents)}
     </p>
   ) : null}
   ```

3. **Copy: "Hide activity" is missing the `↑` directional cue from the proposal.**
   Current: `"Hide activity"`. Proposal: `"Hide activity ↑"`. The arrow helps office users understand the action collapses upward. One-character fix:
   ```tsx
   {expanded ? "Hide activity ↑" : "Show all activity"}
   ```

4. **Copy: "Review" link on the amber alert is missing the `→` arrow from the proposal.**
   Current: `Review`. Proposal: `Review →`. Consistent with the `Open billing →` link style. Change the link text to `Review →`.

## Interaction / state issues

5. **`customers-client.tsx:148-153` — `needs_review_payment` silently included in the Open filter.**
   The proposal's Open definition was `sent_invoice | draft_invoice | partial_payment` (then Codex adapted to exclude drafts). The implementation also includes `needs_review_payment` in `isOpenLedgerEntry`. This means a needs-review entry appears in both the **Open** tab and the **Review** tab. Defensible — it is an open receivable — but it wasn't in the proposal and wasn't called out in the Adapt notes. Two options:
   - **Keep it** (recommended): `needs_review_payment` entries have an open balance and belong in "Open." Add a comment in `isOpenLedgerEntry` noting the intentional inclusion.
   - **Remove it**: keeps "Open" as a clean receivables filter; the entry stays visible under "Review" and "All."
   Either is fine; the current behavior just needs to be a conscious decision, not a silent drift.

## Scope drift

6. **`customers-client.tsx:375-380` — draft invoice amounts fall back to `"-"` rather than nothing.**
   ```tsx
   const amountText =
     entry.amount_cents !== null
       ? formatMoney(entry.amount_cents)
       : entry.invoice_id
         ? "-"
         : null;
   ```
   A draft with no line items has `amount_cents === null`. The fallback `"-"` (em-dash) was not in the proposal — the proposal said "show `—` or suppress." The `"-"` (a regular hyphen, not an em-dash) is less visually intentional. Use `"—"` (em-dash, `—`) or `null` to suppress entirely. Minor but inconsistent with the proposal's copy guidance.

7. **`customers-client.tsx:227` — `showExpandButton` uses `recentEntries.length` instead of the constant `4`.**
   ```tsx
   const showExpandButton = entries.length > recentEntries.length;
   ```
   `recentEntries` is always `entries.slice(0, 4)`, so `.length` is always `Math.min(entries.length, 4)`. The expression is equivalent to `entries.length > 4` but obscures intent. Not a bug, just a code clarity note — a future reader has to trace `recentEntries` to understand the threshold. Prefer `entries.length > 4` or extract `const PREVIEW_COUNT = 4`.

## Out of scope (parked, OK)

- **Deep-link expansion state** (`?customer_id=…`) — deferred per Codex review; correct call for V1
- **Portal-ready chip in card header** — deferred; correct
- **Inline "Create invoice" on completed service rows** — deferred; correct
- **Month grouping for long ledgers** — deferred; correct
- **`decisions.md` for the inline-vs-route choice** — not added; worth a follow-up if the ledger grows

## Verification needed after fixes

- **Issue 2 (balance pill):** confirm `paid_invoice` rows show no balance pill after the `> 0` guard; confirm `partial_payment` rows still show the pill correctly
- **Issue 5 (`needs_review_payment` in Open):** manually verify in dev that a needs-review invoice appears under both "Open" and "Review" tabs as expected, and that the counts add up intuitively
- **Issue 1 (warning prefix):** confirm screen reader announces `⚠ Payment needs review` rather than the label alone after the change

## Suggested ordering

**Issues 1 + 2** are one-line fixes with clear visual wins — do these first. **Issue 3 + 4** are copy-only changes, five seconds each. **Issue 5** is a judgment call worth a quick note in `isOpenLedgerEntry` regardless of which direction is chosen. **Issues 6 + 7** are polish — defer if velocity matters more.
