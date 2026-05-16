# Critique: Mobile Route Shell Token Pilot (post-implementation)

Reviewed: `apps/mobile/app/index.tsx`, `apps/mobile/src/components/MobileTechnicianHeader.tsx`, `apps/mobile/src/components/MobileRouteTimeline.tsx`, `apps/mobile/src/components/SyncStatusIndicator.tsx`, `apps/mobile/src/components/AssignedJobCard.tsx`.

---

## What's correct against the proposal

- **Screen composition** — header rendered as a sibling `<View>` above a `<ScrollView>` inside a single `flex: 1` screen — achieves the fixed-context / scrollable-route split without position:fixed hacks. Correct.
- **Route area date + [Refresh] row** — `<View flexDirection: row justifyContent: space-between>` containing the date/heading block on the left and a bordered [Refresh] on the right — matches the proposal's single scroll-area Refresh placement. Token values used (`mobileRouteShellPalette.primaryText`, `.mutedText`, `.border`).
- **Loading card** — `<ActivityIndicator color={mobileRouteShellPalette.accentText} />` with `"Loading assigned jobs"` — correct copy and color. Token-wired.
- **Error card** — `mobileRouteShellTone.sync.failed` tone for background/border, `signalDanger` for heading and body — matches proposal §State map.
- **Empty route card** — `"No jobs assigned today"` heading + `"Pull to refresh later or check with dispatch…"` detail — exact proposal copy. Token-wired.
- **"Last refreshed [time]" footer** — present, `mutedText`, correct.
- **Route summary rail** — `backgroundColor: rail`, `borderColor: borderStrong`, `inverseText` text, `textTransform: uppercase` title — matches proposal §4.
- **Section labels** — `sectionLabel` style uses `textTransform: "uppercase"` and `accentText` — correct. Later section hardcoded `"Later today"` renders as `"LATER TODAY"` due to the style rule — correct visual output.
- **`LaterRouteRow` as `<Pressable>`** — correct tap-to-expand pattern.
- **`SyncStatusIndicator` tone wiring** — `getMobileSyncTone` drives all six states. Sync button labels (`"Sync now"` / `"Sync in progress"` / `"Sync when online"` / `"Nothing ready"`), [Clear synced] button — all match proposal copy bank.
- **`MobileTechnicianHeader` token usage** — eyebrow `"Technician"` in `accentText`, headline in `primaryText fontSize: 26 fontWeight: 800`, identity label in `mutedText` — matches proposal §1.
- **Language toggle and Sign out buttons** — correct, bordered controls, `mobileRouteShellStyles.control`.
- **AssignedJobCard** — work plan dots using `signalSynced` / `signalQueued` / `signalMissing` for done/pending/missing states — correct. Notes box, "Scheduled" time label, "Field work plan" label — all match proposal copy bank.

---

## Issues

### 1. Duplicate [Refresh] buttons (not resolved)

`MobileTechnicianHeader` still renders a navy-filled [Refresh] button inside the readiness card (right of `assignedJobsLabel`). The scroll area also has a bordered [Refresh] at the date/heading row. Both call the same `load()` function via `onRefreshJobs`. They are duplicates.

The proposal recommended collapsing to one Refresh in the scroll area. The codex-review said: "verify the duplicate refresh recommendation against the current implementation before removing any control. If the two refresh actions reload different data, keep both but disambiguate labels." The implementation confirms they reload the same data (`void load()` in both paths). The condition for keeping both — distinct data sources — is not met.

**Recommendation:** Remove the `{onRefreshJobs ? ... }` block from `MobileTechnicianHeader` entirely. The scroll-area Refresh is the canonical one. If the header readiness card needs its own reload path in the future (e.g. re-fetching auth profile separately from jobs), that can be added with a distinct `onRefreshProfile` prop and label.

---

### 2. `demoNextLabel` / `demoNextSummary` still rendered

`MobileTechnicianHeader.tsx` still renders `readiness.demoNextLabel` (line ~104) and `readiness.demoNextSummary` (line ~112) inside the readiness card. These are demo-placeholder field names. If `buildMobileTechnicianReadinessPanel` still returns demo content under those keys, operators are seeing placeholder copy in production.

The codex-review Adapt note deferred the _renaming_ of the helper fields — that is reasonable. But the proposal's intent was that production content should replace the demo strings. This critique cannot verify what `buildMobileTechnicianReadinessPanel` currently returns without reading the domain source.

**Action needed:** Codex should confirm whether `buildMobileTechnicianReadinessPanel` now returns production values for `demoNextLabel` and `demoNextSummary`, or whether the demo placeholder strings (likely something like `"Demo: Next stop"` / `"Demo: Route summary"`) are still live. If the values are still demo-only, this is operator-visible placeholder text and should be addressed before any user-facing release.

---

### 3. Sync detail copy not tightened

All six `detailLabel` strings in `SyncStatusIndicator.tsx` are verbatim from the original pre-proposal implementation:

| State | In code | Proposal target |
|---|---|---|
| Syncing | `"Sending queued updates. Keep the app open until this finishes."` | `"Sending saved work to the server. Stay in the app."` |
| Offline | `"Work is saved on this device and will stay pending until the connection returns."` | `"Work is saved here. Will sync when back online."` |
| Failures | `"Failed items remain visible for review. Use sync after fixing the issue."` | `"Some items failed. Review and try sync again."` |
| Pending | `"Queued updates are ready for manual sync."` | `"Saved work is ready to sync."` |
| Synced | `"All visible completed updates are synced. Clear synced when acknowledged."` | `"All work synced. Tap Clear when done reviewing."` |
| Idle | `"No local work is waiting to sync."` | `"Nothing waiting to sync."` |

