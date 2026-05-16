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

export const mobileCaptureControlStyles = {
  disabledButton: {
    alignItems: "center",
    backgroundColor: mobileRouteShellPalette.borderStrong,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  errorText: {
    color: mobileRouteShellPalette.signalDanger,
    fontSize: fontSize.sm,
  },
  fieldLabel: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  input: {
    backgroundColor: mobileRouteShellPalette.surface,
    borderColor: mobileRouteShellPalette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: mobileRouteShellPalette.primaryText,
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  inputMultiline: {
    minHeight: 72,
    paddingVertical: spacing[3],
    textAlignVertical: "top",
  },
  primaryButton: {
    ...mobileRouteShellStyles.control,
    backgroundColor: mobileRouteShellPalette.rail,
  },
  primaryButtonText: {
    color: mobileRouteShellPalette.inverseText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  preview: {
    backgroundColor: mobileRouteShellPalette.surfaceSubtle,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  secondaryButton: {
    ...mobileRouteShellStyles.control,
    backgroundColor: mobileRouteShellPalette.surface,
    borderColor: mobileRouteShellPalette.borderStrong,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  section: {
    borderColor: mobileRouteShellPalette.border,
    borderTopWidth: 1,
    gap: spacing[3],
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  successText: {
    color: mobileRouteShellPalette.signalSynced,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  title: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  warningBody: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  warningButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: mobileRouteShellPalette.rail,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing[3],
  },
  warningCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "100%",
    gap: spacing[2],
    padding: spacing[3],
  },
  warningTitle: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
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
    failed: toneStyle(status.sync.failed),
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

export function getVisitFlowTone(
  state?: "done" | "failed" | "missing" | "pending",
) {
  if (state === "done") {
    return mobileRouteShellTone.visit.done;
  }

  if (state === "failed") {
    return mobileRouteShellTone.visit.failed;
  }

  if (state === "pending") {
    return mobileRouteShellTone.visit.pending;
  }

  return mobileRouteShellTone.visit.missing;
}
