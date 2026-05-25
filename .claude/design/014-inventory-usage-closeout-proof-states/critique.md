# Critique: Inventory Usage + Closeout Proof States V1

Reviewed against: `inventory-client.tsx`, `closeouts-client.tsx`, and the
014 proposal. This slice built directly on the 013 refinement and targeted
two operator scan-time questions: "What has this chemical been used on
recently?" and "What exactly unblocks this closeout job?"

---

## What's correct against the proposal and codex-review

**Inventory — per-chemical usage affordance**

All three levels of the usage affordance landed:

- **Usage count line** on every chemical card is derived from
  `logsByChemical.get(item.id) ?? []` (a pre-grouped map, not a per-render
  filter call), which avoids the redundant filtering the proposal's
  `logsQuery.data.filter(...)` implied. The rendering correctly gates on
  `canShowChemicalUsage = !logsQuery.isLoading && !logsQuery.error`, so the
  "No uses logged yet" line and the count are both suppressed while logs are
  loading or errored. The codex-review Adapt direction on loading safety is
  exactly honored.

- **Expand strip ("View uses")** renders only when `canShowChemicalUsage &&
  chemicalLogs.length > 0`, showing the button only when there is confirmed
  log data to expand. The collapsed state is tracked in `expandedChemicalId`
  on `InventoryClient` — one item open at a time — rather than inline
  `useState` per card, which is the correct Adapt from the codex-review.

- **Reorder watchlist recency line** correctly uses the pre-grouped
  `logsByChemical.get(item.id)?.[0]` to pull the most recent log, then
  conditionally renders `"Last used [date] - [customer]"` or `"No uses logged
  - inspect for aging stock"` in `text-theme-text-muted`. The dash separator
  (`" - "`) is a minor style deviation from the proposal's dot-separator
  (`" · "`). Both are readable; worth aligning to the dot convention if the
  watchlist and expand strip are polished together.

**Closeouts — proof-state clarity**

All four structural additions from the proposal are present:

- **Missing-capture micro-line** on `needsCaptures` queue rows uses the local
  `formatMissingCaptureMicroLine` helper. The helper matches the proposal's
  cap: 1–3 items shown inline, 4+ items truncated to `"first two · + N more"`.
  When `item.state !== "needsCaptures"`, the line is omitted or falls back to
  `item.job.service_notes`. Correct.

- **Two-zone ProofHandoffCard** — Zone A (completion header + unblock copy)
  and Zone B (grouped evidence pills) — matches the proposal structure. The
  `Eyebrow tone="muted"` group headers `"Location evidence"` and `"Billing
  captures"` organize the six pills into two named clusters. `dot={false}` on
  each pill keeps the strip compact.

- **Unblock copy** in Zone A covers all states the codex-review called out:
  Ready + no invoice, Ready + draft, Ready + sent, Ready + paid, Ready +
  voided, Missing evidence, and the fallback warning. The draft state copy
  uses `"Review invoice draft before sharing."` which sidesteps the
  `finalize`/`finalise` usage issue the codex-review flagged — a pragmatic
  win.

- **Context cue line** in `NextActionCard` uses the `contextCueByStatus` map
  across `draft`, `sent`, `paid`, and `void`. The billing-ready (no invoice)
  state uses `"Invoice will include GPS + form evidence."` and the
  needs-captures state uses `"Billing handoff is blocked until captures sync."`.
  Both match the proposal table exactly.

**`reviewItemCount` for Zone A unblock copy**

The count of non-success pills that feeds `"{N} items need review before
billing handoff"` filters on `pill.tone !== "success" &&
pill.countsAsMissingEvidence !== false`. The `countsAsMissingEvidence: false`
guard on the invoice pill when there is no invoice correctly excludes the
`"No invoice yet"` neutral pill from the count — the codex-review specifically
flagged this edge case, and the implementation handles it.

---

## Issues to note before the next inventory or closeouts slice