The codex-review Adopt section explicitly included "Tighten sync-panel copy for field readability." This is the only Adopt item that was not implemented. The verbose copy is particularly problematic for the `offline` state — at 80 characters, it wraps across two lines on a narrow screen, exactly the sunlight-readability concern the proposal flagged.

**Recommendation:** Update the six `detailLabel` strings in `SyncStatusIndicator.tsx` to the proposal targets above. No behavior change — copy-only patch.

---

### 4. Zero-value counts always shown in summary row

The summary row in `SyncStatusIndicator` always renders all three chips:

```tsx
<Text>{summary.pending} pending</Text>
<Text>{summary.failed} failed</Text>
<Text>{summary.synced} synced</Text>
```

On a clean-state device (no pending, no failed, no synced items) this reads: `"0 pending  0 failed  0 synced"` — noise with no signal value. The proposal said: omit the `failed` chip when `summary.failed === 0` and there are no failures; omit the `synced` chip when `summary.synced === 0`.

**Recommendation:** Wrap each chip in a null-conditional:
- Show `{summary.pending} pending` only when `summary.pending > 0`
- Show `{summary.failed} failed` only when `summary.failed > 0`
- Show `{summary.synced} synced` only when `summary.synced > 0`
- If all three are zero, the `formatLastSync(lastSyncAt)` time chip provides sufficient status context.

---

### 5. Error state missing [Retry] button

The `jobsStatus === "error"` block renders the error heading and message text, but no [Retry] affordance:

```tsx
{jobsStatus === "error" ? (
  <View style={{ backgroundColor: mobileRouteShellTone.sync.failed... }}>
    <Text>Unable to load assigned jobs</Text>
    <Text>{jobsError}</Text>
    {/* no Retry button */}
  </View>
) : null}
```

The proposal §State map explicitly specified: "Jobs error: `sync.failed` tone card, `signalDanger` heading, error message. **Add a [Retry] `<Pressable>` below the error text.**"

Without a Retry button, the only way to reload after an error is the [Refresh] buttons (header or scroll area). The header Refresh is an undifferentiated control — on a technician who has never seen the error card before, recovery path is not obvious.

**Recommendation:** Add a [Retry] `<Pressable>` below the error text in the `jobsStatus === "error"` block:

```tsx
<Pressable
  onPress={() => void load()}
  style={{
    ...mobileRouteShellStyles.control,
    backgroundColor: mobileRouteShellPalette.rail,
    marginTop: 10,
  }}
>
  <Text style={{ color: mobileRouteShellPalette.inverseText, fontSize: 13, fontWeight: "800" }}>
    Retry
  </Text>
</Pressable>
```

---

### 6. `readinessLabel` color inconsistency between section and later-row

In `RouteSection`, the `readinessLabel` style uses `color: secondaryText`. In `LaterRouteRow`, the `laterReadiness` style uses `color: accentText`. These are the same semantic field (`item.readinessLabel`) rendered in two different views.

The proposal specified `color: secondaryText, fontSize: xs, fontWeight: bold` for the section-header readiness label (§5), and `color: accentText` for the later-row readiness (§7). So the color divergence between the two views is intentional per proposal — the later-row readiness uses accent to stand out in the compact scan context. This is consistent with the proposal. No change needed.

**Verdict:** Not a bug — intentional per proposal. Noting it here because it looks inconsistent in isolation.

---

## Deferred items (acceptable per codex-review)

- **Login and loading screen token wiring** — `status === "loading"` and `status === "signed_out"` still use hardcoded hex values. Codex-review classed this as Adapt with the caveat to include "only if it stays small." Codex deferred it — acceptable. Outstanding for a follow-up.
- **Focused later stop collapse affordance** — `onFocusJob` expands the row but there is no toggle to collapse it. Open question 6 in the proposal; codex-review said "add as small improvement only after confirming current tap behavior." Deferred — acceptable.
- **Later-row readiness label suppression** — the proposal suggested hiding readiness labels for "complete" or "no-action-needed" states. Not implemented. Low severity; deferred is acceptable.
- **`Sync needed` vs `Sync attention needed`** — codex-review said simulator verification should decide. The original label remains. If narrow-screen testing confirms wrapping, this should be addressed alongside issue 3 above.

---

## Verification needed after fixes

1. **Issue 1 (duplicate Refresh):** After removing the header Refresh, confirm the scroll-area Refresh still reloads `useAssignedJobs` correctly and the header readiness count updates after load completes.
2. **Issue 2 (`demoNextLabel` content):** Open the app in a signed-in state and read the readiness card second and third text lines. If they display demo placeholder strings, the domain function needs production content before release.
3. **Issue 3 (sync copy):** Verify all six detail lines in a narrow viewport (375 px) — confirm the `offline` state detail line no longer wraps to a third line.
4. **Issue 4 (zero counts):** Sign in with no queued work and confirm the summary row shows only the `formatLastSync` chip, not `"0 pending  0 failed  0 synced"`.
5. **Issue 5 (Retry button):** Trigger an error state (e.g. simulate network failure during load) and confirm the [Retry] button appears below the error text and calls `load()` correctly.

---

## Suggested ordering

**Before any operator-facing release:**
- **Issue 2** — confirm `demoNextLabel` / `demoNextSummary` are not showing demo placeholder copy to operators. If they are, this is the highest-priority fix.
- **Issue 5** — add the [Retry] button to the error state. 10-line patch, no behavior change beyond making recovery obvious.

**Quick wins (copy + noise):**
- **Issue 3** — update the six `detailLabel` strings. Copy-only, no logic change.
- **Issue 4** — zero-count suppression. Three conditional renders.

**Composition cleanup:**
- **Issue 1** — remove the header Refresh button. One deletion from `MobileTechnicianHeader`, `onRefreshJobs` prop can be left on the interface for future use or removed.
