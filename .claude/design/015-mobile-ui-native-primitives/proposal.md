# Proposal: Mobile UI Native Primitives (`@pest-patrol/ui-native`)

## Goal and non-goals

**Goal:** Define the API, token mapping, touch-target conventions, and state
coverage for a new `packages/ui-native` package that gives the mobile
technician app the same shared primitive vocabulary the web admin shell already
has.

**Non-goals:** Redesigning any existing mobile screen. Replacing
`routeShellStyles.ts` wholesale. Adding any dependency beyond `react-native`,
`react`, and `@pest-patrol/ui-tokens`. No hooks, stores, domain logic, or
network access in the package.

---

## Package setup

```
packages/ui-native/
  index.tsx          — all six component exports
  package.json       — name: @pest-patrol/ui-native
                       peerDependencies: react, react-native
                       dependencies: @pest-patrol/ui-tokens
```

The package does not depend on `@pest-patrol/ui`. The two packages share only
`@pest-patrol/ui-tokens` — the token layer is the bridge, not a component
dependency. This keeps the web bundle free of React Native and the mobile
bundle free of Tailwind.

---

## Shared conventions

### Touch targets

All interactive components (`Button`) must have `minHeight: 44`. This matches
the iOS HIG and Android Material minimum (48 dp) rounding down to the iOS
floor. The existing `mobileRouteShellStyles.control` already uses `minHeight:
44` — the `Button` component codifies this as a non-negotiable.

### Token source

All color, spacing, radius, and typography values come from
`@pest-patrol/ui-tokens`. No hardcoded hex values anywhere in the package.
The pattern established in `routeShellStyles.ts` is the model to follow.

### Pressed state

React Native's `Pressable` provides an `onPress` callback and an
`onPressIn`/`onPressOut` pair for visual feedback. Recommended pattern:

```tsx
<Pressable
  style={({ pressed }) => [
    baseStyle,
    pressed && pressedStyle,
    disabled && disabledStyle,
  ]}
  onPress={onPress}
  disabled={disabled}
>
```

This avoids a separate `useState` for pressed tracking and is consistent with
the existing `Pressable` usage in `MobileTechnicianHeader`.

### Disabled state

`opacity: 0.5` on the root element. Same as the web `disabled:opacity-50`
token. Use `pointerEvents: "none"` in addition to `disabled={true}` on
`Pressable` for redundancy — `disabled` alone does not always suppress
gestures on Android.

---

## 1. Button

The most-used interactive primitive. Replaces the inline `Pressable` +
`mobileRouteShellStyles.control` pattern in `MobileTechnicianHeader` and the
inline `primaryButton` / `secondaryButton` styles in
`mobileCaptureControlStyles`.

### Prop signature

```tsx
type NativeButtonVariant = "primary" | "ghost" | "danger" | "subtle";
type NativeButtonSize = "lg" | "md" | "sm";

interface NativeButtonProps {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  size?: NativeButtonSize;    // default: "md"
  variant?: NativeButtonVariant; // default: "primary"
}
```

`SearchableSelect` has no React Native equivalent; `buttonClassName` has no
use on mobile. Neither is exported from this package.

### Variant token mapping

| Variant | Background | Border | Text color | Pressed overlay |
|---|---|---|---|---|
| `primary` | `lightTheme.background.inverse` (navy) | `transparent` | `lightTheme.text.inverse` | darken 8% (opacity overlay) |
| `ghost` | `transparent` | `lightTheme.border.default` | `lightTheme.text.primary` | `lightTheme.background.subtle` |
| `danger` | `lightTheme.action.danger` | `transparent` | `lightTheme.text.inverse` | darken 8% |
| `subtle` | `lightTheme.background.subtle` | `lightTheme.border.subtle` | `lightTheme.text.primary` | `lightTheme.background.surface` |

`primary` maps to `mobileRouteShellStyles.control` + navy background — the
existing primary action pattern. `ghost` maps to the Language/Sign Out buttons
in `MobileTechnicianHeader`. `danger` is new on mobile but matches the web
pattern used in archive actions.

### Size token mapping

| Size | `minHeight` | `paddingHorizontal` | `fontSize` | `fontWeight` |
|---|---|---|---|---|
| `lg` | 48 | `spacing[5]` | `fontSize.base` | `fontWeight.bold` |
| `md` | 44 | `spacing[4]` | `fontSize.sm` | `fontWeight.bold` |
| `sm` | 36 | `spacing[3]` | `fontSize.xs` | `fontWeight.bold` |

`md` matches the existing `minHeight: 44` floor in `mobileRouteShellStyles`.

### `fullWidth`

