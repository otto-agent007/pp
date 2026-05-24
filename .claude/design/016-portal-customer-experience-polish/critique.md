# Critique: Portal Customer Experience Polish V1

Reviewed against: `apps/web/app/portal/[customerId]/portal-client.tsx` and
the 016 proposal and codex-review. This was a token-consistency and
primitive-discipline pass targeting the customer portal. The legacy token
count dropped from 38 to 16 instances across the file.

---

## What's correct against the proposal and codex-review

**Token migration — all four legacy primitives**

Every `text-neutralDark` instance across `PortalMediaTile`, `PortalFormCard`,
`BillingCard`, and `CloseoutCard` is replaced with `text-theme-text-primary`.
The `text-secondary` instances in `BillingSection`, `PortalTimeline`, and
`CloseoutCard` are replaced with `text-theme-text-secondary` or
`text-theme-text-muted` as appropriate. The search input's
`focus:border-primary` is replaced with `focus:border-theme-action-primary`.
All one-for-one class substitutions landed correctly.

**Section headers — `<Eyebrow>` adoption**

`BillingSection` now opens with `<Eyebrow>Billing</Eyebrow>` above an `<h2>`
heading; `PortalTimeline` uses `<Eyebrow>Account timeline</Eyebrow>` in the
same pattern. Both follow the Eyebrow-as-label-above-heading convention used
in the operator pages. Correct.

**`CloseoutCard` — per-card `<Eyebrow>` adaptation**

Rather than adding a single section-level `<Eyebrow>Completed jobs</Eyebrow>`
header above the closeout list, Codex placed `<Eyebrow>Completed service</Eyebrow>`
inside each `CloseoutCard`. This is a valid adaptation — the per-card eyebrow
gives each visit its own context label, which is the right reading at the
customer-portal density. The codex-review did not prescribe section-level vs.
per-card placement.

**Capture counter grid — card-inside-card avoided**

The three Forms/Photos/Signatures divs kept the `bg-theme-background-subtle p-3`
compact layout and migrated the internal tokens: values to
`text-theme-text-primary`, labels to
`text-xs font-semibold uppercase tracking-wide text-theme-text-muted`. No
`StatTile` nesting inside a card — correct per the codex-review Adapt
direction.

**Timeline hierarchy**

The event type label (`"Service completed"` / `"Invoice activity"`) uses
`text-sm font-semibold uppercase tracking-wide text-theme-text-secondary`.
Event title uses `text-lg font-semibold text-theme-text-primary`. Supporting
text uses `text-sm text-theme-text-secondary`. The three-tier hierarchy landed
correctly.

**`invoiceStatusTone` + `StatusPill` on `BillingCard`**

The `invoiceStatusTone` helper was added and `StatusPill` wired to invoice
status on each `BillingCard` — this was listed as a proposal follow-up but
Codex shipped it in the same pass. The tone mapping (paid → success, void →
neutral, draft → warning, sent → info) is correct.

**Customer-safe boundary**

No signed media URLs, GPS coordinates, raw tokens, payment provider IDs,
internal notes, or provider payloads are exposed. The `proof.privacy_label`
and `proof.summary_label` domain helpers gate what the customer sees.
Confirmed correct.

---

## Issues to note before the next portal pass

### 1. `border-primitive-slate-100` in the invoice line-item divider

`BillingCard` renders a `<dl>` for line items behind a border:

```tsx
<dl className="mt-4 grid gap-3 border-t border-primitive-slate-100 pt-4 sm:grid-cols-2">
```

`border-primitive-slate-100` is a raw primitive, not a semantic token. The
correct semantic equivalent is `border-theme-border-subtle`. This is the only
remaining primitive color reference in the file after the migration.

**Fix:** `border-primitive-slate-100` → `border-theme-border-subtle`.

---

## Codex-review Adopt/Adapt/Defer/Reject assessment

**Adopt decisions — all honored**

Token migration across all four components, `<Eyebrow>` section headers,
timeline hierarchy, search input focus token. `invoiceStatusTone` + `StatusPill`
shipped as a bonus ahead of the deferred follow-up.

**Adapt decisions — all honored**

Capture counter grid used compact tokenized mini-metrics in place of
`StatTile` (card-inside-card avoided). Per-card `<Eyebrow>Completed service</Eyebrow>`
used in place of section-level header. Existing portal data access hooks
untouched.

**Defer decisions — all honored**

No invoice detail pages, payment history, timeline icons, search layout
changes, or portal-auth changes.

**Reject decisions — all honored**

No direct Supabase access. No customer-unsafe data exposure.

---

## Pre-next-slice checklist

Before the next portal pass:

1. Replace `border-primitive-slate-100` at the `BillingCard` line-item `<dl>`
   with `border-theme-border-subtle`.
