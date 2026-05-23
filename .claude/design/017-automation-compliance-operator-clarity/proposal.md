# Proposal: Automation + Compliance Operator Clarity V1

## Goal and non-goals

**Goal:** Make `apps/web/app/automation/automation-client.tsx` and
`apps/web/app/compliance/compliance-client.tsx` scan-ready for operators by
applying the same token-consistency and primitive-discipline standard
established in slices 013–016. Both files share three recurring problems:
legacy color tokens, hand-rolled interactive elements that duplicate `<Button>`
and `StatusPill`, and hand-rolled stat tiles that duplicate `StatTile`. This
proposal addresses all three without altering scheduler behavior, RAG logic,
compliance advisory output, or any provider integration.

**Non-goals:** Scheduler or API behavior changes, OpenAI or Supabase
configuration, notification provider setup, migrations, RLS, seed/reset
scripts, environment variable management, preview or production deployments.
Provider secrets, webhook URLs, raw Supabase error payloads, and provider
request/response bodies must remain hidden from the UI — this proposal does not
add or remove any of that filtering.

---

## Current situation: Automation

`AutomationClient` is the largest file in the admin UI at ~1765 lines. Its
structural bones are sound — the "Operator snapshot" section already uses five
`StatTile` components correctly, and `CountTile` appears in the delivery
section for actionable counts. The legacy-token and hand-rolled-primitive
problems are clustered in four specific sub-sections.

### Legacy tokens

| Location | Current | Target |
|---|---|---|
| Page header eyebrow `<p>` | `text-secondary` | `<Eyebrow>` |
| Page header `<h1>` | `text-neutralDark` | `text-theme-text-primary` |
| Scheduler section mini-tile label | `text-secondary` (inside hand-rolled div) | `text-theme-text-secondary` via `StatTile` |
| All form labels (template + rule forms) | `text-neutralDark` | `text-theme-text-primary` |
| Template preview stripe | `border-l-4 border-secondary` | `border-l-4 border-theme-action-primary` |
| Notification row Send button | `border-primary/30 text-primary` | `<Button variant="outline">` |
| Rule status badge | `bg-primitive-slate-100` + inline text | `<StatusPill>` |
| Submit buttons (template + rule forms) | `bg-primary text-theme-text-inverse` | `<Button variant="primary">` |

### Hand-rolled scheduler mini-tiles

The scheduler section renders six statistics as individual `div` tiles styled
with `bg-theme-background-subtle p-3`:

```
Last status     Created         Duplicates
Preview due     Preview rules   Preview duplicates
```

These are the same pattern as the capture-counter tiles fixed in slice 016.
`StatTile` is already present in scope.

### Inline due-preview badges

Due-preview job cards show "Duplicate" and "New" labels as inline
`<span className="rounded-md px-2 py-1 ...">`. These are StatusPill use cases
— `tone="warning"` for Duplicate, `tone="success"` for New.

### Mixed delivery section

The delivery section starts correctly with `CountTile` for Failed and Retryable
counts, then continues with a loose mix of inline `StatusPill` renders for Not
sent / Sent / Manual review / Reachable / Missing contact / Attempts. The
CountTile cluster and the pill cluster are visually indistinct. Separating them
with an `<Eyebrow>` label each makes the scan hierarchy clear.

---

## Current situation: Compliance

`ComplianceClient` (~654 lines) mirrors the automation header problem and adds
two additional patterns.

### Legacy tokens

| Location | Current | Target |
|---|---|---|
| Page header eyebrow `<p>` | `text-secondary` | `<Eyebrow>` |
| Page header `<h1>` | `text-neutralDark` | `text-theme-text-primary` |
| Advisory output panel headers (required_fields, findings, citations) | `text-neutralDark` | `text-theme-text-primary` |
| Audit trail card headers | `text-neutralDark` | `text-theme-text-primary` |
| Form selects and textarea | `focus:border-primary` | `focus:border-theme-action-primary` |

### Hand-rolled advisory readiness tiles

The advisory readiness section renders four workflow-readiness entries as
`<article>` cards:

- Chemical review
- Recurring routes
- WDO / Branch 3
- Multi-unit audits

Each article carries a count and a status description in a hand-rolled layout.
This is a `StatTile` use case for the counts, with `StatusPill` for the
workflow-readiness status alongside each.

### `statusTone` / `evaluationTone` as raw CSS strings

Two helper functions — `statusTone` and `evaluationTone` — return raw Tailwind
class strings like `"text-theme-status-success"` or `"text-amber-600"` that are
applied via template literals. `"text-amber-600"` is a primitive, not a semantic
token. These functions drive the readiness indicator dots and evaluation result
labels. The correct pattern is `StatusPill` with a `tone` prop, or at minimum
`text-theme-status-warning` instead of the Tailwind color primitive.

