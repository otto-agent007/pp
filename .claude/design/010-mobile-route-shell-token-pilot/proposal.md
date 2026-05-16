# Proposal: Mobile Route Shell Token Pilot

## Goal & non-goals

- **Goal:** Define information hierarchy, copy, visual-state guidance, and touch-target conventions for the technician route shell so that the token-based design foundation in `packages/ui-tokens` / `apps/mobile/src/styles/routeShellStyles.ts` reads as a coherent, sunlight-readable, field-friendly cockpit.
- **Non-goals:** Redesigning or replacing individual capture controls (GPS, status, treatment form, chemical log, photo upload, signature). No schema changes, no map SDKs, no new offline-queue logic, no provider setup, no Figma writes, no production mutations, no environment changes. Codex owns all implementation, token wiring, offline behavior, tests, and architecture.

---

## Approach

The route shell is substantially assembled. `MobileTechnicianHeader`, `MobileRouteTimeline`, `AssignedJobCard`, `SyncStatusIndicator`, and `MobileJobFieldFlow` all exist and consume `mobileRouteShellPalette` / `mobileRouteShellStyles` from `routeShellStyles.ts`. The token package (`@pest-patrol/ui-tokens`) is already imported and driving palette values.

This proposal identifies four refinement areas:

1. **Screen composition and scroll boundary** — the current layout in `index.tsx` places "Today's route" heading and a second Refresh button inside the `<ScrollView>`, duplicating the Refresh already in `MobileTechnicianHeader`. Recommend a single Refresh action per screen, and a clear fixed-header / scrollable-body split.
2. **Header command area** — the `MobileTechnicianHeader` readiness panel carries `demoNextLabel` and `demoNextSummary` which need production copy conventions.
3. **Sync confidence panel** — `SyncStatusIndicator` is well-structured but copy density can be tightened for sunlight readability.
4. **Route timeline states** — loading, empty, error, and later-stop density already work mechanically; this proposal refines copy and visual hierarchy.

No new hooks, domain helpers, types, stores, routes, or API client functions are needed.

---

## Information hierarchy — screen zones

```
┌──────────────────────────────────────────────┐
│  TECHNICIAN COMMAND HEADER  (fixed, no scroll)│
│  ─ eyebrow: "Technician"                      │
│  ─ name / "Route ready" headline              │
│  ─ identity line (profile ID / anonymous)     │
│  ─ [Language]  [Sign out]  (top-right)        │
│  ─ READINESS PANEL  (job count summary)       │
│  ─ SYNC CONFIDENCE PANEL  (tone-coded card)   │
├──────────────────────────────────────────────┤
│  SCROLLABLE ROUTE AREA                        │
│  ─ Route date line + [Refresh]  (scroll top)  │
│  ─ LOADING STATE  (card, ActivityIndicator)   │
│  ─ ERROR STATE   (error tone card + [Retry])  │
│  ─ EMPTY STATE   (card)                       │
│  ─ ROUTE TIMELINE SUMMARY  (dark rail card)   │
│  ─ CURRENT STOP  (section label + job card)   │
│  ─ NEXT STOP     (section label + job card)   │
│  ─ LATER STOPS   (compact tap-to-expand rows) │
│  ─ Last refreshed [time]  (footer)            │
└──────────────────────────────────────────────┘
```

**Composition rule:** Everything above the scroll boundary is static on-screen context (who am I, what is my sync state). Everything in the scroll area is route content for today. The two Refresh buttons in the current `index.tsx` should collapse to one, placed at the top-right of the scrollable route area beside the date line.

---

## Section-by-section breakdown

### 1. Technician command header (`MobileTechnicianHeader`)

**Eyebrow:** `"Technician"` — `color: accentText, fontSize: xs, fontWeight: bold` — existing pattern is correct.

**Headline:** `readiness.title` — currently derived from `buildMobileTechnicianReadinessPanel`. This becomes the status headline: *"Route ready"* when jobs are loaded, *"No route today"* when empty, *"Loading…"* during auth init. It is the single largest text on the screen and should drive the technician's first-glance read.

**Identity line:** `readiness.identityLabel` — profile identifier or *"Signed in"* fallback.

