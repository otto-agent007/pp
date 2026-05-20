# Codex Closeout

## May 19, 2026

- Treat the brand-font bundle as design guidance only; it does not authorize app chrome changes.
- Preserve the approved app-shell lockups in `apps/web/app/brand` and `packages/assets/brand`.
- Keep `docs/design-system/assets/wordmark-options/` as inactive exploration assets until a final brand-font decision is made.
- Do not promote inactive `pest-patrol-logo-*` candidates back into product chrome without explicit reapproval.
- No migrations, providers, secrets, environment changes, dashboard mutations, preview mutations, or production changes are part of this relay closeout.

## May 19, 2026 - Claude v3 Wordmark Handoff

- Direction A / refined fleet-livery is approved as the lead draft direction for the wordmark handoff.
- Direction A in this file is the same draft as Option C / v3 in the brand-font review bundle; the bundle's Option A remains the current Inter fallback, not the approved lead direction.
- Preserve Claude's v3 draft masters under `docs/design-system/assets/wordmark-options/v3/` as reference assets only.
- The current live app assets remain `packages/assets/brand/wordmark.svg` and `packages/assets/brand/wordmark-on-dark.svg`; do not replace them in this slice.
- Claude's v3 masters were checked as flattened, path-only SVGs with accessibility metadata, no `<text>`, no `font-family`, and no `transform=` attributes.
- The 7-degree shield vs 5-degree wordmark slant mismatch is acceptable for this draft; any shield recut belongs in a separate follow-up.
- Pre-promotion gates remain: type-designer/craft review, trademark/legal diligence, production `<title>` text decision, mobile lockup/minimum-size rules, and explicit user approval to promote the v3 masters into live app assets.
