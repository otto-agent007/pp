# Proposal: Brand Asset Intake Review

## Goal & non-goals

- **Goal:** Assess the three SVG logo candidates in `packages/assets/brand/` for brand-fit, surface suitability, legibility, and asset-pipeline compliance — so Codex can proceed with confidence about which variant to wire into each app surface and what to address before shipping any logo.
- **Non-goals:** Implementing logo wiring in app code. Choosing the delivery provider, modifying schema or RLS, Figma canvas writes, new token definitions outside the existing vocabulary, or deciding final file names and optimization approach (those belong to Codex).

---

## The three candidates — quick reference

| File | viewBox | Key transform | Role in the set |
|---|---|---|---|
| `pest-patrol-logo-1-reference-match.svg` | 420 × 250 | rotate(-4) skewX(-8) | Mid-weight canonical reference |
| `pest-patrol-logo-2-compact-header.svg` | 390 × 205 | rotate(-3) skewX(-7) | Smaller, lighter-stroke header variant |
| `pest-patrol-logo-3-sticker-badge.svg` | 440 × 270 | rotate(-5) skewX(-8) | Heaviest strokes, white outer border, maximum impact |

All three use the same fundamental design: italic bold wordmark, red `#E11D2E` **PEST** in a red polygon-shield, yellow `#facc15` **PATROL** in a navy `#071A3D` banner/ribbon, yellow star to the right. The triple-layer stroke technique (thick navy → white overlay → thin navy hairline, applied via `paint-order: stroke fill`) creates high contrast at large sizes and is the defining visual characteristic.

---

## Recommended role for each candidate

### Logo 1 — pest-patrol-logo-1-reference-match.svg: **Keep — canonical reference**

This is the "source of truth" for the brand mark proportions and stroke weights. It should be used wherever the logo needs to be seen at near-natural scale: documentation screenshots, `docs/` preview contexts, onboarding flows, and about/settings pages. At 90px PEST / 61px PATROL font size with the reference stroke weights, it reads correctly from 200px rendered width upward.

**Not recommended for:** application headers (too wide for a compact nav) or mobile route shell (too tall for a constrained header zone).

### Logo 2 — pest-patrol-logo-2-compact-header.svg: **Keep — preferred primary app header**

This is the right candidate for all header, navigation, and portal contexts. The stroke weights are proportionally reduced (16px vs 18px outer PEST stroke; 11px vs 13px PATROL stroke), the rotation is gentler (−3° vs −4°/−5°), and the overall canvas is 15% smaller. It still carries the full brand identity while fitting naturally into a ~40–52px tall header zone.

**Recommended as the primary logo for:**
- Web admin shell `<header>` / navigation
- Customer portal header and proof-of-service header stamp
- Expo mobile technician header (see minimum-size notes below)

### Logo 3 — pest-patrol-logo-3-sticker-badge.svg: **Keep — marketing/accent contexts only**

The thick white outer border on the red polygon (20px white + 12px navy) and the extra-heavy PEST stroke (22px) give this variant a sticker or badge press quality. It is not suitable for application headers — it is too heavy for small rendering — but it works well for:
- Empty, blocked, or setup states where a large brand mark provides orientation
- App store screenshots and marketing-adjacent documentation
- Print materials, physical stickers, or social media profile assets if they ever emerge
- Large-scale splash or loading screens where the white border treatment reads as intentional

**Not recommended for:** anything below ~280px rendered width, or any context where the mark must live quietly next to operational UI.

---

## Preferred primary logo for app headers

**Logo 2 (compact-header) is the primary logo.** The lighter strokes, gentler tilt, and smaller canvas make it the most versatile. It is the file Codex should wire into `apps/web` header and navigation first, and into `apps/mobile` when a branded header moment is needed.

Logo 1 (reference-match) should remain in `packages/assets/brand/` as the untouched canonical reference from which Logo 2 was derived. Do not use Logo 1 as the live app header file — the heavier strokes and larger canvas are appropriate for reference and documentation, not for pixel-dense UI.

---

## Guidance by surface

### Web admin shell header and navigation

