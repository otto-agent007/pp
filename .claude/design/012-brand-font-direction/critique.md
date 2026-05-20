# Critique: Brand Font Direction (post-codex-review)

Reviewed: `docs/design-system/assets/wordmark-options/v3/wordmark.svg`,
`docs/design-system/assets/wordmark-options/v3/wordmark-on-dark.svg`,
`docs/design-system/assets/wordmark-options/v3/README.md`.

This slice is a design-direction handoff, not an implementation. No app code
was changed — correct per the codex-review Reject note. Accordingly this
critique focuses on the state of the v3 reference assets themselves, the
codex-review's Adopt/Adapt/Defer/Reject decisions against the proposal, and
what must be resolved before any promotion slice begins.

---

## What's correct against the proposal and codex-review

- **Direction confirmed** — condensed fleet-livery (v3) is adopted as the lead
  draft. Options A and B (Inter / Inter Display) are correctly assessed as
  functional fallbacks, not final direction.
- **Dark-surface variant exists** — `wordmark-on-dark.svg` is present in
  `v3/` with `fill="#FFFFFF"` and its own accessible IDs. This addresses the
  dark-surface production master I listed as a pre-promotion edit. It was
  already built; the proposal just confirmed it was necessary.
- **Path identity** — light and dark variants share identical path coordinates.
  The only difference is the fill (`#071A3D` vs `#FFFFFF`). Correct — no
  geometry divergence to manage.
- **No `<text>`, no `font-family`, no `transform=`** — both files pass. Paths
  are absolute coordinates with no font dependency and no `transform` attributes
  on any element. The slant is baked into path geometry, not a CSS or SVG
  transform. Verified against the constraint listed in `decisions.md`.
- **`fill-rule="evenodd"` on counter glyphs** — correctly applied to the five
  letters with enclosed counters: both P glyphs, A, R, and O. Letters without
  counters (E, S, T, L) use the default winding rule. Correct.
- **Accessibility structure** — `role="img"`, `aria-labelledby`, `<title>`, and
  `<desc>` are present and wired correctly in both files. IDs are unique across
  the two files (`pp-wm-title` / `pp-wm-dark-title`). No per-path `aria-label`
  redundancy — this is cleaner out of the box than the Logo 2 situation in the
  011 critique.
- **Tagline kept out of master** — neither v3 file includes tagline text.
  Correct per the codex-review Adapt note and proposal recommendation.
- **No active app assets replaced** — confirmed. `packages/assets/brand/` is
  unchanged. Promotion gates intact.

---

## Issues to resolve before the promotion slice

### 1. O is the only curvilinear glyph — intentional or oversight?

All nine other glyphs are built entirely from straight-line segments (`L`, `Z`,
and one `H`-equivalent diagonal). The O is the exception: its top-right and
bottom-left corners use quadratic Bézier curves (`Q`):

```
M598 10 L638 10 Q648 10 647.13 20   ← curved top-right
L640.13 100 Q639.25 110 629.25 110  ← curved bottom-left
```

This gives the O a softer, more rounded corner while every other letter has
hard rectilinear joints. The result is a letterform that reads as typographically
distinct from its neighbors — the O sits slightly outside the register of the
set.

This may be intentional: a pure polygon O would read as a lozenge or diamond,
not a letter, so some curve is necessary for legibility. But the current curves
are asymmetric — top-right and bottom-left are curved, top-left and bottom-right
are hard corners. At production size, that asymmetry will be perceptible to a
trained eye and should be a deliberate choice, not a drafting artifact.

**Action needed before promotion:** Confirm with the type-designer review
whether the asymmetric O curves are intentional, and whether the two non-curved
corners should also receive a small curve for optical consistency. This belongs
in the craft review already deferred in the codex-review — but flag it
explicitly so the reviewer knows to look.

---

### 2. Naming collision between `decisions.md` and `proposal.md` needs a
resolution note

The codex-review correctly flags this, but only in the Adapt section without
resolving it in the file record. The collision is:

- `decisions.md` calls the approved lead draft **"Direction A / refined
  fleet-livery"**
- The proposal calls the same draft **"Option C / v3"** and uses **"Option A"**
  for the current Inter direction

Anyone reading `decisions.md` after reading the proposal (or vice versa) will
have to cross-reference to confirm these are the same asset. Future briefs or
PRs that cite either file will be ambiguous.

**Action needed:** Add a one-line resolution note to `decisions.md` — something
like: *"Direction A in this file = Option C / v3 in the proposal. The proposal's
Option A is the current Inter fallback, not the approved lead direction."* This
is a docs-only change, appropriate for Codex to include in the next task-doc
pass.