When `true`: `alignSelf: "stretch"` on the `Pressable`. When `false` (default):
`alignSelf: "flex-start"` so the button shrinks to its content width.

### States

- Default: variant colors as above.
- Pressed: overlay `rgba(0,0,0,0.06)` on primary/danger; `backgroundColor:
  lightTheme.background.subtle` on ghost; `backgroundColor:
  lightTheme.background.surface` on subtle.
- Disabled: `opacity: 0.5`, `pointerEvents: "none"`, `disabled={true}`.
- Loading: out of scope for this slice. The capture controls handle their own
  pending state via disabled + copy change.

---

## 2. Card

The shared surface container. Already implicit in
`mobileRouteShellStyles.card` and `compactCard` — this makes it a proper
component so consumers do not need to spread style objects manually.

### Prop signature

```tsx
type NativeCardPadding = "lg" | "md" | "sm" | "none";
type NativeCardTone = "surface" | "subtle";

interface NativeCardProps {
  children: ReactNode;
  padding?: NativeCardPadding;  // default: "md"
  tone?: NativeCardTone;        // default: "surface"
  style?: StyleProp<ViewStyle>;
}
```

### Padding token mapping

| Padding | Value |
|---|---|
| `lg` | `spacing[4]` (16) |
| `md` | `spacing[3]` (12) |
| `sm` | `spacing[2]` (8) |
| `none` | `0` |

Matches `mobileRouteShellStyles.card` (`spacing[4]`) and `compactCard`
(`spacing[3]`).

### Tone token mapping

| Tone | Background | Border |
|---|---|---|
| `surface` | `lightTheme.background.surface` | `lightTheme.border.subtle` |
| `subtle` | `lightTheme.background.subtle` | `lightTheme.border.subtle` |

`borderRadius: radius.md`, `borderWidth: 1` always.

A `style` prop passthrough is required so callers can apply tone-override
classes (e.g., compliance warning strips) without forking the component. This
mirrors the web `Card`'s `className` passthrough.

---

## 3. Eyebrow

The section-label / accent-label component. Already used inline throughout
the mobile app as `mobileRouteShellStyles.label`. Making it a component
enforces tone consistency.

### Prop signature

```tsx
type NativeEyebrowTone = "accent" | "muted" | "danger" | "inverse";

interface NativeEyebrowProps {
  children: string;
  tone?: NativeEyebrowTone; // default: "accent"
  style?: StyleProp<TextStyle>;
}
```

### Tone token mapping

| Tone | Color |
|---|---|
| `accent` | `lightTheme.status.enRoute` (existing `accentText`) |
| `muted` | `lightTheme.text.muted` |
| `danger` | `status.sync.failed.solid` (existing `signalDanger`) |
| `inverse` | `lightTheme.text.inverse` |

Typography: `fontSize: fontSize.xs`, `fontWeight: fontWeight.bold`,
`textTransform: "uppercase"`, `letterSpacing: 0.5`.

This matches `mobileRouteShellStyles.label` exactly for `accent`. The other
tones extend the vocabulary for compliance strips and dark-surface contexts.

---

## 4. StatusPill

The most impactful primitive to share. `AssignedJobCard` defines its own inline
status pill; `JobStatusControls` has inline status labels; capture controls
have inline tone-coded text. A shared `StatusPill` unifies all of these.

### Prop signature

```tsx
type NativeStatusPillTone = "success" | "warning" | "danger" | "info" | "neutral";

interface NativeStatusPillProps {
  children: string;
  dot?: boolean;             // default: true — leading tone dot
  tone?: NativeStatusPillTone; // default: "neutral"
}
```

Mirrors the web `StatusPill` API exactly.

### Tone token mapping

| Tone | Background | Border | Text | Dot |
|---|---|---|---|---|
| `success` | `status.alert.success.bg` | `status.alert.success.border` | `status.alert.success.fgStrong` | `status.sync.synced.solid` |
| `warning` | `status.alert.warning.bg` | `status.alert.warning.border` | `status.alert.warning.fgStrong` | `status.sync.retrying.solid` |
| `danger` | `status.alert.danger.bg` | `status.alert.danger.border` | `status.alert.danger.fgStrong` | `status.sync.failed.solid` |
| `info` | `status.alert.info.bg` | `status.alert.info.border` | `status.alert.info.fgStrong` | `lightTheme.status.enRoute` |
| `neutral` | `status.alert.neutral.bg` | `status.alert.neutral.border` | `status.alert.neutral.fgStrong` | `status.alert.neutral.solid` |

Layout: `flexDirection: "row"`, `alignItems: "center"`, `gap: spacing[1]`,
`paddingHorizontal: spacing[2]` (8), `paddingVertical: 4`, `borderRadius: 999`,
`borderWidth: 1`.