**Readiness panel card:** Replace `demoNextLabel` / `demoNextSummary` with production field names. Suggested conventions:

| State | Top line | Second line |
|---|---|---|
| Route has current stop | `"Now: [customer] @ [time]"` | `"Next: [customer] @ [time]"` or `"No more stops"` |
| Route has no current, has next | `"Up next: [customer] @ [time]"` | `"[N] stop(s) remaining"` |
| No jobs today | `"No stops assigned"` | `"Check with dispatch if expected"` |
| Loading | `"Loading route…"` | — |

Naming: rename `demoNextLabel` → `currentStopLabel`, `demoNextSummary` → `routeSummaryLine` in `buildMobileTechnicianReadinessPanel` when Codex implements production content. Claude is not deciding the function signature — this is copy guidance only.

**[Language] button:** `"Español"` / `"English"` toggle — existing pattern is correct. Keep at top-right, minimum touch target `minHeight: 44`.

**[Sign out] button:** Correct. Keep below Language toggle.

**Error line:** `color: signalDanger` — correct. Appears below the button column.

---

### 2. Sync confidence panel (`SyncStatusIndicator`)

Current status labels and detail copy are functionally complete. Density recommendations:

**Status label copy (keep as-is):**
- `"Syncing now"` ✅
- `"Offline"` ✅
- `"Sync attention needed"` ✅ (consider shortening to `"Sync needed"` for narrow widths)
- `"Ready to sync"` ✅
- `"Synced"` ✅
- `"No local changes"` ✅

**Detail copy — field-friendly rewrites:**

| State | Current | Recommended (shorter, sunlight-readable) |
|---|---|---|
| Syncing | `"Sending queued updates. Keep the app open until this finishes."` | `"Sending saved work to the server. Stay in the app."` |
| Offline | `"Work is saved on this device and will stay pending until the connection returns."` | `"Work is saved here. Will sync when back online."` |
| Failures | `"Failed items remain visible for review. Use sync after fixing the issue."` | `"Some items failed. Review and try sync again."` |
| Pending | `"Queued updates are ready for manual sync."` | `"Saved work is ready to sync."` |
| Synced | `"All visible completed updates are synced. Clear synced when acknowledged."` | `"All work synced. Tap Clear when done reviewing."` |
| Idle | `"No local work is waiting to sync."` | `"Nothing waiting to sync."` |

**Summary line:** `{N} pending · {N} failed · {N} synced` — compact the row. Omit the "0 failed" count when `summary.failed === 0` and there are no failures. Omit "synced" count when `summary.synced === 0`. Rule: show only non-zero counts to reduce noise.

**Manual sync button labels (keep as-is):** "Sync now", "Sync in progress", "Sync when online", "Nothing ready" — already correct and short.

**"Clear synced" button:** Keep. Good affordance for acknowledging completed work.

**Tone boundary:** `getMobileSyncTone` in `routeShellStyles.ts` already maps states to `status.sync.*` tokens. No change needed.

---

### 3. Route area heading (inside `<ScrollView>`)

Remove the duplicate standalone "Today's route" heading + Refresh button from `index.tsx` (lines 248–289). The `MobileRouteTimeline` summary rail card already announces `timeline.summary.title` / `timeline.summary.label`. A single date line above the timeline with a right-aligned [Refresh] is sufficient:

```
Today's route      [Refresh]
Thursday, May 15
```

`"Today's route"` — `color: primaryText, fontSize: lg, fontWeight: extrabold`. Date line — `color: mutedText, fontSize: xs`. [Refresh] — `color: primaryText, fontSize: sm, fontWeight: bold, minHeight: 44`. Both using token values via `mobileRouteShellPalette`.

---

### 4. Route timeline summary card (`MobileRouteTimeline`)

The dark rail card (`backgroundColor: rail, borderColor: borderStrong`) carries three lines:

- `timeline.summary.title` — `color: inverseText, fontSize: xs, fontWeight: bold, textTransform: uppercase` — correct.
- `timeline.summary.label` — `color: inverseText, fontSize: md, fontWeight: extrabold` — correct.
- `timeline.summary.syncLabel` — `color: inverseText, fontSize: sm` — correct.

