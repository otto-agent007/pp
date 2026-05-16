# @pest-patrol/ui-tokens

Single source of truth for design tokens shared between the Next.js web app and the Expo mobile app.

## Why this exists

Before this package, the web app held five brand colors in `tailwind.config.ts` and the mobile app had no token layer at all - 119 hardcoded hex literals duplicated across nine components. This package centralizes that vocabulary so both surfaces stay visually consistent without coordination.

## What's exported

| Module          | Export                                                | Notes                                                                 |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `colors.ts`     | `primitive`, `palette`, `brand`, `colors`              | Pest Patrol primitives; `palette` aliases `primitive`                 |
| `themes.ts`     | `lightTheme`, `darkTheme`, `customerTheme`, `semantic`, `figmaColorVariables` | Role-named background, border, text, action, status, and Figma variable paths |
| `status.ts`     | `status`                                              | Visual status colors only; no workflow or label behavior              |
| `motion.ts`     | `duration`, `easing`, `motion`                        | Numeric durations and CSS easing curves                               |
| `spacing.ts`    | `spacing`                                             | 4px-base scale matching Tailwind defaults; values are numbers (RN-friendly) |
| `radius.ts`     | `radius`                                              | `none`, `sm`, `md`, `lg`, `xl`, `pill`                                |
| `typography.ts` | `fontSize`, `lineHeight`, `fontWeight`, `fontFamily`  | Numeric sizes (RN-friendly); `fontWeight` values are strings          |
| `shadows.ts`    | `shadow`                                              | Each token has `web` (CSS string) and `native` (RN style object)      |

## Usage

### Web - Tailwind config

`apps/web/tailwind.config.ts` consumes the tokens via `theme.extend`:

```ts
import { brand, darkTheme, lightTheme, primitive, spacing, radius, fontSize, fontFamily } from "@pest-patrol/ui-tokens";

export default {
  theme: {
    extend: {
      colors: {
        primitive,
        ...brand,
        theme: lightTheme,
        semantic: {
          light: lightTheme,
          dark: darkTheme,
          status: {
            "en-route": lightTheme.status.enRoute,
            "in-progress": lightTheme.status.inProgress,
          },
        },
      },
      spacing,
      borderRadius: radius,
      fontSize,
      fontFamily: { sans: [fontFamily.sans] },
    },
  },
};
```

Then in components:

```tsx
<button className="bg-semantic-light-action-primary text-semantic-light-text-inverse rounded-md px-4 py-2">
  Save
</button>
```

### Mobile - React Native styles

```tsx
import { lightTheme, spacing, radius, fontSize, fontWeight } from "@pest-patrol/ui-tokens";

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTheme.background.surface,
    borderColor: lightTheme.border.subtle,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  title: {
    color: lightTheme.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
```

### Mobile route shell pilot

The Expo route-shell pilot composes app-local styles in
`apps/mobile/src/styles/routeShellStyles.ts`. Keep that file private to mobile
until a second app surface needs the same composition. Use package tokens there,
not one-off hex values in route components.

## Conventions

- **Use theme tokens over `primitive`.** `lightTheme.text.secondary` survives a palette change; `primitive.slate[700]` does not.
- **Use `brand` for product accents only** - primary CTAs, links, the logo. Body text and chrome should use theme tokens.
- **Never hardcode a hex in app code.** If a value isn't in this package, either add it here or pick the closest token.
- **Use `status` for visual state only.** Status tokens may style badges, sync panels, and visit steps; they must not define workflow order or business rules.
- **Numbers, not strings, for spacing/radius/fontSize.** This keeps the same token usable in Tailwind classes (where it becomes `4`, `8`, etc.) and React Native styles (which require numbers).
- **Mirror Figma variable names.** Use `figmaColorVariables` as the source list for paths such as `primitive/navy/950` and `semantic/status/en-route`.

## Adding a token

1. Add the value to the relevant module (`colors.ts`, `themes.ts`, `status.ts`, `spacing.ts`, etc.).
2. If it's a color, add it to `primitive` first, then expose a theme or status role unless it's brand-only.
3. Export it from `index.ts`.
4. Run `pnpm --filter @pest-patrol/ui-tokens typecheck`.
