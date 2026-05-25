# Critique: Automation + Compliance Operator Clarity V1

Reviewed against: `apps/web/app/automation/automation-client.tsx`,
`apps/web/app/compliance/compliance-client.tsx`, and the 017 proposal and
codex-review. The automation file's legacy token count dropped from 88 to 23;
compliance from 43 to 18. Both represent significant cleanup but each file
retains a distinct cluster of remaining `text-primary` instances that the
pass didn't reach.

---

## What's correct against the proposal and codex-review

**Automation — page header and form labels**

`<Eyebrow>Admin</Eyebrow>` replaces the legacy `<p>` eyebrow; the `<h1>`
carries `text-theme-text-primary`. All `<label>` elements in the template
form, notification form, and rule form use `text-theme-text-primary`. All
form `<input>`, `<select>`, and `<textarea>` focus states use
`focus:border-theme-action-primary`. Correct throughout.

**Automation — submit and action buttons → `<Button>`**

All hand-rolled `<button>` elements replaced with `<Button>`. The variant
selection exactly matches the codex-review Adapt guidance:

- Send notification row action: `variant="ghost" size="sm" type="button"` ✅
- Mark handled: `variant="subtle" size="sm" type="button"` ✅
- Dismiss: `variant="ghost" size="sm" type="button"` ✅
- Rule Edit: `variant="ghost" size="sm" type="button"` ✅
- Rule Pause/Resume: `variant="subtle" size="sm" type="button"` ✅
- Rule Archive: `variant="danger" size="sm" type="button"` ✅
- Template Use/Edit: `variant="ghost" size="sm" type="button"` ✅
- Template Archive/Restore: `variant="danger"` / `variant="subtle"` ✅
- Form submits: `type="submit"` with `disabled` passed through ✅

