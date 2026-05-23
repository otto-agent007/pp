# Proposal: Portal Customer Experience Polish V1

## Goal and non-goals

**Goal:** Bring `apps/web/app/portal/[customerId]/portal-client.tsx` up to the
same token-consistency and primitive-discipline standard established by slices
013–015. The operator-facing pages already consume `@pest-patrol/ui`
consistently; the portal lags behind in three areas: legacy color tokens,
hand-rolled counter tiles, and section-header inconsistency. This slice fixes
those gaps without touching data flow, auth, or any customer-visible copy.

**Non-goals:** Portal token validation, payment-provider changes, Supabase
writes, new routes, invoice line-item editing, or any change that alters what
data the customer sees. Customer-safe filtering of GPS coordinates, internal
notes, signed URLs, and provider metadata is already handled at the data layer
and is not touched here.

---

## Current situation

`CustomerPortalClient` has a strong structural skeleton — the "Portal summary"
`Eyebrow tone="accent"` + three `StatTile` primitives (Services, Invoices, Open
balance) already use the design system correctly. The rest of the file diverges
in three consistent ways.

**Legacy tokens that need migration**

| Location | Current | Target |
|---|---|---|
| `PortalMediaTile` — file name / label text | `text-neutralDark` | `text-theme-text-primary` |
| `PortalFormCard` — form title | `text-neutralDark` | `text-theme-text-primary` |
| `BillingCard` — invoice label, amount, line-item text | `text-neutralDark` | `text-theme-text-primary` |
| `CloseoutCard` — job title, address, date label | `text-neutralDark` | `text-theme-text-primary` |
| `BillingSection` — section header text | `text-secondary` | `text-theme-text-secondary` (or `<Eyebrow>`) |
| `PortalTimeline` — timestamp + event label | `text-secondary` | `text-theme-text-secondary` |
| `CloseoutCard` — status label | `text-secondary` | `text-theme-text-secondary` |
| Search input | `focus:border-primary` | `focus:border-theme-action-primary` |

**Hand-rolled capture counter grid**

`CloseoutCard` renders Forms, Photos, and Signatures counts as three side-by-side
`div` tiles styled with `bg-theme-background-subtle p-3`:

```tsx
<div className="bg-theme-background-subtle p-3 rounded text-center">
  <p className="text-2xl font-bold">{counts.forms}</p>
  <p className="text-xs text-secondary">Forms</p>
</div>
```

`StatTile` is already in scope (`@pest-patrol/ui`) and is used on the same
page. The hand-rolled pattern diverges unnecessarily and carries the legacy
`text-secondary` inside it.

**Section headers**

`BillingSection` and `PortalTimeline` introduce their section headings with a
plain uppercase `<p>` or raw `<h2>` instead of `<Eyebrow>`. The "Portal
summary" section already uses `Eyebrow tone="accent"` correctly. Other section
entries should follow the same convention so the page hierarchy is scannable at
a glance.

---

## Proposed changes

### 1. Token migration — all four legacy primitives

Replace every `text-neutralDark`, `text-secondary`, and `focus:border-primary`
instance in `portal-client.tsx` with their semantic equivalents:

- `text-neutralDark` → `text-theme-text-primary`
- `text-secondary` → `text-theme-text-secondary` (for metadata / supporting
  text) or `text-theme-text-muted` (for timestamps, labels already visually
  deemphasized)
- `focus:border-primary` → `focus:border-theme-action-primary`

No copy changes. No layout changes. One-for-one class substitution throughout.

### 2. Replace hand-rolled capture tiles with compact tokenized mini-metrics

The three `bg-theme-background-subtle` counter divs in `CloseoutCard` carry
the legacy `text-secondary` token and sit inside an existing card. Because
`StatTile` renders through `Card`, using it here would produce card-inside-card
chrome — avoid that. Instead, keep the three-column grid but replace each
hand-rolled div with a compact tokenized metric row using semantic tokens
directly:

```tsx
// Before (three hand-rolled divs, legacy text-secondary)
<div className="grid grid-cols-3 gap-2">
  <div className="bg-theme-background-subtle p-3 rounded text-center">
    <p className="text-2xl font-bold">{counts.forms}</p>
    <p className="text-xs text-secondary">Forms</p>
  </div>
  {/* … Photos, Signatures */}
</div>

// After (compact tokenized mini-metric, no Card nesting)
<div className="grid grid-cols-3 gap-2">
  <div className="bg-theme-background-subtle p-3 rounded text-center">
    <p className="text-2xl font-bold text-theme-text-primary">{counts.forms}</p>
    <p className="text-xs text-theme-text-secondary">Forms</p>
  </div>
  <div className="bg-theme-background-subtle p-3 rounded text-center">
    <p className="text-2xl font-bold text-theme-text-primary">{counts.photos}</p>
    <p className="text-xs text-theme-text-secondary">Photos</p>
  </div>
  <div className="bg-theme-background-subtle p-3 rounded text-center">
    <p className="text-2xl font-bold text-theme-text-primary">{counts.signatures}</p>
    <p className="text-xs text-theme-text-secondary">Signatures</p>
  </div>
</div>
```

