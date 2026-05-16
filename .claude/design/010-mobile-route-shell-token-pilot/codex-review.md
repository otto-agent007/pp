# Codex Review: Mobile Route Shell Token Pilot

## Adopt

- Treat the route shell as a compact field cockpit: fixed technician context, sync confidence, then scrollable route work.
- Keep token usage local to mobile route-shell styles and continue consuming `@pest-patrol/ui-tokens` directly.
- Preserve the existing offline-first data flow, queue behavior, and field-control internals.
- Tighten sync-panel copy for field readability while preserving the existing sync state meanings.
- Use non-color-only state cues for route, sync, and visit-flow status.
- Keep later stops compact with tap-to-expand behavior and large enough touch targets.
- Keep the route timeline summary rail and NOW/NEXT/LATER hierarchy as the dominant scan pattern.

## Adapt

- Verify the duplicate refresh recommendation against the current implementation before removing any control. If the two refresh actions reload different data, keep both but disambiguate labels.
- Treat `demoNextLabel` and `demoNextSummary` renaming as implementation guidance only. Do not churn shared helper signatures unless the production copy work needs it.
- Login-screen token wiring is useful, but it is adjacent to the route-shell pilot. Include it only if it stays small and does not distract from route-shell verification.
- `Sync needed` may be better than `Sync attention needed` on narrow screens, but simulator verification should decide.
- If focused later stops need collapse behavior, add it as a small interaction improvement only after confirming the current tap behavior.

## Defer

- Redesign of GPS, status, treatment form, chemical log, photo upload, signature, and treatment-form internals.
- Map SDKs, provider setup, background tracking, notifications, schema changes, migrations, RLS changes, Figma writes, Vercel mutations, and production mutations.
- Multilingual copy expansion, dark/night route-shell palette, route-map view, and push reminders.

## Reject

- Any direct Supabase access from mobile UI or route-shell components.
- Any change that breaks offline queue-first writes, retry, or sync behavior.
- Any business logic moved from shared packages into app components for copy convenience.
- Any map-provider, environment, or production-facing work under this design pilot.

## Implementation risks Codex must test

- Route shell still works offline and queued writes remain visible.
- Sync states stay readable on small mobile screens and do not wrap awkwardly.
- Later-stop rows meet touch-target expectations after density adjustments.
- Loading, empty, error, ready, focused-later, queued, failed, synced, and no-local-change states still render distinctly.
- Any login token polish remains scoped and does not change auth behavior.