`type="button"` / `type="submit"` explicit on all calls. Existing
pending/disabled logic preserved. No loading state added (correct — `<Button>`
doesn't provide one).

**Automation — `ruleStatusTone` helper**

Local `ruleStatusTone` function maps `AutomationRule["status"]` to
`StatusPillTone`: active → success, paused → warning, fallback → neutral.
`StatusPill dot={false}` on rule cards. Correctly replaces
`bg-primitive-slate-100`. The helper handles the typed status union without
a domain export.

**Automation — due-preview badges → `StatusPill`**

`<StatusPill dot={false} tone={item.is_duplicate ? "warning" : "success"}>`
replaces the inline badge spans. "Duplicate" → warning, "New" → success.
Correct.

**Automation — delivery section hierarchy**

`<Eyebrow>Delivery health</Eyebrow>` before the two `CountTile` components;
`<Eyebrow>Delivery breakdown</Eyebrow>` before the `StatusPill` cluster.
Both use `basis-full` wrappers to force full-width row breaks. Correct.

**Automation — template preview stripe**

`border-l-4 border-theme-action-primary` replaces `border-l-4 border-secondary`
on both the template and reminder preview blocks. Correct.

**Automation — scheduler mini-tiles**

The six scheduler stat divs kept the compact layout and migrated the label
class to `text-xs font-semibold uppercase tracking-wide text-theme-text-muted`.
Card-inside-card avoided, consistent with the portal capture-counter pattern
and the codex-review Adapt direction.

**Compliance — page header and form**

`<Eyebrow>California compliance</Eyebrow>` replaces the legacy `<p>` eyebrow;
`<h1>` uses `text-theme-text-primary`. Form labels use `text-theme-text-primary`.
Form select and textarea focus states use `focus:border-theme-action-primary`.

**Compliance — advisory readiness articles → `StatusPill`**

The four advisory readiness `<article>` elements now render their area label
with `text-xs font-semibold uppercase tracking-wide text-theme-text-muted` and
use `<StatusPill dot={false} tone={readinessTone(...)}>` for the readiness
state. The `readinessTone` local helper covers the full status surface (ready/
advisory_ready → success; rag_disabled/operator_review_required → warning;
missing/not_configured → danger; fallback → warning). No count tiles forced
where counts were not cleanly available — Chemical review and Recurring routes
show missing-fields and completed-jobs counts as descriptive text instead.
Correct per the codex-review Adapt guidance.

**Compliance — `statusTone` / `evaluationTone` helpers**

Both helpers now return only semantic status token classes
(`border-status-alert-*-border bg-status-alert-*-bg text-status-alert-*-fg`).
No raw Tailwind primitives (`text-amber-600` etc.) remain in either helper.

**Compliance — advisory output and audit headers**

Required evidence, Findings, and Citations section headers use
`text-sm font-semibold text-theme-text-primary`. Audit trail card headers use
`font-semibold text-theme-text-primary`. Correct.

---

## Issues to note before the next automation or compliance pass

### 1. `text-primary` on four distinct automation type-label sites

The implementation migrated form labels and action buttons but left the
notification/rule/template type label `<p>` elements using the legacy
`text-primary` token. Four locations:

```tsx
// Notification row — line 1069
<p className="mt-2 text-sm font-medium text-primary">
  {formatType(notification.type)}
</p>

// Latest generated notification mini-card — line 834
<p className="mt-1 text-xs font-medium text-primary">
  {formatType(item.type)}
</p>

// Rule card — line 1203
<p className="mt-1 text-sm font-medium text-primary">
  {formatType(rule.type)}
</p>

// Template list item — line 1443
<p className="mt-1 text-xs font-medium text-primary">
  {formatType(template.type)}
</p>
```

All four carry the same semantic intent — a secondary metadata tag for the
automation type ("Follow-up reminder" / "Recurring service prompt"). The
correct migration is `text-theme-text-secondary` (supporting metadata, not
primary action). This accounts for the bulk of the 23 remaining legacy
instances in automation.

### 2. `text-primary` on two scheduler mini-tile values

Two of the six scheduler stat divs missed the value token migration:

```tsx
// "Created" tile — line 712
<p className="mt-2 text-lg font-bold text-primary">
  {schedulerStatus.lastRunGeneratedCount}
</p>

// "Preview due" tile — line 728
<p className="mt-2 text-lg font-bold text-primary">
  {schedulerPreview.items.length}
</p>
```

The other four tiles ("Last status", "Duplicates", "Preview rules", "Preview
duplicates") correctly use `text-theme-text-primary`. The two misses are
inconsistent with the migrated tiles on the same grid. Fix:
`text-primary` → `text-theme-text-primary` on both.

### 3. Templates section header uses bare `<p>` instead of `<Eyebrow>`

The Templates right-rail panel header reads:

```tsx
<p className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
  Templates
</p>
<h2 className="mt-1 text-xl font-semibold text-theme-text-primary">
  Notification templates
</h2>
```

The token class is correct (`text-theme-text-secondary`), but the element is
a plain `<p>` rather than `<Eyebrow>`. The Scheduler section and all operator-
page sections use `<Eyebrow>` for this same role. One-element swap; the visual
result is identical since `<Eyebrow>` renders the same uppercase small-cap
style internally.

### 4. `text-primary` on compliance citation links

The citation `<a>` element in the advisory output uses the legacy `text-primary`:

```tsx
<a
  className="font-semibold text-primary hover:underline"
  href={citation.url}
  rel="noreferrer"
  target="_blank"
>
  {citation.source_title}
</a>
```

`text-primary` is the legacy action-color alias. The semantic equivalent for
a primary interactive link is `text-theme-action-primary`. This is one of the
18 remaining legacy instances in compliance.

---

## Codex-review Adopt/Adapt/Defer/Reject assessment

**Adopt decisions — all honored**

`<Eyebrow>` for page and section labels, `StatusPill` for due-preview badges
and rule status badges, delivery section hierarchy labels, template preview
stripe, form label migration, focus token migration, advisory readiness
`StatusPill`, advisory output headers, audit trail headers.

**Adapt decisions — all honored**

`variant="ghost"` used for the Send/Dismiss/Edit row actions (not the
non-existent `variant="outline"`). `type="button"` / `type="submit"` explicit
throughout. Scheduler mini-tiles kept compact div layout (no StatTile
nesting). `statusTone` / `evaluationTone` helpers kept as inline class-string
patterns since they now return only semantic tokens. `ruleStatusTone` and
`readinessTone` kept as local pure functions, not domain exports.

**Defer decisions — all honored**

No bulk retry actions, dry-run modals, inline form validation, scheduler
history timelines, or compliance advisory diff views.

**Reject decisions — all honored**

No provider secrets, webhook URLs, raw Supabase errors, or OpenAI payload
details exposed. No scheduler behavior, advisory generation, or audit
persistence changes.

---

## Pre-next-slice checklist

Before the next automation or compliance pass:

1. Replace `text-primary` → `text-theme-text-secondary` on all four type-label
   `<p>` elements in `automation-client.tsx` (notification row line 1069,
   generated notification card line 834, rule card line 1203, template list
   item line 1443).
2. Replace `text-primary` → `text-theme-text-primary` on the "Created"
   scheduler tile value (line 712) and "Preview due" scheduler tile value
   (line 728).
3. Replace the Templates panel `<p className="... text-theme-text-secondary">`
   label with `<Eyebrow>` in `automation-client.tsx` (line 1290).
4. Replace `text-primary` → `text-theme-action-primary` on the compliance
   citation `<a>` element in `compliance-client.tsx` (line 621).
