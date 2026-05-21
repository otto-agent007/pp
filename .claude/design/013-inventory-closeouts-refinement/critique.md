# Critique: Inventory + Closeouts Refinement V1

Reviewed against: `inventory-client.tsx`, `closeouts-client.tsx`, PR #44
(implementation) and PR #45 (status searchability QA).

This critique covers both screens together since they share structural patterns
and the proposal addressed them as a pair.

---

## What's correct against the proposal and codex-review

**Inventory — hierarchy**

All seven proposal layers landed in order: header + filters, four stat tiles,
EPA/DPR compliance strip, low-stock watchlist, inventory list, right-rail form
panel, recent usage log. The proposal's "low-stock review carousel" became a
responsive grid of danger-toned cards — a better call for an admin surface
where all items should be visible simultaneously without carousel interaction.

**Closeouts — hierarchy**

All six proposal layers landed: header + filters, count tiles, compliance strip,
queue sections, queue rows with tone-coded pills, sticky detail rail. The rail
sits at 420px (`lg:grid-cols-[minmax(0,1fr)_420px]`) rather than the proposal's
360px — slightly wider, which the denser `ProofHandoffCard` content justifies.
The sticky overflow behavior (`lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]
lg:overflow-y-auto`) matches the proposal intent precisely.

**Shared primitives**

`Card`, `Eyebrow`, `StatusPill`, `StatTile`, `Button`, `buttonClassName` are
all pulled from `@pest-patrol/ui` — no inline reimplementations of shared
atoms, consistent with the codex-review Adopt.

**State coverage**

Loading, empty, error, low-stock, missing-capture, proof-ready, invoiced, and
compliance-review states are all present. The "blocked" state (no completed
jobs, cleared search) is handled by a descriptive `EmptyState` with operator
guidance copy. Full coverage against the proposal matrix.

**Copy quality**

Action labels are on-brief: "Save chemical", "Archive", "Log chemical use",
"Open compliance", "Open invoice", "Open payment link". Empty states name the
next action rather than describing the UI — "No completed jobs yet. As
technicians finish jobs in dispatch, they will appear here." Compliance copy
stays advisory throughout.

**Compliance strip dynamic tone (Closeouts)**

The compliance strip switches between warning and success tones based on whether
branch 3 fields are missing. The proposal showed a static warning strip. The
dynamic treatment is strictly better — an operator who has resolved all missing
fields gets a success state, not a permanent amber block. This was a Codex
improvement over the design direction.

**URL-synced queue filter**

`window.history.pushState` keeps the active queue filter in the URL on
navigation. The proposal didn't specify this. It's a real usability addition:
operators can bookmark a "Missing captures" view or share a deep link to a
specific filter bucket.

**`SearchableSelect` in inventory log form**