Use **Logo 2**. Render at a height of ~36–44px inside the header zone. At this scale the triple-stroke technique on PEST and PATROL will remain legible because the navy outer stroke (16px in SVG space at 390px wide) scales proportionally. On a white or light-gray header, the full color palette reads correctly. On a navy or dark header background, the white stroke layers will provide contrast — but Codex should verify in a real render: the navy fill of the banner and the navy outer stroke of PEST will visually merge with a navy background. A white-outlined version (inverting the dark strokes to white) may be worth commissioning as a follow-up dark-surface variant.

### Customer portal header and proof-of-service views

Use **Logo 2**. Customer-facing context calls for the quieter variant. The bold red/yellow palette communicates professional pest-control branding without being aggressive. Logo 2's gentler rotation (−3°) reads as dynamic but not off-putting in a customer-facing context. Keep it top-left in the portal header, not centered — centered placement emphasizes the wordmark over the customer's service content.

For proof-of-service PDF or print views, Logo 1 (reference-match) is acceptable as a watermark or header stamp at ~180px rendered width or larger.

### Expo mobile technician route shell

Use **Logo 2** if a logo is used at all in the mobile header. However, the current `MobileTechnicianHeader` already uses the `"Technician"` eyebrow label and a large status headline — adding a full wordmark logo may compete for attention in an operational context where the technician needs to read route status quickly. Consider using Logo 2 only on the **login screen** (where branding matters for orientation) and keeping the route shell header text-only.

If Logo 2 is rendered in a compact mobile header at, say, 28px tall, the PEST/PATROL text will be approximately 5–6px tall within the SVG — approaching collapse. **Minimum recommended rendered height for Logo 2 is 32px.** Below that, switch to a mark-only asset (see follow-up ideas).

### Empty, blocked, or setup states

Use **Logo 3** (sticker-badge) as a large decorative background mark, `aria-hidden="true"` since the surrounding content provides context. Render at ≥240px width so the thick stroke treatment reads as intentional rather than pixelated. Use low opacity (15–25%) when layered behind functional content so it does not compete with the state message.

Logo 1 also works here at full opacity as a centered orientation mark when the state is purely informational (e.g., the first-run setup flow before any data exists).

### Documentation and preview-smoke screenshots

Use **Logo 1** (reference-match) at natural scale (~420px wide / 250px tall or proportionally reduced to ~280px wide). It is the most detailed and authoritative representation of the brand mark. Keep it in `docs/` screenshot assets; do not promote it to production app code.

---

## Legibility, contrast, and minimum-size notes

### Contrast on light surfaces (white, cream, light-gray)

All three logos work correctly on `#FFFFFF` and `#F9FAFB`-equivalent backgrounds. The navy outer stroke of the wordmark provides strong separation. The red PEST on white has an approximate contrast ratio of 4.5:1 — borderline WCAG AA for large text (≥18pt / 24px), which the logotype easily meets at header scale. At very small sizes this margin is too thin; see minimum-size guidance below.

### Contrast on dark surfaces (navy `#071A3D`, `background.inverse` token)

All three logos contain navy `#071A3D` fills and strokes. On a dark navy background, the PATROL banner fill merges with the surface, and the navy outer strokes on PEST become invisible. The white intermediate strokes remain visible, creating a ghost outline effect. This may be intentional for some surfaces (the route shell uses `rail` as the dark background for the timeline summary card), but for a header the logo should feel present, not ghosted. **Codex should test Logo 2 on the dark header variant before wiring.** A future white/light-on-dark logo variant is the correct solution (see follow-up ideas).

### High-contrast field use (sunlight, outdoor mobile)

The red/yellow/navy/white color set is excellent for field conditions. High saturation and strong value contrast between navy and yellow are both visible under direct sunlight. The triple-stroke technique adds separation that helps in washed-out conditions. Logo 2 will perform well on the mobile screen in field use as long as it is rendered at or above the 32px minimum height.

### Minimum-size guidance