**Copy conventions for domain to produce:**

| Condition | `title` | `label` | `syncLabel` |
|---|---|---|---|
| 0 stops | `"TODAY"` | `"No assigned stops"` | `"Nothing queued"` |
| N stops, none started | `"TODAY"` | `"{N} stop{s} assigned"` | Sync summary phrase |
| 1 current + N later | `"TODAY"` | `"Stop {current} of {total}"` | Sync summary phrase |
| All done | `"TODAY"` | `"Route complete"` | `"All work synced"` or `"Pending sync"` |

**Sync summary phrase** — a short version of the sync status for the rail card. e.g., `"3 pending sync"`, `"All synced"`, `"Offline — work saved"`, `"Sync needed"`.

---

### 5. Section labels (`RouteSection`)

Section labels are `UPPERCASE, accentText, fontSize: xs, fontWeight: extrabold` — correct.

**Label conventions:**
- Current stop: `"NOW"` — short, high contrast
- Next stop: `"NEXT"`
- Later section header: `"LATER TODAY"` (existing `"Later today"` — capitalize for consistency)

**Section metadata (right side):**
- `item.readinessLabel` — `color: secondaryText, fontSize: xs, fontWeight: bold` — existing is correct
- `item.syncTriage.label` — `color: mutedText, fontSize: 11, fontWeight: bold` — existing is correct
- If `item.syncTriage.label` is empty (no local queue items for this stop), omit the element rather than showing empty text

---

### 6. Assigned job card (`AssignedJobCard`)

Current layout: time + status pill header, then customer / address / notes / work plan / controls.

**Touch targets:** Status pill `paddingHorizontal: 10, paddingVertical: 5` is fine for a non-interactive pill. All interactive controls inside `children` (the field flow) must maintain `minHeight: 44`.

**Work plan dot states:**
- Done: `signalSynced` (green) ✅
- Pending: `signalQueued` (amber) ✅
- Missing: `signalMissing` (neutral/gray) ✅

**Work plan empty state:** When `workPlan.length === 0`, omit the work plan block entirely (current behavior) — correct. No "No field plan" placeholder needed; the job card speaks for itself.

**Notes box:** Correct — `surfaceSubtle` background, `accentText` label, `secondaryText` body. Keep.

---

### 7. Later-stop compact rows (`LaterRouteRow`)

Current: time / customer + address + readiness + sync / status badge — correct three-column layout.

**Readiness label visibility:** `item.readinessLabel` renders in `accentText` color at `fontSize: 12, fontWeight: 700`. When readiness is "complete" or "no captures needed", consider suppressing the label to reduce noise. Only show readiness labels that signal action needed (e.g., "GPS needed", "Signature missing").

**Sync label:** `fontSize: 11, fontWeight: 700, color: mutedText` — already low-weight, correct.

**Tap target:** The full `LaterRouteRow` is a `<Pressable>` — meets `minHeight` via `compactCard.padding: spacing[3]` which may be tight on small devices. Recommend a minimum card height of 60px for the later-row tap area.

**Focused later stop:** When `focusedJobId === item.job.id`, the row renders a full `<RouteSection>` instead of a compact row. This is the correct expand-in-place pattern. No additional copy or visual change needed.

---

### 8. Login screen

The login screen in `index.tsx` (lines 162–230) uses hardcoded hex values (`#F9FAFB`, `#111827`, `#4B5563`, `#1E3A8A`, etc.) instead of `mobileRouteShellPalette` tokens. This is the one screen not yet using the token foundation.

**Recommendation:** Codex should wire `mobileRouteShellPalette` (or a minimal auth-screen palette) to the login `<View>` and form elements. Specific mappings:
- `#F9FAFB` → `canvas`
- `#111827` → `primaryText`
- `#4B5563` → `secondaryText`
- `#1E3A8A` → `rail` (primary action color)
- `#D1D5DB` → `border`
- `#B91C1C` → `signalDanger`

---

## State map