Dot: `View` with `width: 6, height: 6, borderRadius: 999`. When `dot={false}`,
omit the dot element entirely — no reserved space.

Typography: `fontSize: fontSize.xs` (12), `fontWeight: fontWeight.bold`.

### Migration: AssignedJobCard

The existing inline pill in `AssignedJobCard`:
```tsx
<View style={styles.statusPill}>
  <Text style={styles.statusText}>{statusLabel}</Text>
</View>
```

Becomes:
```tsx
<StatusPill tone={statusTone}>{statusLabel}</StatusPill>
```

This requires `AssignedJobCard` to accept a `statusTone: NativeStatusPillTone`
prop alongside (or replacing) `statusLabel`. The tone mapping lives in the
caller (`MobileJobFieldFlow` or `MobileHomeScreen`) where the job status is
known — correct placement per the domain-layer boundary.

---

## 5. StatTile

Counter display for dashboard-style summaries. Not yet used in mobile — the
route timeline uses `MobileRouteTimeline`'s dark rail card for counts. But
future dispatch or admin-facing mobile screens will need it, and it is trivial
to add now while the package is being created.

### Prop signature

```tsx
type NativeStatTileTone = "success" | "warning" | "danger" | "info" | "neutral";

interface NativeStatTileProps {
  detail?: string;
  label: string;
  tone?: NativeStatTileTone; // default: "neutral"
  value: number | string;
}
```

### Layout

```
┌─────────────────────┐
│ VALUE               │  fontSize.xl (24), fontWeight.extrabold, tone color
│ label               │  fontSize.xs, fontWeight.bold, mutedText, uppercase
│ detail (optional)   │  fontSize.xs, secondaryText
└─────────────────────┘
```

`backgroundColor: lightTheme.background.surface`, `borderRadius: radius.md`,
`borderWidth: 1`, `borderColor: lightTheme.border.subtle`, `padding: spacing[3]`.

Value tone color: same solid token as `StatusPill`'s dot for the corresponding
tone. Neutral → `lightTheme.text.primary`.

---

## 6. Avatar

Initials-based identity indicator. Used by `MobileTechnicianHeader`
conceptually (the technician identity line) and will be needed when a
multi-technician dispatch view is added to mobile.

### Prop signature

```tsx
type NativeAvatarSize = "lg" | "md" | "sm";

interface NativeAvatarProps {
  name: string;
  size?: NativeAvatarSize; // default: "md"
}
```

### Size mapping

| Size | Outer dimension | `fontSize` | `fontWeight` |
|---|---|---|---|
| `lg` | 40 × 40 | `fontSize.base` | `fontWeight.bold` |
| `md` | 32 × 32 | `fontSize.sm` | `fontWeight.bold` |
| `sm` | 24 × 24 | `fontSize.xs` | `fontWeight.bold` |

### Color palette

Five backgrounds derived from `name`, using a character-code hash rather
than `name.length % 5` (fixes the collision nit from the 013 critique that
applies equally to the web Avatar):

```ts
function avatarIndex(name: string) {
  return [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
}
```

Five palette entries drawn from `@pest-patrol/ui-tokens` semantic primitives:

| Index | Background | Text |
|---|---|---|
| 0 | `primitive.sky.200` | `primitive.sky.800` |
| 1 | `primitive.navy.200` | `primitive.navy.800` |
| 2 | `primitive.green.200` | `primitive.green.800` |
| 3 | `primitive.yellow.200` | `primitive.yellow.800` |
| 4 | `primitive.red.200` | `primitive.red.800` |

This matches the five semantic families in the brand palette (sky, navy,
green, yellow, red), which are already in `@pest-patrol/ui-tokens`.

Initials: first letter of first word + first letter of last word (if present),
uppercase. Single-word name → first two letters. Empty name → `"?"`.

Layout: `borderRadius: 999` (circle), `alignItems: "center"`,
`justifyContent: "center"`.

---

## Migration plan

### Phase 1: package creation (this slice)

- Create `packages/ui-native/` with `package.json` and `index.tsx`.
- Implement all six components.
- Add tests for each component's tone variants and states (render smoke tests +
  prop contract tests, consistent with `packages/ui`'s test pattern).

### Phase 2: targeted migration (same slice, after package is green)

Two specific migration targets:

**`AssignedJobCard` status pill:**
- Accept `statusTone: NativeStatusPillTone` prop.
- Replace inline `statusPill` / `statusText` StyleSheet entries with
  `<StatusPill tone={statusTone}>`.
- Update `MobileJobFieldFlow` (or wherever `AssignedJobCard` is rendered) to
  pass the tone derived from job status.

