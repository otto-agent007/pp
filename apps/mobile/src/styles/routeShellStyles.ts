import {
  duration,
  fontSize,
  fontWeight,
  lightTheme,
  radius,
  spacing,
  status,
} from "@pest-patrol/ui-tokens";

const toneStyle = (tone: {
  bg: string;
  border: string;
}) =>
  ({
    backgroundColor: tone.bg,
    borderColor: tone.border,
  }) as const;

export const mobileRouteShellPalette = {
  accentText: lightTheme.status.enRoute,
  border: lightTheme.border.subtle,
  borderStrong: lightTheme.border.strong,
  canvas: lightTheme.background.canvas,
  inverseText: lightTheme.text.inverse,
  mutedText: lightTheme.text.muted,
  primaryText: lightTheme.text.primary,
  rail: lightTheme.background.inverse,
  routeSoft: status.job.en_route.bg,
  secondaryText: lightTheme.text.secondary,
  signalDanger: status.sync.failed.solid,
  signalMissing: status.alert.neutral.solid,
  signalQueued: status.sync.retrying.solid,
  signalSynced: status.sync.synced.solid,
  surface: lightTheme.background.surface,
  surfaceSubtle: lightTheme.background.subtle,
} as const;

export const mobileRouteShellStyles = {
  card: {
    backgroundColor: mobileRouteShellPalette.surface,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  compactCard: {
    backgroundColor: mobileRouteShellPalette.surface,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
  },
  control: {
    alignItems: "center",
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  label: {
    color: mobileRouteShellPalette.accentText,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  screen: {
    backgroundColor: mobileRouteShellPalette.canvas,
    flex: 1,
    padding: spacing[6],
    paddingTop: spacing[14],
  },
  transitionMs: duration.base,
} as const;

export const mobileRouteShellTone = {
  sync: {
    failed: toneStyle(status.sync.failed),
    idle: toneStyle(status.alert.neutral),
    offline: toneStyle(status.sync.retrying),
    ready: toneStyle(status.sync.queued),
    synced: toneStyle(status.sync.synced),
  },
  visit: {
    done: toneStyle(status.sync.synced),
    missing: toneStyle(status.alert.neutral),
    pending: toneStyle(status.sync.retrying),
  },
} as const;

export function getMobileSyncTone({
  hasFailures,
  hasPendingItems,
  hasSyncHistory,
  isOffline,
}: {
  hasFailures: boolean;
  hasPendingItems: boolean;
  hasSyncHistory: boolean;
  isOffline: boolean;
}) {
  if (isOffline) {
    return mobileRouteShellTone.sync.offline;
  }

  if (hasFailures) {
    return mobileRouteShellTone.sync.failed;
  }

  if (hasPendingItems) {
    return mobileRouteShellTone.sync.ready;
  }

  return hasSyncHistory
    ? mobileRouteShellTone.sync.synced
    : mobileRouteShellTone.sync.idle;
}

export function getVisitFlowTone(state?: "done" | "missing" | "pending") {
  if (state === "done") {
    return mobileRouteShellTone.visit.done;
  }

  if (state === "pending") {
    return mobileRouteShellTone.visit.pending;
  }

  return mobileRouteShellTone.visit.missing;
}