| State | Screen zone | Treatment |
|---|---|---|
| **Auth loading** | Full screen | `ActivityIndicator` on `canvas` background — existing pattern. |
| **Signed out** | Full screen | Login form — recommend token-wired colors (see §8). |
| **Jobs loading** | Route area | Card with `ActivityIndicator + accentText` + `"Loading assigned jobs"` — existing. |
| **Jobs error** | Route area | `sync.failed` tone card, `signalDanger` heading, error message. Add a [Retry] `<Pressable>` below the error text. |
| **Empty route (0 jobs)** | Route area | `"No jobs assigned today"` + `mutedText` hint — existing. |
| **Ready — current + next** | Route area | Summary rail → `RouteSection` × 2 (NOW + NEXT) — existing. |
| **Ready — later stops** | Route area | Compact `LaterRouteRow` list under `"LATER TODAY"` section label — existing. |
| **Focused later stop** | Route area | `RouteSection` (expanded) replacing compact row — existing. |
| **Offline, no queue** | Sync panel | `offline` tone, `"Offline"` label, `"Work is saved here…"` detail. No sync button. |
| **Offline, queued** | Sync panel | `offline` tone, disabled [Sync when online] button. |
| **Pending, online** | Sync panel | `ready` tone, `"Ready to sync"`, enabled [Sync now]. |
| **Syncing** | Sync panel | `ready` tone, `"Syncing now"`, disabled [Sync in progress]. |
| **Failed** | Sync panel | `failed` tone, `"Sync attention needed"`, `lastError` text, [Sync now] re-enabled. |
| **Synced** | Sync panel | `synced` tone, `"Synced"`, [Clear synced] shown. |
| **No local changes** | Sync panel | `idle` tone, `"No local changes"`, no buttons. |
| **Visit step done** | Work plan dot | `signalSynced` — green. |
| **Visit step pending** | Work plan dot | `signalQueued` — amber. |
| **Visit step needed** | Work plan dot | `signalMissing` — neutral/gray. |

---

## Copy bank

### Technician header
- `"Technician"` — eyebrow
- `"Route ready"` / `"No route today"` / `"Loading…"` — headline
- `"Now: [name] @ [time]"` / `"Up next: [name] @ [time]"` / `"No more stops"` / `"No stops assigned"` — current-stop label
- `"[N] stop(s) remaining"` / `"Check with dispatch if expected"` — route summary line
- `"Español"` / `"English"` — language toggle
- `"Sign out"` — sign-out button
- `"Refresh"` — single refresh button in scrollable area

### Sync panel (tightened copy)
- Status: `"Syncing now"` / `"Offline"` / `"Sync needed"` / `"Ready to sync"` / `"Synced"` / `"No local changes"`
- Detail lines as specified in §2 above
- Buttons: `"Sync now"` / `"Sync in progress"` / `"Sync when online"` / `"Nothing ready"` / `"Clear synced"`
- `"[N] pending"` / `"[N] failed"` / `"[N] synced"` / `"Not synced"` / `"Synced [time]"` / `"Next retry [time]"`

### Route area
- `"Today's route"` — section heading
- `"NOW"` / `"NEXT"` / `"LATER TODAY"` — section labels
- `"Scheduled"` — time label in job card
- `"Notes"` — notes label in job card
- `"Field work plan"` — work plan label in job card
- `"No jobs assigned today"` / `"Pull to refresh later or check with dispatch if your route is missing."` — empty state
- `"Unable to load assigned jobs"` — error heading
- `"Loading assigned jobs"` — loading label
- `"Last refreshed [time]"` — footer

### Login (token-wired, no copy change)
- `"Pest Patrol OS"` / `"Technician login"` / `"Email"` / `"Password"` / `"Sign in"` — existing, keep.

---

## Layout notes (token references)