---

## Proposed changes — Automation

### 1. Page header token migration

Replace the two-element page header pattern:

```tsx
// Before
<p className="text-secondary uppercase text-xs tracking-wide">Automation</p>
<h1 className="text-neutralDark font-bold text-2xl">Notification scheduler</h1>

// After
<Eyebrow>Automation</Eyebrow>
<h1 className="text-theme-text-primary font-bold text-2xl">Notification scheduler</h1>
```

Same pattern applies to any secondary `<h2>` section headers within the
automation page that currently carry `text-secondary` or `text-neutralDark`.

### 2. Scheduler mini-tiles — token migration

The six `bg-theme-background-subtle p-3` scheduler stat divs carry legacy
`text-secondary` on their labels. Because `StatTile` renders through `Card`,
using it here would create card-inside-card chrome if the scheduler section is
already inside a card. Instead, apply semantic tokens directly to the existing
compact div layout — same pattern as the portal capture counters in slice 016:

```tsx
// Before — six manual divs with legacy text-secondary
<div className="grid grid-cols-3 gap-3">
  <div className="bg-theme-background-subtle p-3 rounded">
    <p className="text-2xl font-bold">{scheduler.lastStatus}</p>
    <p className="text-xs text-secondary">Last status</p>
  </div>
  {/* … Created, Duplicates, Preview due, Preview rules, Preview duplicates */}
</div>

// After — same layout, semantic tokens
<div className="grid grid-cols-3 gap-3">
  <div className="bg-theme-background-subtle p-3 rounded">
    <p className="text-2xl font-bold text-theme-text-primary">{scheduler.lastStatus}</p>
    <p className="text-xs text-theme-text-secondary">Last status</p>
  </div>
  {/* … same pattern for Created, Duplicates, Preview due, Preview rules, Preview duplicates */}
</div>
```

If any of the six values are string labels (e.g., "Last status" is a run-state
string rather than a number), keep them as-is — the token migration does not
require changing the value type or adding numeric formatting.

### 3. Due-preview job badges → `StatusPill`

Replace inline badge `<span>` elements on due-preview job cards:

```tsx
// Before
<span className="rounded-md px-2 py-1 bg-amber-100 text-amber-800 text-xs">
  Duplicate
</span>

// After
<StatusPill tone="warning" dot={false}>Duplicate</StatusPill>
```

| Badge label | `tone` |
|---|---|
| `"Duplicate"` | `"warning"` |
| `"New"` | `"success"` |

### 4. Delivery section hierarchy

Add `<Eyebrow>` labels to separate the two clusters in the delivery section:

```
Delivery health                  ← <Eyebrow> (new)
[Failed CountTile] [Retryable CountTile]

Delivery breakdown               ← <Eyebrow> (new)
[Not sent pill] [Sent pill] [Manual review pill] …
```

No change to the CountTile or StatusPill components themselves — only the
`<Eyebrow>` separators are new.

### 5. Notification row Send button → `<Button>`

Replace the hand-rolled send control on notification queue rows. `@pest-patrol/ui`
does not expose `variant="outline"` — use `variant="ghost"` or `variant="subtle"`
depending on which variant the existing `<Button>` component uses for secondary
row-level actions. Keep `type="button"` explicit so the element does not
accidentally submit a parent form:

```tsx
// Before
<button className="border border-primary/30 text-primary text-sm px-3 py-1 rounded">
  Send
</button>

// After — confirm variant name against @pest-patrol/ui Button API
<Button variant="ghost" size="sm" type="button">Send</Button>
```

### 6. Rule status badge → `StatusPill`

Replace `bg-primitive-slate-100` rule-status inline badge with `StatusPill`:

| Rule status | `tone` |
|---|---|
| Active / enabled | `"success"` |
| Paused | `"warning"` |
| Draft | `"info"` |
| Error | `"danger"` |

```tsx
// Before
<span className="bg-primitive-slate-100 text-sm px-2 py-0.5 rounded">
  {rule.status}
</span>

// After
<StatusPill tone={ruleStatusTone(rule.status)} dot={false}>
  {rule.status}
</StatusPill>
```

The `ruleStatusTone` helper is a local pure function — no domain dependency
needed.

### 7. Template preview stripe token

Replace the legacy border token on the template message preview:

```tsx
// Before
<div className="border-l-4 border-secondary pl-4">

// After
<div className="border-l-4 border-theme-action-primary pl-4">
```

### 8. Form label token migration

Replace `text-neutralDark` on all `<label>` elements in the template and rule
forms:

```tsx
// Before
<label className="block text-sm font-medium text-neutralDark">

// After
<label className="block text-sm font-medium text-theme-text-primary">
```

