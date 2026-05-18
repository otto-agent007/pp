# Critique: Repo Audit (post-portal-send merge, pre-launch)

Reviewed: tree state as of `pest-patrol-os` working tree on 2026-05-17. Spot-checked apps/web/app, apps/mobile/app, apps/mobile/src, packages/{ui-tokens,domain,api-client,types,assets}, docs/, supabase/migrations/. This is a whole-repo punch list, not a slice critique — items are independent and can be picked up in any order.

## What's healthy

- Architecture rules in `README.md` are visibly enforced: clients consume `useQuery`/`useMutation` hooks; hooks delegate to `@pest-patrol/domain`; domain wraps `@pest-patrol/api-client`. No Supabase clients leak into components.
- `packages/ui-tokens` has a clean three-layer model: primitive → brand/semantic → status. Mobile route shell (`apps/mobile/src/styles/routeShellStyles.ts`) and the Tailwind config both consume it correctly.
- Test coverage is dense at the component level. Every non-trivial `*-client.tsx` has a co-located `*-client.test.tsx`. Vitest + Testing Library + jsdom are wired consistently across web and mobile.
- API auth boundary in `apps/web/app/api/_lib/server-auth.ts` does the right things: bearer token → `getUser` → profile fetch → role validation → fail closed. Service-role client is segregated from the user-bearing client.
- The portal-send route (`apps/web/app/api/portal/access-tokens/send/route.ts`) addressed prior critique issue 10 — `send_requested` is no longer written before the webhook is confirmed reachable.

## Design system drift (highest-leverage)

1. **136 hardcoded color utility classes in `apps/web/app/` instead of the `theme.*` / `primitive.*` Tailwind keys exposed by `tailwind.config.ts`.** Every admin client has at least one of `bg-[#071A3D]`, `text-[#E11D2E]`, `bg-emerald-50`, `text-red-700`, etc. Concentrations: `automation-client.tsx` (19), `home-command-center.tsx` (16), `customers-client.tsx` (14), `inventory-client.tsx` (11), `jobs-client.tsx` (10). The tokens to land on already exist in `packages/ui-tokens/colors.ts` (`primitive.navy[950]` = `#071A3D`, `primitive.red[500]` = `#E11D2E`, …) and `themes.ts` (`lightTheme.status.*` semantic groups). Fix: a single sweep replacing arbitrary-value Tailwind utilities (`bg-[#…]`, `text-[#…]`, `border-[#…]`) with the matching token utility (`bg-primitive-navy-950`, `bg-theme-status-urgent-bg`, etc.). Two passes — first the four most common literals (`#071A3D`, `#0EA5E9`, `#E11D2E`, `#FACC15`), then a sweep for the remaining Tailwind palette aliases (`emerald-`, `slate-`, `amber-`, `red-`) that should map to semantic status tokens.

2. **`home-command-center.tsx` defines a `severityClasses` map (lines 17–45) that mixes named Tailwind utilities (`bg-emerald-50`, `border-amber-200`, `text-red-700`) with raw hex utilities (`bg-[#16A34A]`, `bg-[#E11D2E]`, `bg-[#FACC15]`).** This is the canonical place to consume `status` from `@pest-patrol/ui-tokens` — every key (`good`, `neutral`, `urgent`, `warning`) maps 1:1 to a `status.alert.*` or `status.job.*` group already defined in `packages/ui-tokens/status.ts`. Fix: replace the literal map with `status.alert.success` / `.neutral` / `.danger` / `.warning` lookups, and surface their `bg/border/solid/fg` fields directly. Removes 8 hardcoded values in one file and gives the dashboard real theme parity.

3. **`apps/mobile/app/index.tsx` (login / loading / error screens, lines 147–223) bypasses `@pest-patrol/ui-tokens` entirely.** 15 hardcoded hex values — `#1E3A8A`, `#F9FAFB`, `#111827`, `#4B5563`, `#D1D5DB`, `#B91C1C` — none of which exist in the Pest Patrol palette. `#1E3A8A` is Tailwind's `blue-900`, not Pest Patrol's `primitive.navy[950]` (`#071A3D`); the actual brand navy is missing from the login screen entirely. The mobile route shell (`apps/mobile/src/styles/routeShellStyles.ts`) shows the right pattern — import `lightTheme`, `status`, `spacing` from `@pest-patrol/ui-tokens` and build a typed palette object. Apply the same pattern to the login/loading/error screens, or extract a shared `mobileAuthShellPalette` and consume it from `index.tsx`.

4. **`admin-nav.tsx` still uses literal-hex Tailwind utilities (lines 43, 52, 70, 71, 81) — including the Wordmark pill background `bg-[#071A3D]` introduced today.** This is my own miss: I matched the existing component's color convention instead of fixing it. The fix is one line in `tailwind.config.ts` (`primary-navy: primitive.navy[950]`) plus a sweep across the nav. Worth doing as part of issue 1, not separately.