### 1. `text-neutralDark` in the expand strip log customer name

The `"Recent uses"` inline strip renders each log row as:

```tsx
<p className="font-medium text-neutralDark">
  {log.job?.customer?.name ?? "Unknown customer"}
</p>
```

The 013 critique and codex-critique-review resolved the `text-neutralDark`
instance in `labelClassName`, but this usage in the expand strip — added in
014 — reintroduces the legacy primitive. The semantic equivalent is
`text-theme-text-primary`. Small fix, same impact as the label fix.

### 2. Watchlist recency line uses dash separator, proposal and strip use dots

The reorder watchlist recency line formats as:
`"Last used May 19 - Rivera Cafe"` (em-dash rendered by ` - `).

The proposal used `" · "` (middle dot). The expand strip uses ` - ` as well
(the date and customer are separate `<p>` elements on separate lines, so the
separator isn't visible). Neither is wrong, but when both surfaces appear on
the same page, the inconsistency is noticeable. If the watchlist and strip are
ever unified into a shared sub-component, adopt the `" · "` dot convention to
match the missing-capture micro-line pattern.

### 3. Expand strip log row layout puts amount and date on the same line with no label

The strip row renders:

```
Rivera Cafe
2.5 oz - May 19
```

The proposal sketched:

```
Rivera Cafe · 2.5 oz · May 19
```

The current two-line layout is readable, but the amount and date share a
`<p>` without a semantic separator. The `text-sm text-theme-text-secondary`
styling is correct. This is a minor visual note — not a blocker, but worth
revisiting if the strip gets a label header or if a third data point (e.g.,
technician name) is added.

### 4. `QueueRowBase` still uses `border-primary` / `hover:border-primary`

These two legacy token references carried over from 013 into the current
slice. The proposed `hover:border-theme-action-primary` and
`border-theme-action-primary` equivalents exist in the token system. This
was not in scope for 014, but it is the last legacy token cluster on the
closeouts screen and worth catching in the next closeouts pass.

### 5. `text-secondary` on the job status label in the detail rail (line 1043)

```tsx
<p className="text-sm font-semibold uppercase tracking-wide text-secondary">
  {selectedJob.status}
```

`text-secondary` is an older semantic alias rather than the current
`text-theme-text-secondary`. One-character addition to migrate. Same
pattern as the 013 token cleanup.

---

## Codex-review Adopt/Adapt/Defer/Reject assessment

**Adopt decisions — all honored**

Usage count line, expand strip, watchlist recency copy, missing-capture
micro-line, Zone A/B ProofHandoffCard structure, context cue lines in
`NextActionCard` — all present and correct per spec.

**Adapt decisions — all honored**

Shared `expandedChemicalId` state in `InventoryClient` (not per-card
useState). `canShowChemicalUsage` guard on all usage affordances. Missing-
capture micro-line handles 0/1/2/3/4+ gracefully.  `reviewItemCount`
excludes the neutral invoice pill when no invoice exists.

**Defer decisions — all honored**

No `/inventory/[chemical-id]` routing. No typed domain state for
`proofCompletionTone`. No bulk missing-capture requests. No compliance
cross-reference on chemical cards. No provider or migration work.

**Reject decisions — all honored**

No direct Supabase from UI. No schema changes. No layout rewrites.

---

## Pre-next-slice checklist

Before the next inventory or closeouts pass:

1. Replace `text-neutralDark` in the expand strip log customer name
   (`inventory-client.tsx`) with `text-theme-text-primary`.
2. Replace `border-primary` / `hover:border-primary` in `QueueRowBase`
   with `border-theme-action-primary` / `hover:border-theme-action-primary`.
3. Replace `text-secondary` at the job status label line in `CloseoutsClient`
   with `text-theme-text-secondary`.
4. Optionally align the watchlist recency separator to `" · "` when the
   watchlist and expand strip are touched together.
