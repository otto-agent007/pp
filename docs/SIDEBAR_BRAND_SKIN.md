# Sidebar Brand Skin V1

Sidebar Brand Skin V1 is a lightweight identity skin for resale and
white-label demos. It changes only trusted app identity surfaces and sidebar
colors while keeping Pest Patrol as the default brand.

## What V1 Changes

- Sidebar logo or safe text fallback, product name, and sidebar colors.
- Active and hover treatment for sidebar navigation.
- Admin sign-in wordmark and title.
- Customer portal company identity and trust copy.
- Customer portal share-card company identity.
- Mobile technician header and signed-out mobile title.

## Selecting A Brand

Set one public brand key per app surface:

```bash
NEXT_PUBLIC_BRAND_KEY=pest_patrol
NEXT_PUBLIC_BRAND_KEY=demo_pest
EXPO_PUBLIC_BRAND_KEY=pest_patrol
EXPO_PUBLIC_BRAND_KEY=demo_pest
```

Missing or unknown values fall back to `pest_patrol`. These are public UI
selection keys only; do not put secrets in brand-skin config or env values.

## Adding A Brand Safely

Add reviewed brand metadata in `packages/ui-tokens/brand-skins.ts`.

Required fields include company/product labels, portal/admin/mobile labels,
logo kind, and the approved sidebar/action color roles. Keep color values in
the brand config layer so app components consume CSS variables or tokens rather
than one-off hex values.

Logo rules:

- Use checked-in, reviewed static assets only.
- Use the safe React text fallback for demo or unapproved brands.
- Do not render arbitrary uploaded SVG strings.
- Do not fetch remote logo assets at runtime.
- Do not add customer logo upload or theme-editor UI.

## Not Included

- Multi-tenant data isolation.
- Tenant-specific Supabase, Stripe, notification, or provider credentials.
- Tenant onboarding or admin-managed brand editing.
- Customer-uploaded brand assets.
- Full runtime theme or Tailwind variable migration.

## Production Checklist

- Verify preview smoke with the selected public brand key.
- Confirm sidebar contrast and active/hover states.
- Confirm admin sign-in identity.
- Confirm customer portal header and trust copy.
- Confirm portal payment/share copy stays customer-safe.
- Confirm mobile header if the mobile app is part of the demo.
- Confirm no migration, provider dashboard, env-secret, seed/reset, preview, or
  production data mutation is part of the brand skin change.
