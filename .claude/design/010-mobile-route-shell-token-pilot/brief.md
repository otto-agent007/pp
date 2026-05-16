# Claude Design Brief: Mobile Route Shell Token Pilot

## Summary

Create UI/design recommendations for a focused mobile route-shell pilot that proves the new Pest Patrol design-token foundation on the technician route experience. Codex owns implementation, token wiring, offline behavior, tests, verification, and architecture boundaries; Claude should advise only on hierarchy, density, copy, and visual state treatment.

## Target Screens And Surfaces

- Expo technician signed-in route screen in `apps/mobile/app/index.tsx`
- Technician command header and readiness panel
- Sync confidence panel
- Daily route timeline with current, next, focused-later, and compact-later stops
- Assigned job card shell
- Visit-flow wrapper around existing field controls

## User Goal

Technicians need a compact field cockpit that answers:

- What am I doing now?
- What is next?
- Is my work saved locally or synced?
- Which visit steps are done, queued, or still needed?

## Current State Claude Should Assume

- Token foundation is being finalized in `packages/ui-tokens`.
- Mobile route data, work-plan state, and offline queue behavior already exist.
- The pilot direction is an operational rail: dense, high-contrast, sunlight-readable, and fast to scan.
- Codex will keep route-specific style composition inside `apps/mobile` and consume `@pest-patrol/ui-tokens` directly.

## States To Cover

- Loading assigned jobs
- Empty route
- Error loading jobs
- Ready with current and next jobs
- Compact later stops
- Focused later stop
- Offline, queued, retrying, failed, synced, and no-local-change sync states
- Visit-flow states: done, queued, needed

## Constraints

- No schema changes, migrations, RLS changes, provider setup, map SDKs, environment changes, Vercel deploy changes, production mutations, or Figma canvas writes.
- No direct Supabase access from UI components.
- Preserve offline-first mobile behavior and queued writes.
- Do not redesign individual capture controls in this slice: GPS, status, treatment form, chemical log, photo upload, and signature internals are follow-ups.
- Use field-friendly visual hierarchy, large tap targets, visible text labels, and accessible non-color-only state cues.

## Expected Claude Output

- Recommended information hierarchy for the route shell.
- Compact copy suggestions for route, sync, and visit-flow state labels.
- Visual guidance for operational rail density, contrast, and touch targets.
- Notes on empty, loading, error, ready, focused, queued, failed, and synced states.
- Follow-up ideas clearly separated from the V1 pilot.
