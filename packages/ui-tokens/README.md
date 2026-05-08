# @pest-patrol/ui-tokens

Single source of truth for design tokens shared between the Next.js web app and the Expo mobile app.

## Why this exists

Before this package, the web app held five brand colors in `tailwind.config.ts` and the mobile app had no token layer at all — 119 hardcoded hex literals duplicated across nine components. This package centralizes that vocabulary so both surfaces stay visually consistent without coordination.

## What's exported

| Module        | Export                                                | Notes                                                                 |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `colors.ts`   | `palette`, `brand`, `semantic`, `colors`              | `palette` is raw scales; `semantic` is role-named (text/bg/border/status) |
| `spacing.ts`  | `spacing`                                             | 4px-base scale matching Tailwind defaults; values are numbers (RN-friendly) |
| `radius.ts`   | `radius`                                              | `none`, `sm`, `md`, `lg`, `xl`, `pill`                                |
| `typography.ts` | `fontSize`, `lineHeight`, `fontWeight`, `fontFamily` | Numeric sizes (RN-friendly); `fontWeight` values are strings           |
| `shadows.ts`  | `shadow`                                              | Each token has `web` (CSS string) and `native` (RN style object)      |

## Usage

### Web — Tailwind config

`apps/web/tailwind.config.ts` consumes the tokens via `theme.extend`:

```ts
import { brand, semantic, spacing, radius, fontSize, fontFamily } from "@pest-patrol/ui-tokens";

export default {
  theme: {
    extend: {
      colors: { ...brand, semantic },
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
<button className="bg-primary text-semantic-text-inverse rounded-md px-4 py-2">
  Save
</button>
```

### Mobile — React Native styles

```tsx
import { semantic, spacing, radius, fontSize, fontWeight } from "@pest-patrol/ui-tokens";

const styles = StyleSheet.create({
  card: {
    backgroundColor: semantic.background.surface,
    borderColor: semantic.border.subtle,
    borderRadius: radius.md,
    padding: spacing[4],
  },
  title: {
    color: semantic.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
```

## Conventions

- **Use `semantic` over `palette`.** `semantic.text.muted` survives a palette change; `palette.gray[500]` does not.
- **Use `brand` for product accents only** — primary CTAs, links, the logo. Body text and chrome should use `semantic`.
- **Never hardcode a hex in app code.** If a value isn't in this package, either add it here or pick the closest token.
- **Numbers, not strings, for spacing/radius/fontSize.** This keeps the same token usable in Tailwind classes (where it becomes `4`, `8`, etc.) and React Native styles (which require numbers).

## Adding a token

1. Add the value to the relevant module (`colors.ts`, `spacing.ts`, etc.).
2. If it's a color, add it to the raw `palette` first, then expose a semantic role unless it's brand-only.
3. Export it from `index.ts`.
4. Run `pnpm --filter @pest-patrol/ui-tokens typecheck`.