### 9. Submit buttons → `<Button>`

Replace hand-rolled submit `<button>` elements. Use the correct primary variant
name from `@pest-patrol/ui` — if the variant is `"primary"` use that; otherwise
use `"default"` or whichever variant the shared Button uses for filled primary
actions. Keep `type="submit"` explicit on form submit buttons. Preserve any
existing pending/disabled logic — `<Button>` does not supply a loading state
itself:

```tsx
// Before
<button className="bg-primary text-theme-text-inverse px-4 py-2 rounded font-medium">
  Save template
</button>

// After — confirm variant name and preserve disabled/pending handling
<Button variant="primary" type="submit" disabled={isSubmitting}>
  Save template
</Button>
```

Same for the rule form save button and any other hand-rolled primary action
buttons in the automation forms.

---

## Proposed changes — Compliance

### 1. Page header token migration

Same pattern as automation:

```tsx
// Before
<p className="text-secondary uppercase text-xs tracking-wide">Compliance</p>
<h1 className="text-neutralDark font-bold text-2xl">Compliance workspace</h1>

// After
<Eyebrow>Compliance</Eyebrow>
<h1 className="text-theme-text-primary font-bold text-2xl">Compliance workspace</h1>
```

### 2. Advisory readiness articles — token migration + `StatusPill`

The four hand-rolled `<article>` readiness cards carry `text-neutralDark` on
their area label and rely on `statusTone` producing raw CSS class strings for
the readiness indicator. The migration has two parts:

**Always: replace legacy tokens on the article layout**

```tsx
// Before
<article className="...">
  <p className="text-2xl font-bold">{chemicalReview.count}</p>
  <p className="text-neutralDark">Chemical review</p>
  <p className={statusTone(chemicalReview.status)}>{chemicalReview.status}</p>
</article>

// After — token migration; layout unchanged
<article className="...">
  <p className="text-2xl font-bold text-theme-text-primary">{chemicalReview.count}</p>
  <p className="text-theme-text-primary">Chemical review</p>
  <StatusPill tone={advisoryReadinessTone(chemicalReview.status)} dot={false}>
    {chemicalReview.status}
  </StatusPill>
</article>
```

**If a clean numeric count is available**: keep the count `<p>` as shown above.
**If no clean count is available**: drop the count element entirely. Display
the area name and `StatusPill` only — do not force a misleading `0` or
placeholder number. The status pill is the primary operator signal.

The `advisoryReadinessTone` helper maps status strings to tones:

| Status | `tone` |
|---|---|
| Ready / Complete | `"success"` |
| Needs review / Partial | `"warning"` |
| Not configured / Missing | `"danger"` |
| N/A | `"info"` |

Note: `StatTile` renders through `Card` — do not use it here if the articles
are already inside a card or section panel. The compact article layout is the
correct container for this context.

### 3. `statusTone` / `evaluationTone` — remove primitive color references

The two helper functions that return raw class strings currently include
`"text-amber-600"` (a Tailwind primitive). Replace with the semantic equivalent:

| Current | Target |
|---|---|
| `"text-amber-600"` | `"text-theme-status-warning"` |
| `"text-red-600"` | `"text-theme-status-danger"` |
| `"text-green-600"` | `"text-theme-status-success"` |

If the helpers are replaced by a `StatusPill`-based approach (as proposed in
change 2 above), the helpers can be removed entirely for the advisory readiness
section. For any remaining uses of `evaluationTone` in the advisory output
panels, apply the semantic token substitution.

### 4. Advisory output panel headers

Replace `text-neutralDark` in `required_fields`, `findings`, and `citations`
panel section headers:

```tsx
// Before
<p className="font-medium text-neutralDark">{section.title}</p>

// After
<p className="font-medium text-theme-text-primary">{section.title}</p>
```

Same substitution for audit trail card headers.

### 5. Form focus token migration

Replace `focus:border-primary` on compliance form selects and textarea:

```tsx
// Before
<select className="... focus:border-primary focus:ring-primary">

// After
<select className="... focus:border-theme-action-primary focus:ring-theme-action-primary">
```

---

## State coverage

### Automation

| State | Treatment |
|---|---|
| Scheduler not configured | Existing empty/setup state — no change |
| Scheduler running | StatTile shows live counts; due-preview cards show StatusPill badges |
| No due previews | Existing empty-preview state — no change |
| Delivery healthy | CountTile for Failed=0, Retryable=0; StatusPill breakdown unchanged |
| Delivery degraded | CountTile `tone="danger"` for failed count — existing behavior |
| No notification rules | Existing empty-rules state — no change |
| Rule active / paused / draft / error | StatusPill with appropriate tone |
| Form submitting | `<Button>` handles disabled/loading state natively |