| Variant | Minimum rendered width | Notes |
|---|---|---|
| Logo 1 (reference-match) | 200px | Below this, PATROL letter detail begins to merge |
| Logo 2 (compact-header) | 140px | Designed for compressed use; triple-stroke remains legible to this point |
| Logo 3 (sticker-badge) | 240px | Heavy strokes need space; below this the white border dominates |

Below minimums, a standalone mark asset (red polygon + yellow star, no wordmark) would be appropriate — this does not yet exist in `packages/assets/brand/` and is flagged in follow-up ideas.

### Cropping and padding

All three logos apply a group-level `transform` (rotate + skewX) that shifts the visual content relative to the viewBox origin. The visual bounding box of each logo is inset from the viewBox edges by approximately 15–20px on each side due to the translate offset. This means:
- There is implicit padding already in the SVG canvas.
- If Codex renders the SVG at `width="100%"` inside a constrained container, the visual content will appear smaller than the container because of this inset. Use `preserveAspectRatio="xMidYMid meet"` or explicit pixel dimensions to control this.
- If cropping to the visible mark only (e.g., for a `favicon` or `apple-touch-icon`), the inset needs to be accounted for when trimming viewBox coordinates.

---

## Accessible label guidance

### When the logo is meaningful (header, portal stamp, login screen)

Keep the existing `role="img"`, `aria-labelledby="title desc"`, `<title>`, and `<desc>` structure on the `<svg>` root. Current values are:

| File | `<title>` | `<desc>` |
|---|---|---|
| Logo 1 | `"Pest Patrol logo - reference match"` | `"Bold angled Pest Patrol wordmark with red PEST, yellow PATROL, navy outline, and yellow star."` |
| Logo 2 | `"Pest Patrol logo - compact header"` | `"Compact Pest Patrol wordmark for app headers and navigation."` |
| Logo 3 | `"Pest Patrol logo - sticker badge"` | `"High-impact Pest Patrol sticker-style wordmark with thick navy and white border."` |

For production header use, the `<title>` should become simply `"Pest Patrol"` — the reference-match / compact-header / sticker-badge suffixes describe the asset variant, not the brand mark itself. Codex should update the `<title>` of whichever file is promoted to a live header to read `"Pest Patrol"` so screen readers announce the brand name, not the file variant.

The individual `aria-label="PEST"` and `aria-label="PATROL"` on the text path groups are redundant when the root SVG already has a complete description via `aria-labelledby`. These individual path labels will be read as separate images by some assistive technology. Codex should remove the `aria-label` attributes from individual text path groups in the production version (keeping them only on the root SVG structure) to avoid double-announcement.

### When the logo is decorative (empty states, background watermark)

Add `aria-hidden="true"` to the `<svg>` element and remove `role="img"` and `aria-labelledby`. The surrounding content should provide all necessary context for the state the user is in. This is already correct behavior per `docs/ASSET_PIPELINE.md`: "Mark decorative images as decorative in the rendering layer."

---

## Asset-pipeline concerns

### Editor metadata in current files

All three SVGs contain Inkscape namespace declarations (`xmlns:svg="http://www.w3.org/2000/svg"`) and an empty `<defs id="defs10" />` element, plus `standalone="no"` in the XML declaration. These are editor artifacts that should be stripped before committing to production. `docs/ASSET_PIPELINE.md` states: "Optimize SVGs before commit and remove editor metadata." Codex should run the production-destined file through an optimizer (e.g., SVGO) before wiring.

### Triple-path repetition

Each text group (PEST and PATROL) is rendered as **three identical `<path>` elements** with different stroke widths — one for the outer navy stroke, one for the white intermediate, one for the inner hairline. This achieves the layered stroke effect using `paint-order: stroke fill` on each layer. The file size cost is approximately 3× the minimum for the same visual result. 

For production use, consider whether this complexity is acceptable in the shipped asset, or whether Codex should commission a flattened/outlined version where the stroke layers are expanded to fills. Outlined fills are slightly smaller as SVG files, render identically in all environments (no font dependency), and are more portable. However, the current approach works and should not block wiring — it is an optimization note, not a blocker.

### Font dependency