## Type-safety escapes

5. **`server-auth.ts:86` calls `validateAdminAccess({ profile, session: {} as never })`.** `validateAdminAccess` only reads `record.profile.role` (`auth.ts:109`); `session` is required by the `AuthRecord` type but unused in the admin-validation path. The `as never` cast hides a real API mismatch — every server route in the app currently relies on this hack to pass type-checking. Two clean fixes: (a) overload `validateAdminAccess` to accept either `AuthRecord | null` or `{ profile: Profile | null }`, or (b) export a narrower `validateAdminProfile(profile)` from `packages/domain/auth.ts` and have `validateAdminAccess` delegate to it. (b) is smaller and keeps the existing call sites in `getCurrentAdminAuth` working unchanged.

6. **`packages/domain/closeouts.ts:404–409` fabricates phantom `JobCloseoutReview` arrays with `Array.from({ length: n }) as never` to coerce a `CloseoutCaptureSummary` into a `JobCloseoutReview`.** The function `getCloseoutReviewReadiness` happens to only call `.length` on those arrays today — but the cast silently breaks if anyone ever destructures or maps over the array contents. Fix: introduce `getCloseoutReviewReadinessFromCounts(counts: CloseoutCounts): CloseoutReviewReadiness` that operates directly on the count shape, then `readinessFromSummary` becomes a one-liner that maps `CloseoutCaptureSummary` → `CloseoutCounts`. No more phantom arrays, and the type system stays honest.

7. **No ESLint guardrail prevents reintroducing either of the above.** `.eslintrc.cjs` sets `@typescript-eslint/no-explicit-any` to `warn` and stops there. `as never`, `as unknown as T`, and `@ts-expect-error` all pass silently. Add `no-restricted-syntax` for `as never` (with an allow-list comment override for tests) so future drift is caught at lint, not at runtime. Tests are fine — they intentionally use `as never` on mock returns 254 times — so scope the rule to non-`*.test.{ts,tsx}` files.

## API / route correctness

8. **`apps/web/app/api/portal/access-tokens/send/route.ts` writes `send_requested` _only on success_ (line 209–214).** The fix for prior critique issue 10 moved the write to after `sendThroughProvider` succeeds, which closes the noisy-503 problem — but it also semantically inverts the event: `send_requested` now means "send succeeded", not "admin clicked send". The History drawer (issue 9 in the prior critique, still un-filtered — see issue 9 below) will show `send_requested` only on success, which is misleading for an event named "requested". Two reasonable resolutions: (a) rename the event kind to `send_succeeded` in `CustomerPortalAccessEventKind` and its label map (cleanest, but a small migration in `packages/types`), or (b) write a true `send_requested` event _before_ the provider call and add a `send_succeeded`/`send_failed` pair after. (a) is one rename across types + label map + a single migration file and matches what the implementation actually does today.

9. **The events route `apps/web/app/api/portal/access-tokens/[tokenId]/events/route.ts` still returns all event kinds with no filter.** Prior critique issue 9 left this as a design decision. With issue 8 resolved, this is automatically fine — the only event surfaced for send is the truthful success/failure pair, and the History drawer becomes the audit trail it was designed to be. No code change required if issue 8 is taken; if issue 8 is deferred, this stays a misleading-history bug.

10. **`server-auth.ts:105–109` exports `requireAdminAccess` that returns _only_ the response, not the access record.** No route in the codebase actually calls it — every route uses `getAdminAccess` directly (verified across `api/**/route.ts`). Dead code that confuses the auth contract. Either delete `requireAdminAccess` or repurpose it as a thin wrapper that throws on failure (which would simplify routes that currently do `if (auth.response) return auth.response`).

## Tooling / housekeeping

11. **`apps/web/next.config.ts` `transpilePackages` list omits `@pest-patrol/ui-tokens`** even though the web app imports from it (`tailwind.config.ts:14`). It works today because Tailwind reads the package at build time (not runtime), but any future runtime import (e.g., a React component using `lightTheme` at render time) will fail without transpile coverage. Add `@pest-patrol/ui-tokens` to the list now — one line, costs nothing, prevents a future surprise.