---

### 3. `<title>` value carries "wordmark" suffix — acceptable for reference,
must change at promotion

Both v3 files use `<title>Pest Patrol wordmark</title>`. This is fine for a
reference/draft asset. At promotion, "wordmark" is an internal asset-category
label, not a product name. A screen reader on the live header will announce
`"Pest Patrol wordmark"` — the suffix adds nothing for end users.

This mirrors the issue raised in the 011 critique for the `"- compact header"`
suffix. The resolution is the same: simplify to `"Pest Patrol"` (or `"Pest
Patrol OS"` if that open question has been resolved by then) at promotion time.

**Action needed at promotion, not now:** Update `<title>` in whichever v3 file
is promoted. Open question from the 011 critique (OQ 4) still applies here —
`"Pest Patrol"` vs `"Pest Patrol OS"` — and should be decided before the
promotion slice begins.

---

### 4. `<metadata>` is documentation, not semantics — acceptable, but note for
type-designer handoff

Both files contain a `<metadata>` block with construction notes (slant, cap
height, stem weight, tracking). This is fine for reference — it's effectively
an SVG comment that survives file transfer. Screen readers do not process it;
only the `<title>` and `<desc>` are surfaced.

No action needed, but worth telling the type-designer reviewer that these notes
are there and should be preserved or migrated to the `README.md` before the
production asset is stripped clean by SVGO.

---

### 5. 720×120 viewBox is wider than the Options A/B/C comparisons (420×96)

The v3 files are wordmark-only (no shield). The Options A/B/C files were
combined mark + wordmark at 420×96. At 52px rendered header height, the v3
wordmark alone renders at approximately 312px wide. Combined with the shield at
that height, the full lockup would be roughly 400–420px wide.

This is workable on desktop. The concern is the mobile header. If the route
shell header must fit both the shield and the wordmark at a constrained viewport
(say 375px), there is no room for nav controls or a hamburger target alongside
a 400px lockup.

The minimum-size floor and mobile lockup behavior (wordmark-only below a
breakpoint, mark-only below the floor) are both in the Defer list from the
codex-review. This is the right call for now. But the 312px width at 52px
height should be explicitly noted in the `packages/assets/brand/README.md` table
at promotion time so the mobile implementation knows what it is working with.

---

## Codex-review Adopt/Adapt/Defer/Reject assessment

### Adopt decisions — all sound

Direction adoption, path-only constraint, tagline contextual placement, and
v3 as durable reference location are all correctly adopted. No concerns.

### Adapt decision — naming collision needs follow-through

The naming reconciliation note in the Adapt section is correct but incomplete.
Codex describes the problem but does not specify where the resolution note should
live. Recommend a one-line append to `decisions.md` as described in issue 2
above. The codex-review does not need to change — just `decisions.md`.

### Defer decisions — all appropriate

Type-designer craft review, trademark/legal diligence, minimum-size rules,
dark-surface production masters, and `wordmark-with-tagline` asset are all
correctly deferred. The O curve question (issue 1 above) belongs in the
type-designer review already on this list.

One addition to the defer list that is not currently named: **the `<title>` value
update**. The codex-review does not mention it. Recommend adding it to the
promotion slice checklist so it does not get missed the way the `"- compact
header"` suffix almost did in the 011 path.

### Reject decisions — all correct

No live asset replacement, no runtime tagline toggle, no migrations or
environment changes. All correct. Nothing to flag.

---

## Pre-promotion checklist (updated from proposal)

Before any v3 file is promoted to `packages/assets/brand/`:

1. Complete type-designer/craft review — particularly the asymmetric O curves
   (issue 1).
2. Resolve trademark/legal diligence.
3. Decide `"Pest Patrol"` vs `"Pest Patrol OS"` for the production `<title>`
   (OQ 4 from 011 critique, still open).
4. Update `<title>` in the file(s) being promoted to the decided value.
5. Add a resolution note to `decisions.md` for the Direction A / Option C naming
   collision (issue 2).
6. Confirm mobile lockup strategy at the promotion slice — wordmark + shield
   at desktop, mark-only below a defined breakpoint.
7. Update `packages/assets/brand/README.md` with the surface-assignment table,
   minimum-width values (including the 312px-at-52px-height figure), and a
   dark-surface caution.
8. Preserve `<metadata>` construction notes or migrate them to `README.md`
   before any SVGO pass strips them.