The layout and `bg-theme-background-subtle` background are unchanged — only
the two legacy token classes (`text-secondary` on the label) migrate to
`text-theme-text-secondary`. The value `<p>` gains `text-theme-text-primary`
if it is currently unstyled or uses a legacy class.

**Copy conventions**

| Count | Value display |
|---|---|
| 0 | `0` — neutral, not suppressed |
| N | `{N}` |

When the capture data is not yet loaded, defer to the existing loading state
already handled by the parent — no additional loading treatment needed inside
the metric row.

### 3. Standardise section headers with `<Eyebrow>`

Replace plain `<p>` or `<h2>` section-header elements with `<Eyebrow>` in the
sections that currently lack it:

| Section | Current | Proposed |
|---|---|---|
| Billing | `<p className="... uppercase">Billing history</p>` | `<Eyebrow>Billing history</Eyebrow>` |
| Timeline | `<h2 className="... uppercase">Activity</h2>` | `<Eyebrow>Activity</Eyebrow>` |
| Closeout jobs | `<p className="... uppercase">Completed jobs</p>` | `<Eyebrow>Completed jobs</Eyebrow>` |

"Portal summary" already uses `tone="accent"` correctly — keep it. The three
new `<Eyebrow>` entries should use the default tone (no `tone` prop), consistent
with the section-header pattern used on `/inventory` and `/closeouts`.

### 4. Timeline scan hierarchy

`PortalTimeline` currently renders each event as:

```
[date string in text-secondary]
[event title in text-neutralDark, full weight]
[optional note in text-secondary, clipped at 2 lines]
```

The hierarchy is close but the date and note share the same legacy token.
After the token migration:

- Date string: `text-theme-text-muted text-xs`
- Event title: `text-theme-text-primary text-sm font-medium`
- Optional note: `text-theme-text-secondary text-sm`

This is a token-only change — no layout rearrangement needed.

---

## State coverage

| State | Treatment |
|---|---|
| Loading | Existing skeleton; StatTile renders value `0` or awaits parent load guard — no change |
| Empty portal (no jobs, no invoices) | Existing `EmptyState` component — no change |
| Access error | Existing error path — no change |
| Search active, no results | Existing empty-search state — no change |
| CloseoutCard, 0 captures | `StatTile value={0}` for each — neutral, not hidden |
| CloseoutCard, N captures | `StatTile value={N}` |
| Timeline, no events | Existing empty-timeline state — no change |
| Billing, no invoices | Existing empty-billing state — no change |

---

## AGENTS conformance self-check

| Concern | Status |
|---|---|
| No Supabase from UI | ✅ — no new data calls |
| No schema changes | ✅ |
| No migrations | ✅ |
| No provider setup | ✅ |
| No production mutations | ✅ — presentation-only |
| No portal auth changes | ✅ — token validation layer untouched |
| Customer-safe data filtering | ✅ — no change to what data is fetched or rendered |

---

## Adopt/adapt/defer guidance for Codex

### Adopt

- Replace `text-neutralDark` → `text-theme-text-primary` throughout
  `portal-client.tsx` (PortalMediaTile, PortalFormCard, BillingCard,
  CloseoutCard).
- Replace `text-secondary` → `text-theme-text-secondary` or
  `text-theme-text-muted` throughout (BillingSection header text, timeline
  timestamps and event labels, CloseoutCard status labels). Use
  `text-theme-text-muted` for timestamps; `text-theme-text-secondary` for
  supporting labels.
- Replace `focus:border-primary` → `focus:border-theme-action-primary` on the
  search input.
- Replace the three hand-rolled capture-count `div` tiles in `CloseoutCard`
  with `<StatTile value={...} label="..." />`.
- Replace plain `<p>`/`<h2>` section headers in Billing, Activity, and
  Completed jobs sections with `<Eyebrow>`.

### Adapt

- The capture counter grid inside `CloseoutCard` should NOT use `StatTile` —
  that would create card-inside-card chrome. Apply semantic tokens directly to
  the existing compact div layout as specified in section 2 above.
- If any section-header replacement with `<Eyebrow>` loses margin that the
  plain element carried via a utility class, Codex should add the equivalent
  `mt-*` / `mb-*` wrapper to preserve spacing — do not add inline `style` props.
- If invoice status already uses `StatusPill` in the live worktree, do not
  remove it. The follow-up note in this proposal is additive, not corrective.
- Keep all portal data access through the existing hooks and domain helpers.
  This slice does not change token validation, portal lookup, billing
  derivation, media URL handling, or customer-safe proof summarization.

### Defer

- Portal-specific `StatusPill` for invoice status. The current text rendering
  of invoice status (`Paid`, `Sent`, etc.) is readable. A pill upgrade would
  improve scannability but requires mapping the portal's invoice status values
  to pill tones — defer until the billing section is next touched.
- `PortalTimeline` event-icon system. The current plain-text timeline is
  functional. An icon set per event type would help visual parse speed but is
  out of scope for this token-consistency pass.
- Any change to the search input's layout or placeholder copy.

---

## Follow-up ideas (out of scope)

- Dedicated portal invoice detail view showing line items and payment history.
- `StatusPill` for invoice status on `BillingCard` rows (Paid / Sent / Draft /
  Void).
- Timeline icon system keyed to event type (GPS check-in, form submission,
  signature, invoice sent, payment received).