Job and chemical dropdowns in the log form use `SearchableSelect` (added to
`@pest-patrol/ui` in PR #45). A plain `<select>` would collapse under real job
volume. This is the right component choice and keeps the interaction within the
design-system boundary.

---

## Adapt decisions — all sound, one follow-up flagged

**Inventory right rail as always-on form, not selected-product detail**

The proposal imagined a selected-product detail panel that appears when an item
is clicked, showing product facts, reorder status, and actions. What was built
is always-on add/edit and log-usage forms on the right rail. This is a
reasonable Codex Adapt — it avoids a selection-state toggle on the item list and
keeps the form permanently accessible, which suits an admin who frequently
creates or edits chemicals.

The trade-off is that the rail is always 420px at xl breakpoints even when the
operator is only scanning stock levels. On a 1280px desktop this is workable but
leaves the list at roughly 860px of usable space with the form always open. Not
a blocker for V1, but worth revisiting if operators report that the persistent
form rail crowds the inventory list during scanning workflows.

---

## Issues to note before the next inventory slice

### 1. `CountTile` lives inline — graduation candidate

`CloseoutsClient` defines its own `CountTile` component (lines 164–190). It
serves the same visual role as `StatTile` but adds `aria-pressed` and `onClick`
for filter behavior. This was the right call: `StatTile` is non-interactive, and
adding filter behavior to it would have changed its contract for all callers.

`CountTile` is clean and self-contained, but if a second screen needs
interactive count tiles (the dispatch queue view is a likely candidate), it
should graduate to `@pest-patrol/ui` rather than being duplicated. Flag this
for the next time the dispatch or automation screens get a similar filter strip.

### 2. `proofCompletionTone` couples tone to label string literals

```tsx
function proofCompletionTone(label: string): StatusPillTone {
  if (label === "Ready") return "success";
  if (label === "Missing evidence") return "danger";
  return "warning";
}
```

`completion_label` is a string produced by the domain layer. If its wording
changes, the tone assignment silently degrades to "warning" without a type
error. The domain layer should export a typed union or enum for completion
states so the UI can derive tone from the type, not a string match.

This is a domain-layer concern, not purely a UI one. Appropriate for the next
pass that touches the closeout domain package.

### 3. `neutralDark` direct primitive class in inventory form labels

`labelClassName` in `inventory-client.tsx` uses `text-neutralDark` directly:

```tsx
const labelClassName = "flex flex-col gap-1 text-sm font-medium text-neutralDark";
```

The rest of both screens use `text-theme-text-primary`, `text-theme-text-secondary`,
and `text-neutralDark` somewhat interchangeably. `text-neutralDark` is a raw
primitive; `text-theme-text-primary` is the semantic equivalent and the right
choice for form labels. The primitive reference should be replaced when this
form is next touched — it is a small token-consistency issue, not a visual bug.

### 4. `other jobs` inline button duplicates most of `QueueRow`

The `otherJobs.map` block (render of non-completed jobs when `status === "all"`)
renders an inline `<button>` that is structurally identical to `QueueRow` minus
the status pill. This is a second layout-level pattern for the same UI element.
If the row ever gets a structural update (hover state, focus ring, padding
change), both places would need to change. Worth wrapping the `otherJobs` path
through `QueueRow` with a `pill` prop that can be null, or at minimum extracting
the shared button chrome into a `QueueRowBase` wrapper.

### 5. Recent usage log shows cross-chemical activity with no per-item scoping

The inventory "Recent usage" section shows `logsQuery.data.slice(0, 5)` — the
five most recent chemical logs across the entire catalog. When an operator is
editing a specific chemical, they see unrelated recent logs. There is also no
"View all" progressive disclosure path.

This is consistent with the proposal intent (the proposal listed "recent usage
log" as an overview, not a selected-item detail). But operators who need to
review a specific chemical's consumption history have no path to it from this
screen. A "View logs" link per inventory card that filters the log section by
chemical (or routes to a future dedicated log view) would close this gap. Defer
to a future inventory iteration — V1 is correct per the proposal.

---

## Codex-review Adopt/Adapt/Defer/Reject assessment

**Adopt decisions — all honored**

Patrol OS admin baseline preserved. Shared primitives used throughout. Both
screens stay focused on their respective domains. Before screenshots preserved;
Codex added after screenshots (`*-after.png`) to the references folder — this
was not in the codex-review but is a useful addition.

**Adapt decisions — all honored**

Presentation-only pass confirmed: no new table framework, map, or chart
dependency. `SearchableSelect` is a backwards-compatible addition to
`@pest-patrol/ui`. Detail rail and usage trend implemented as direction, not
blocking behavior. Compliance copy remains advisory (`chunks: []` is hardcoded
in both screens).

**Defer decisions — all honored**

GPS map tiles absent. Bar-chart usage trends absent. No schema, provider, or
production work.

**Reject decisions — all honored**

No direct database calls. Domain logic stays in `@pest-patrol/domain` and hook
boundaries. No architecture changes.

---

## Pre-next-slice checklist

Before the next inventory or closeouts iteration:

1. If a second screen introduces interactive count tiles, graduate `CountTile`
   to `@pest-patrol/ui`.
2. Replace `proofCompletionTone`'s string-match pattern with a domain-exported
   type union or enum when the closeout domain package is next touched.
3. Replace `text-neutralDark` in `labelClassName` with `text-theme-text-primary`
   when the inventory form is next touched.
4. Consolidate the `otherJobs` inline button into `QueueRow` or extract shared
   chrome to a `QueueRowBase` wrapper.
5. Consider a per-chemical log scoping path for a future inventory detail slice.
