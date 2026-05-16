# Critique: Brand Asset Intake Review (post-review)

Reviewed: `packages/assets/brand/pest-patrol-logo-1-reference-match.svg`, `packages/assets/brand/pest-patrol-logo-2-compact-header.svg`, `packages/assets/brand/pest-patrol-logo-3-sticker-badge.svg`, `packages/assets/brand/README.md`.

This slice is a design-advisory intake, not an implementation wiring. No app code was changed — that is correct per the codex-review Adapt note ("Do not wire logos into app code as part of this relay"). Accordingly, this critique focuses on the current state of the SVG assets themselves against the pre-production checklist the proposal and review defined, and on confirming that deferred items are correctly staged.

---

## What's correct against the proposal and codex-review

- **Role assignments adopted** — Logo 2 (compact-header) as primary, Logo 1 (reference-match) as canonical reference, Logo 3 (sticker-badge) for large/accent contexts. These are design decisions; no file change is needed to adopt them.
- **No app wiring** — none of the three logos has been wired into `apps/web`, `apps/mobile`, or any other app surface. Correct per codex-review.
- **Root-level accessibility structure intact** — all three SVGs retain `role="img"`, `aria-labelledby="title desc"`, and correctly IDed `<title id="title">` and `<desc id="desc">` child elements. The `aria-labelledby` is correctly wired: the `<title>` and `<desc>` IDs match the reference. Root accessible names are correct.
- **No new brand colors** — the SVG palette (`#E11D2E`, `#071A3D`, `#facc15`, `#FFFFFF`) maps entirely to the existing `red`, `navy`, `yellow`, and `white` token families. No new values introduced.
- **Filenames unchanged** — descriptive, lowercase, hyphenated. Correct per `docs/ASSET_PIPELINE.md`.
- **Font dependency confirmed moot** — all text is already converted to path geometry. The `font-family: 'Inter Display'` annotation has no rendering effect. No font load required.
- **README not updated with a surface-assignment table** — correct: the codex-review said the table is "useful after final logo roles are approved, but it does not need to be added before asset intake is reviewed."

---

## Pre-promotion issues (must be resolved before Logo 2 is wired into any live header)

### 1. Redundant per-path `aria-label` attributes — worse than the proposal described

The proposal noted that individual text path groups carry `aria-label="PEST"` and `aria-label="PATROL"`, and that these might be read as separate images. The actual count is **3 × `aria-label="PEST"` and 3 × `aria-label="PATROL"`** per file — one per layer of the triple-stroke stack.

A screen reader that processes each aria-labelled element separately may announce: `"PEST" — "PEST" — "PEST" — "PATROL" — "PATROL" — "PATROL" — "Pest Patrol logo - compact header, Compact Pest Patrol wordmark…"` This is worse than the proposal anticipated. The root `aria-labelledby="title desc"` already provides the full accessible name; the six per-path labels add noise, not information.

**Action needed before promotion:** Remove all `aria-label` attributes from the individual path elements in the logo file(s) being promoted to production. The root structure is sufficient. The codex-review Adapt note says: "Remove redundant per-path aria-label attributes only in production-ready asset cleanup, after confirming the root title and description still give the right accessible name." That condition is confirmed — the root structure is correctly wired.

---

### 2. `<title>` variant suffix must be updated at promotion time

Current `<title>` values:
- Logo 1: `"Pest Patrol logo - reference match"`
- Logo 2: `"Pest Patrol logo - compact header"`
- Logo 3: `"Pest Patrol logo - sticker badge"`

These describe asset variants, not the brand mark. A screen reader navigating to the production header will announce `"Pest Patrol logo - compact header"` — the `"- compact header"` suffix is an internal asset-management label, not a product name.

The codex-review Adapt note says: "When a logo file is promoted to production header use, simplify the root title to a product-facing label such as `Pest Patrol` or `Pest Patrol OS`." This has not been done yet — which is correct since no file has been promoted. This must be actioned as the first step in the promotion implementation slice.

**Open question 4 from the proposal remains open:** Should the production header `<title>` read `"Pest Patrol"` or `"Pest Patrol OS"`? Codex should decide before the promotion slice. Claude recommends `"Pest Patrol"` for brevity in the accessible name, with `"Pest Patrol OS"` reserved for full product name contexts.

---

### 3. Editor metadata still present (correct state, flag for promotion)

All three files still contain:
- `xmlns:svg="http://www.w3.org/2000/svg"` (Inkscape namespace duplicate)
- `<defs id="defs10" />` (empty defs element)
- `standalone="no"` in the XML declaration

These are not rendering defects — they are file-size and portability artifacts. The codex-review Adopt note says "optimize production-destined SVGs before shipping and remove editor metadata where practical." This has not been done — which is correct since no file has shipped. The production promotion slice should include an SVGO pass.

Approximate size impact: current Logo 2 is ~12.4 KB. After SVGO with metadata stripping, expect ~4–5 KB. After path outlining, ~3 KB. For a web header asset, this is not blocking, but it is good hygiene before the first commit to a live surface.

---

## Outstanding open questions from the proposal

All five open questions remain unanswered by the codex-review. The most consequential for the next slice:

- **OQ 1 (dark-surface header variant):** Does any app header use a navy or dark background? Logo 2 on a navy background will ghost (navy fills merge with surface). The codex-review said to "treat dark-surface concerns as a real risk to test, not as approval to create new brand colors." No testing has happened yet because no wiring has happened. This test must occur during the promotion slice, not after it.
- **OQ 2 (mark-only asset):** No mark-only asset (red polygon + yellow star, no wordmark) exists for `<32px` contexts. Still deferred.
- **OQ 3 (logo in mobile route shell):** The mobile route shell currently has no logo. The question of whether Logo 2 belongs on the login screen only, or also in the signed-in header, is unresolved.

---

## README gap (acceptable, but surfaces before the next contributor arrives)

`packages/assets/brand/README.md` is minimal — it lists the three files and two conventions but provides no surface-assignment guidance, minimum-size table, dark-surface warning, or decorative-vs-meaningful usage note. The codex-review correctly deferred this. However, any contributor picking up the promotion slice without reading the proposal will have no guidance in the README.

**Recommendation:** The promotion implementation slice should also update `packages/assets/brand/README.md` with the surface-assignment table from the proposal, minimum-width values, and a one-line dark-surface caution. This is a documentation task, not a design one — appropriate for Codex to include in the promotion PR.

---

## Pre-promotion checklist

Before Logo 2 is wired into any live header surface, complete in this order:

1. Decide `<title>` value: `"Pest Patrol"` vs `"Pest Patrol OS"` (open question 4).
2. Update `<title>` in `pest-patrol-logo-2-compact-header.svg` to the decided value.
3. Remove all `aria-label` attributes from individual path elements in Logo 2 (6 total: 3× PEST, 3× PATROL).
4. Run Logo 2 through SVGO (strip editor metadata, preserve path geometry and `paint-order` declarations).
5. Test Logo 2 on both light and dark header backgrounds — confirm navy-on-navy ghosting behavior (open question 1).
6. Confirm minimum rendered width in the actual header container before committing.
7. Update `packages/assets/brand/README.md` with the surface-assignment table.