| Element | Recommended token usage |
|---|---|
| Screen background | `mobileRouteShellPalette.canvas` |
| Card surface | `mobileRouteShellPalette.surface` |
| Card border | `mobileRouteShellPalette.border` |
| Card border radius | `radius.md` |
| Card padding (full) | `spacing[4]` |
| Card padding (compact) | `spacing[3]` |
| Min touch target height | `44` px (standard iOS/Android minimum) |
| Section label font | `fontSize.xs, fontWeight.bold, textTransform: "uppercase"` |
| Eyebrow label | `fontSize.xs, fontWeight.bold, color: accentText` |
| Primary heading | `fontSize: 26, fontWeight: "800", color: primaryText` |
| Muted detail | `fontSize.sm, color: mutedText` |
| Signal danger | `mobileRouteShellPalette.signalDanger` |
| Signal queued | `mobileRouteShellPalette.signalQueued` |
| Signal synced | `mobileRouteShellPalette.signalSynced` |
| Dark rail card bg | `mobileRouteShellPalette.rail` |

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No Supabase from UI** | All route data flows through existing store hooks (`useAssignedJobs`, `useOfflineQueue`, `useSyncStatus`). No new direct DB access proposed. | ✅ |
| **No schema changes** | Design tokens only — no new DB fields. | ✅ |
| **No new domain logic** | Copy-convention guidance only. Domain helpers (`buildMobileDailyRouteTimeline`, `buildMobileTechnicianReadinessPanel`) are called as-is. | ✅ |
| **No map SDKs** | This proposal does not touch `JobGeofenceControls` or any map SDK. | ✅ |
| **Offline-first preserved** | No change to `useOfflineQueue`, `useQueueSync`, or `useSyncStatus` behavior. | ✅ |
| **Individual capture controls not redesigned** | `JobChemicalLogForm`, `JobGeofenceControls`, `JobStatusControls`, `JobPhotoUploadForm`, `JobSignatureCaptureForm`, `JobTreatmentForm` internals are out of scope. | ✅ |
| **Token package already wired** | `routeShellStyles.ts` already imports `@pest-patrol/ui-tokens`. No new package wiring needed. | ✅ |
| **No production mutations** | UI-only guidance. | ✅ |

---

## Open questions for Codex

1. **`demoNextLabel` / `demoNextSummary` production replacement.** When Codex implements production content for `buildMobileTechnicianReadinessPanel`, should it derive current-stop and route-summary from the same `jobs` array already available in `index.tsx`, or should a new argument be added to the builder? Claude recommends passing `jobs` + `timeline` to avoid duplicating derivation logic already in `buildMobileDailyRouteTimeline`.

2. **Duplicate Refresh buttons.** `index.tsx` currently renders a [Refresh] in the scrollable route heading AND `MobileTechnicianHeader` has a [Refresh] in the readiness panel. Which should be the canonical one? Claude recommends a single [Refresh] in the route area header. If the header's Refresh is wired to a different action (e.g., re-checking profile auth vs. reloading jobs), they can coexist — but labels should disambiguate them.

3. **Later-row minimum tap height.** The `compactCard` style uses `padding: spacing[3]`. On small screens this may produce a row height below 44 px. Codex should verify in the Expo simulator and add `minHeight: 60` if needed.

4. **"Sync needed" vs "Sync attention needed."** The current label is longer and may wrap on narrow screens. Claude recommends `"Sync needed"` for the status label with the fuller explanation in the detail line. Codex should validate both in the simulator.

5. **Auth loading screen token wiring.** The loading screen uses `#1E3A8A` as the ActivityIndicator color (hardcoded). Claude recommends `lightTheme.status.enRoute` (the same value driving `accentText`) so it stays consistent if the token value changes.

6. **"Focused later stop" back navigation.** When a later stop is expanded, there is currently no visible control to collapse it back to a compact row. Is `onFocusJob` intended to toggle (set `focusedJobId` to `null` when already focused)? Claude recommends adding a small "Collapse" affordance on the section header for the focused later stop.

---

## Follow-up ideas (out of scope)

- **GPS, status, treatment form, chemical log, photo upload, and signature control redesigns** — explicitly deferred per brief.
- **Push-notification route start reminder** — requires notification permissions and scheduling; out of scope.
- **Route map view** — requires map SDK; out of scope per brief.
- **Multilingual label coverage** — a translation pass over all copy bank entries for the Spanish toggle path is a natural follow-up.
- **Dark mode / night palette** — a `darkTheme` palette in `routeShellStyles.ts` for low-light field use would be a natural next slice.
- **Offline badge on header** — a small persistent offline indicator pinned above the scroll area when `networkStatus === "offline"` so technicians see connectivity status without scrolling past the sync panel.