All three logos reference `font-family:'Inter Display'` in the text path styles. However, the text paths are already converted to `<path>` `d` attribute coordinates (the actual letterform geometry is embedded as path data, not live text). The `font-family` style attribute is a retained annotation from the authoring tool and has no effect on rendering — the glyphs are fully outlined. This is correct and means the logo renders identically in all environments without a font load. Codex does not need to load Inter Display for these assets to render.

### Filename convention

All three filenames are descriptive, lowercase, and hyphenated — correct per `docs/ASSET_PIPELINE.md`. The `brand/` bucket placement is appropriate. No changes needed to the naming convention.

### `packages/assets/brand/README.md`

The current README lists the three files but provides no guidance on which variant to use where. Recommend Codex (or a future relay) updates the README with a surface-assignment table once the wiring decisions are finalized. This is a documentation gap, not a blocker.

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No schema changes** | Asset intake review only — no DB, RLS, or migration work. | ✅ |
| **No new brand colors** | All colors in the logos (`#E11D2E`, `#071A3D`, `#FFFFFF`, `#facc15`) map to existing token families (red, navy, white, yellow). No new palette values introduced. | ✅ |
| **No Figma writes** | No Figma work proposed. | ✅ |
| **No app wiring** | Claude is not asking Codex to wire any asset into app code in this relay. | ✅ |
| **Asset pipeline compliance** | Three optimization notes flagged (editor metadata, triple-path repetition, accessible title wording) — none are blockers for a first wire, all should be addressed before production ship. | ✅ (with notes) |
| **Accessible labels** | Existing `<title>`, `<desc>`, `role="img"`, `aria-labelledby` are present. Two refinements flagged: update `<title>` for production variant; remove redundant individual path `aria-label` attributes. | ✅ (with notes) |

---

## Open questions for Codex

1. **Dark-surface header variant.** Do any of the app headers use a navy or dark background? If so, Logo 2 as-is will partially ghost against the surface (navy fills merge with navy background). Should Codex commission a white/light variant of Logo 2 now, or defer until the header design is finalized?

2. **Mark-only asset.** Is a standalone mark (red polygon + yellow star, no wordmark) needed for compact spaces like `<32px tall headers, favicons, or app icons? Claude recommends commissioning one, but it doesn't exist yet. Should this be in scope for the next slice?

3. **Logo in mobile route shell.** The current `MobileTechnicianHeader` has no logo — it uses the "Technician" eyebrow + status headline. Should Logo 2 appear on the login screen only, or also in the signed-in route header? If the header, how does it coexist with the technician status headline?

4. **`<title>` text for production.** Which exact string should the `<title>` element contain for the production header file? Claude recommends `"Pest Patrol"` — does Codex agree, or should it include the product suffix `"Pest Patrol OS"`?

5. **Optimization target.** Is there a file-size budget for the branded asset package? The reference-match SVG is approximately 9.5 KB with editor artifacts. After SVGO optimization with metadata stripping, expect ~4–5 KB. With path outlining (fills-only), ~3 KB. For a web header asset this is fine either way; for mobile it is negligible.

---

## Follow-up ideas (out of scope for this intake)

- **White/light-on-dark variant of Logo 2** — needed for dark header surfaces. Would invert the navy shapes to white/cream and adjust the stroke layers accordingly. Should follow from the header design decision (open question 1).
- **Mark-only asset** — a standalone red polygon + yellow star icon at square aspect ratio for favicons, app icons, and sub-32px compact contexts. Does not exist yet in `packages/assets/brand/`.
- **Outlined/flattened production export** — a fully outlined (strokes expanded to fills, no `font-family` attributes, no editor metadata) version of Logo 2 for the highest compatibility and smallest file size. Claude recommends this before the first production ship.
- **Customer portal tone variant** — a softer or monochrome version of Logo 2 for contexts where the full red/yellow/navy palette may feel too aggressive (e.g., a proof-of-service document sent to a cautious customer). Out of scope until customer portal design is further along.
- **Logo usage guidelines in `packages/assets/brand/README.md`** — surface assignment table, minimum sizes, dark-surface guidance, and decorative vs. meaningful usage notes. Low effort, high value for future contributors.