**`MobileTechnicianHeader` control buttons:**
- Replace the inline Language toggle `Pressable` + `mobileRouteShellStyles.control`
  with `<Button variant="ghost" size="sm">`.
- Replace the Sign Out `Pressable` similarly.
- Remove the now-unused `control`-spread style entries from these two elements
  (keep `mobileRouteShellStyles.control` in `routeShellStyles.ts` — other
  capture controls still use it).

No other components are migrated in this slice. `routeShellStyles.ts` stays
in place.

---

## State matrix

| Component | State | Treatment |
|---|---|---|
| `Button` | Default | Variant colors |
| `Button` | Pressed | Overlay or bg shift (see variant table) |
| `Button` | Disabled | `opacity: 0.5`, non-interactive |
| `Button` | Full-width | `alignSelf: "stretch"` |
| `Card` | Surface tone | `lightTheme.background.surface` |
| `Card` | Subtle tone | `lightTheme.background.subtle` |
| `StatusPill` | Each of 5 tones | Token-mapped bg/border/fg |
| `StatusPill` | `dot={false}` | Pill without leading dot |
| `StatTile` | Each of 5 tones | Tone-colored value text |
| `StatTile` | With detail | Three-line layout |
| `StatTile` | Without detail | Two-line layout |
| `Avatar` | Each of 5 palette indices | Hash-derived background + initials |
| `Avatar` | Each of 3 sizes | Scaled correctly |
| `Eyebrow` | Each of 4 tones | Token-mapped text color |

---

## AGENTS conformance self-check

| Concern | Status |
|---|---|
| No Supabase from UI | ✅ — package is presentation-only, no hooks or API client |
| No schema changes | ✅ — no DB fields involved |
| No new domain logic | ✅ — token + style definitions only |
| Mobile offline-safe | ✅ — no network calls, purely visual |
| No map SDKs | ✅ — not touched |
| Shared package boundary | ✅ — `@pest-patrol/ui-native` depends only on `@pest-patrol/ui-tokens` and peer `react-native` |
| No production mutations | ✅ — UI only |
| No migrations | ✅ |

---

## Open questions for Codex

1. **`NativeStatusPillTone` re-export.** Should `@pest-patrol/ui-native` re-export
   `StatusPillTone` under the same name as the web package, or use a distinct
   `NativeStatusPillTone` type? Re-using the same name (from a shared types
   package, or just matching the string union) avoids a proliferation of
   near-identical type names. If `@pest-patrol/types` is the right home for
   shared tone unions, this is the moment to move them there.

2. **`routeShellStyles.ts` long-term.** This slice keeps `routeShellStyles.ts`
   in place. As more primitives migrate to `@pest-patrol/ui-native`, the
   `mobileCaptureControlStyles` block will shrink. Codex should decide at what
   point it makes sense to inline the remaining styles into their consuming
   components and delete `routeShellStyles.ts`. That is a future-slice decision,
   not this one.

3. **`primitive.*` token access.** The `Avatar` palette references
   `primitive.sky.200`, `primitive.navy.200`, etc. from `@pest-patrol/ui-tokens`.
   Codex should confirm these paths exist in the token package's exports before
   implementing — or substitute with the nearest `lightTheme.*` equivalents if
   `primitive.*` is not directly exported.

4. **Test runner for `packages/ui-native`.** The web `@pest-patrol/ui` uses
   Vitest. The mobile app likely uses Jest (Expo default). Codex should choose
   the test runner for `ui-native` consistent with the monorepo's existing
   configuration for native packages.

---

## Follow-up ideas (out of scope for this slice)

- **`SearchableSelect` native equivalent.** A mobile combobox using `TextInput`
  + `FlatList` or `Modal`-based picker. Deferred — no current mobile screen
  needs it.
- **Dark mode / night palette.** `@pest-patrol/ui-native` could accept a `theme`
  prop or consume a context value for dark/light switching. Deferred until the
  dark palette is defined.
- **Offline badge primitive.** A small persistent indicator for connectivity
  state. A natural `@pest-patrol/ui-native` candidate once the route shell's
  offline affordance is designed.
- **Migrate remaining capture controls.** `JobStatusControls`,
  `JobChemicalLogForm`, `JobPhotoUploadForm`, `JobSignatureCaptureForm`,
  `JobTreatmentForm` all have inline `mobileCaptureControlStyles` references
  that could eventually migrate to `Button` + `Card` + `StatusPill`. Each
  control is a separate migration slice.
- **Multilingual `Eyebrow` / `StatusPill` copy.** The `i18n` package could
  drive tonal label strings for the Spanish toggle path.
