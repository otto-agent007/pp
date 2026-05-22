# Claude Critique: Mobile UI Native Primitives

## Overview

`@pest-patrol/ui-native` ships cleanly. The six primitives are implemented, token-driven, and wired to the two approved migration proof points. Several of the implementation details diverge from the proposal in ways that improve on it. The test suite covers the required surface but leaves a few sizing paths unexercised. Notes below are in priority order.

---

## 1. Button `sm` touch target: Codex correctly overrode the proposal

The proposal specified 36px for `sm` sizing. Codex kept all three sizes at `minHeight: 44`. This was the right call — the codex-review flagged it explicitly, and 44px is the Apple HIG / WCAG minimum for interactive targets on mobile. The critique endorses the override. Any future `sm` consumer should be aware that "small" means narrower horizontal padding, not a smaller touch area.

**No action needed.** Worth preserving in the package's sizing table if a doc comment or SKILL.md note is added later.

---

## 2. `StatTile` detail-line not tested for the absent case

The `StatTile` test renders with `detail="2 stops need sync"`. The component accepts `detail` as optional, and when omitted the detail `Text` should not render. That path — a tile with value and label only — is not covered. It's a small conditional, but given the codex-review risk list ("stat-tile detail"), the absence is worth noting.

**Recommended addition:** a second `StatTile` assertion that verifies `collectText` does not include a detail string when `detail` is omitted.

---

## 3. Button and Avatar size variants not individually exercised

The Button test uses `size="md"` only. The Avatar test uses `size="lg"` only. The `sm` and `md` avatar sizes and the `sm` and `lg` button sizes are not covered by assertions. Given that Button `sm` received a deliberate review note about touch targets, the absence of a size assertion for `sm` means the corrected `minHeight: 44` is not under test.

**Recommended addition:**

- One assertion confirming `size="sm"` Pressable has `minHeight: 44` (documents the override).
- One assertion for `size="lg"` confirming the `lg` min-height resolves to 48.
- One assertion for Avatar `size="sm"` confirming dimensions resolve to the `sm` token values.

These don't require new `it` blocks — they can be assertions inside the existing button and avatar tests.

---

## 4. Avatar palette uses `primitive.slate[200]` where proposal used `primitive.navy[200]`

The second palette slot is `{ backgroundColor: primitive.slate[200], color: primitive.navy[800] }` in the implementation versus `primitive.navy[200]` in the proposal. Both are within the permitted primitive families. `slate[200]` is a cooler neutral that provides better contrast against `navy[800]` text, so the substitution is defensible. It is worth recording so future palette extensions stay consistent.

**No action for this slice.** If the palette grows beyond five entries, confirm new entries follow the same reasoning rather than mixing aesthetic choices with accessibility-neutral changes.

---

## 5. `StatTile` value color reuses `statusPillToneStyles` — confirm intent

The StatTile value `Text` reads its color from `statusPillToneStyles[tone].value`, which also powers the `StatusPill` text. This unifies tone vocabulary across the two primitives and avoids a second token-mapping table. It is a sensible shortcut for V1, but it couples StatTile color choices to the pill color choices permanently unless the shared map is extracted. If a future StatTile tone diverges from StatusPill (e.g., a muted value on an info tile), that will require a separate tone map.

**No action for this slice.** Note the coupling in the next design relay when either primitive's tones are extended.

---

## 6. MobileTechnicianHeader uses inline style objects; AssignedJobCard uses StyleSheet.create

`AssignedJobCard` calls `StyleSheet.create()`, consistent with the rest of the mobile app. `MobileTechnicianHeader` uses inline style objects for all remaining layout and typography after the migration. This is not a regression introduced by the slice — the header already used this pattern before 015, and the migration correctly touched only the Language and Sign Out buttons. The divergence is worth flagging so a future cleanup pass normalises the file.

**Out of scope for 015.** Defer to a later mobile polish slice.

---

## 7. Monorepo wiring should be confirmed by gate runs, not source-file review

`packages/ui-native/package.json` is correctly structured: only `@pest-patrol/ui-tokens` as a runtime dependency, React and React Native as peer dependencies, Vitest as the test runner. The peer-dependency arrangement ensures web bundles cannot accidentally pull in React Native through `@pest-patrol/ui-native`.

However, `turbo.json`, the root `tsconfig`, and `apps/mobile/package.json` wiring were not reviewed in this critique. The codex-review calls out those four files explicitly. Before the slice is closed, the implementation recommendation asks for a full gate run (`pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` across the monorepo). That run is the reliable signal — source-file inspection alone is insufficient for catching missing `turbo.json` pipeline entries or TypeScript project-reference gaps.

**Required before close:** full repo gate run as specified in `docs/AGENTS.md`.

---

## 8. What the implementation gets right

- All six primitives are present and token-driven. No raw color values appear in the implementation.
- `routeShellStyles.ts` is untouched in both migrated components. Palette references in `AssignedJobCard` and `MobileTechnicianHeader` are still drawn from `mobileRouteShellPalette` for everything outside the migrated primitives.
- The `statusTone` prop on `AssignedJobCard` defaults to `"info"` and delegates tone derivation entirely to the call site. The component itself imports no job types.
- `MobileTechnicianHeader` migrated Language and Sign Out only. The readiness panel, route-focus card, and `SyncStatusIndicator` are untouched.
- `radius.pill` is used for Avatar's `borderRadius` instead of the hardcoded `999` in the proposal — correct token discipline.
- `fontVariant: ["tabular-nums"]` on `StatTile` values is a Codex addition not in the proposal. It prevents layout shift when numeric values change. Keep it.
- The Avatar hash function uses the proposal's `[...name].reduce` spread with `(h*31+c.charCodeAt(0))|0` and `Math.abs()` to avoid negative modulo. Correctly implemented.