### Compliance

| State | Treatment |
|---|---|
| Setup required | Existing setup-required `EmptyState` — no change |
| Advisory areas not configured | StatTile value=0, StatusPill `tone="danger"` "Not configured" |
| Advisory areas ready | StatTile shows count, StatusPill `tone="success"` "Ready" |
| Advisory running | Existing loading state — no change |
| Latest advisory present | Output panels render with `text-theme-text-primary` headers |
| No advisory yet | Existing empty-advisory state — no change |
| Audit trail empty | Existing empty-audit state — no change |

---

## AGENTS conformance self-check

| Concern | Status |
|---|---|
| No Supabase from UI | ✅ — no new data calls |
| No schema changes | ✅ |
| No migrations | ✅ |
| No scheduler behavior changes | ✅ — UI-only |
| No provider setup or secrets | ✅ |
| No OpenAI / RAG logic changes | ✅ — advisory output rendering only |
| No production or preview mutations | ✅ |
| Provider payloads remain hidden | ✅ — no change to data filtering layer |

---

## Adopt/adapt/defer guidance for Codex

### Adopt

**Automation:**
- Page header: `<Eyebrow>` for the section label, `text-theme-text-primary` for
  `<h1>`.
- Six scheduler mini-tiles: replace with `<StatTile>` in the same 3-column
  grid.
- Due-preview badges: replace inline `<span>` with `<StatusPill tone={...}
  dot={false}>` using the tone table above.
- Delivery section: add `<Eyebrow>` before the CountTile cluster and before the
  StatusPill cluster.
- Notification row send control: `<Button variant="outline" size="sm">`.
- Rule status badge: `<StatusPill tone={ruleStatusTone(...)} dot={false}>`.
- Template preview stripe: `border-theme-action-primary` replaces
  `border-secondary`.
- All form `<label>` elements: `text-theme-text-primary`.
- All form submit `<button>` elements: `<Button variant="primary">`.

**Compliance:**
- Page header: `<Eyebrow>` + `text-theme-text-primary` for `<h1>`.
- Four advisory readiness articles: `<StatTile>` + `<StatusPill>` per entry,
  2×2 grid.
- `statusTone` / `evaluationTone` primitive color strings: replace with
  semantic token equivalents; remove helpers if fully replaced by StatusPill.
- Advisory panel and audit trail headers: `text-theme-text-primary`.
- Form focus tokens: `focus:border-theme-action-primary` +
  `focus:ring-theme-action-primary`.

### Adapt

- `ruleStatusTone` and `advisoryReadinessTone` helper functions are local pure
  functions — Codex should implement them inline or in the component file. No
  domain package export needed. Do not move presentation tone unions into
  `packages/types`.
- `@pest-patrol/ui` does not expose `Button variant="outline"`. Use `variant="ghost"`,
  `variant="subtle"`, or whichever secondary variant the existing Button API
  exposes. Confirm against the live component before wiring. Keep `type="button"`
  on row actions and `type="submit"` on form submits; preserve existing
  disabled/pending logic since `<Button>` does not supply a loading state.
- Scheduler mini-tiles must NOT use `StatTile` if the scheduler section is
  inside a card — that creates card-inside-card chrome. Apply semantic tokens
  directly to the existing compact div layout (see section 2 above).
- The six scheduler metric values may be a mix of strings and numbers (e.g.,
  "Last status" is a run-state string). The token migration does not require
  numeric formatting — keep values as-is.
- If `statusTone` and `evaluationTone` in the live compliance file already
  return semantic token classes (not raw Tailwind primitives), avoid churn and
  only replace any remaining non-semantic class references.
- If compliance advisory readiness data does not expose a clean numeric count
  for an area, omit the count element and display `StatusPill` only — do not
  force a misleading `0` or placeholder. See section 2 of the compliance
  changes above.

### Defer

- Bulk notification retry or dismiss actions. The queue rows surface individual
  send controls — a bulk action layer requires list-selection state, which is
  out of scope for a presentation-only pass.
- Compliance advisory diff view. Showing what changed between the current and
  previous advisory run would require storing prior advisory state — deferred.
- Automation form validation UX. The current forms submit without inline
  validation feedback. Inline error states are a UX improvement deferred to a
  dedicated forms slice.
- Compliance source-readiness `StatusPill` tones already use the correct
  pattern — no change needed there. Do not refactor what is already correct.

---

## Follow-up ideas (out of scope)

- Bulk "Retry failed" action on the delivery section CountTile.
- Automation rule dry-run preview as a modal rather than the inline preview
  card.
- Compliance advisory diff view: show added / removed findings between runs.
- Scheduler run history timeline using `PortalTimeline`-style component.