12. **`apps/web/tailwind.config.ts:29` references `../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}` but there is no `packages/ui` directory.** The comment says "Included for shared UI components later." With the new `apps/web/app/brand/` components living inside the app rather than in a shared package, this glob currently matches nothing. Either (a) actually create `packages/ui` and migrate brand + future shared components there (the path I'd recommend — a shared package gives mobile access to a `<Wordmark />` parity in RN-SVG), or (b) delete the dead glob and the comment.

13. **`apps/web/app/brand/svgs.ts` (added today, my work) duplicates the SVG sources that live in `packages/assets/brand/`.** Source of truth is now in two places — anyone editing one will diverge from the other. Short fix: add a comment block at the top of `svgs.ts` linking to `packages/assets/brand/{wordmark,wordmark-on-dark,logomark}.svg` as the design source. Longer fix: introduce a build-time codegen step (`tooling/sync-brand-svgs.ts`) that reads the SVG files and emits `svgs.ts`, run on `pnpm dev` and `pnpm build`. Tag for the next design-system slice — not blocking.

14. **No `pnpm` script to assert "no hardcoded hex in `apps/`".** Issue 1 will reduce the count to near zero; without a CI guardrail it will creep back. A 10-line script in `tooling/` that greps `apps/{web,mobile}/{app,src}/**/*.{ts,tsx}` for `bg-\[#`, `text-\[#`, `border-\[#`, and standalone `#[0-9A-Fa-f]{6}` outside of SVG asset files, exits 1 if matches > N. Wire it into `pnpm test` or the `lint` turbo task.

## Documentation drift

15. **`docs/DESIGN_SYSTEM.md` describes the token system in detail but does not document how to consume tokens from a component — neither for Tailwind (`bg-primitive-navy-950` syntax) nor for TS imports (`import { lightTheme } from "@pest-patrol/ui-tokens"`).** This is almost certainly why issue 1 exists: every component author reaches for `bg-[#071A3D]` because it's the path of least resistance. Add a "Consuming tokens" section with two side-by-side examples (one Tailwind utility, one TS import) and link from `docs/AGENTS.md`.

16. **`README.md` line 105 says "no preview/production migration has been applied by Codex"** but `tasks/in-progress.md` (the follow-up list) does not list "verify preview migration state" as a candidate. The two documents describe the same launch readiness gap with different wording. Reconcile — either expand `tasks/in-progress.md` to include the migration-verification checkpoint, or trim the README to refer to `tasks/in-progress.md` as canonical.

## Out of scope (parked, OK)

- **Mobile design-system parity with web brand components.** A React Native `<Wordmark />` / `<Logomark />` via `react-native-svg` is a follow-up. The technician app currently doesn't render the brand mark in any tab; not urgent.
- **Storybook / Ladle for the design system.** `docs/design-system/preview/brand-logos.html` is the current spec page; a real interactive design-system site is post-launch.
- **Portal token "Send requested [date]" persistent row state.** Still acceptable per prior critique.
- **Resend cooldown / throttle.** Still acceptable per prior critique.
- **Provider-blocked vs. retryable failure UI distinction.** Still tagged for the next provider slice.

## Suggested ordering

**Single highest-leverage commit (no architecture decisions needed):**
Issues 7 + 14 — wire ESLint `no-restricted-syntax` for `as never` outside tests, and add the `tooling/no-hardcoded-hex.ts` guardrail. Both together prevent every future re-occurrence of the issues below. ~30 lines.

**Sweep, one PR per area:**
Issue 1 — Tailwind hex literals across `apps/web/app/`. Mechanical replacement. Estimate one focused afternoon.
Issue 3 — `apps/mobile/app/index.tsx` palette swap. Self-contained file.

**Small refactors (require a type touch):**
Issue 5 — `validateAdminProfile` overload. ~20 lines in `packages/domain/auth.ts` + 1-line call site update.
Issue 6 — `getCloseoutReviewReadinessFromCounts`. ~30 lines + 1 call site.
Issue 2 — `home-command-center.tsx` `severityClasses` → `status.alert.*`. ~15 lines.

**Design decisions before cutting:**
Issue 8 — event naming (`send_requested` → `send_succeeded`). One-rename pass or full request/succeeded/failed trio.
Issue 12 — `packages/ui` introduction vs. dead-glob deletion.

**Documentation:**
Issue 15 — token consumption examples in `docs/DESIGN_SYSTEM.md`.
Issue 16 — reconcile README ↔ in-progress.md migration claim.

**Cleanups:**
Issue 4, 10, 11, 13 — small, no risk, can be batched.

## Verification needed after fixes

- **Issue 1 sweep:** run `pnpm typecheck && pnpm test` and visually diff `/` and `/dispatch` against the design-system preview to confirm color parity is preserved when the literals become tokens.
- **Issue 5:** add a test case to `packages/domain/auth.test.ts` that exercises the new overload with `profile` only.
- **Issue 6:** the existing `closeouts.test.ts` should still pass; add a direct test for `getCloseoutReviewReadinessFromCounts` to lock the new entry point.
- **Issue 8:** if renaming, search-and-replace `send_requested` across `packages/types`, `packages/domain`, `apps/web`, and the supabase migration that introduced it (`20260513120000_portal_send_audit_events_v1.sql`). Migrations cannot be retroactively renamed — add a new migration that updates the CHECK constraint and the event-label code path together.
- **Issue 14:** run the new guardrail against the post-sweep tree; it should pass with zero matches (or whatever low N you set as the budget).
