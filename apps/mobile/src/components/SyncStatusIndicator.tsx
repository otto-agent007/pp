import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import {
  getOfflineQueueItemLabel,
  getOfflineQueueSummary,
  hasReadyOfflineQueueItems,
} from "@pest-patrol/domain";
import { SyncBadge, type SyncBadgeTone } from "@pest-patrol/ui-native";

import {
  getMobileSyncTone,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { useOfflineQueue } from "../store/useOfflineQueue";
import { useQueueSync } from "../store/useQueueSync";
import { useSyncStatus } from "../store/useSyncStatus";

function formatLastSync(value: string | null) {
  if (!value) {
    return "Not synced";
  }

  return `Synced ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

function formatNextRetry(value: string | null) {
  if (!value) {
    return null;
  }

  return `Next retry ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

export function SyncStatusIndicator() {
  const clearSynced = useOfflineQueue((state) => state.clearSynced);
  const items = useOfflineQueue((state) => state.items);
  const syncNow = useQueueSync((state) => state.syncNow);
  const { activity, lastError, lastSyncAt, networkStatus } = useSyncStatus();
  const summary = useMemo(() => getOfflineQueueSummary(items), [items]);
  const pendingLabels = useMemo(
    () =>
      items
        .filter((item) => item.status !== "synced")
        .slice(0, 4)
        .map((item) => getOfflineQueueItemLabel(item)),
    [items],
  );
  const hasReadyItems = useMemo(() => hasReadyOfflineQueueItems(items), [items]);
  const isOffline = networkStatus === "offline";
  const hasFailures = summary.failed > 0 || Boolean(lastError);
  const hasSyncedItems = summary.synced > 0;
  const hasPendingItems = summary.pending > 0;
  const hasSyncHistory = hasSyncedItems || Boolean(lastSyncAt);
  const canSync =
    hasReadyItems && networkStatus === "online" && activity !== "syncing";
  const syncDisabled = !canSync;
  const nextRetryLabel = formatNextRetry(summary.nextRetryAt);
  const tone = getMobileSyncTone({
    hasFailures,
    hasPendingItems,
    hasSyncHistory,
    isOffline,
  });
  const statusBadgeTone: SyncBadgeTone = hasFailures
    ? "danger"
    : isOffline || hasPendingItems
      ? "warning"
      : hasSyncHistory
        ? "success"
        : "neutral";
  const statusLabel =
    activity === "syncing"
      ? "Syncing now"
      : isOffline
        ? "Offline"
        : hasFailures
          ? "Sync attention needed"
          : hasPendingItems
            ? "Ready to sync"
            : hasSyncHistory
              ? "Synced"
              : "No local changes";
  const detailLabel =
    activity === "syncing"
      ? "Sending saved work to the server. Stay in the app."
      : isOffline
        ? "Work is saved here. Will sync when back online."
        : hasFailures
          ? "Some items failed. Review and try sync again."
          : hasPendingItems
            ? "Saved work is ready to sync."
            : hasSyncedItems
              ? "All work synced. Tap Clear when done reviewing."
              : "Nothing waiting to sync.";
  const manualSyncLabel =
    activity === "syncing"
      ? "Sync in progress"
      : isOffline
        ? "Sync when online"
        : hasReadyItems
          ? "Sync now"
          : "Nothing ready";

  return (
    <View
      style={{
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: mobileRouteShellStyles.card.borderRadius,
        borderWidth: 1,
        gap: 8,
        marginTop: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ gap: 4 }}>
        <SyncBadge
          count={summary.pending > 0 ? summary.pending : undefined}
          tone={statusBadgeTone}
        >
          {statusLabel}
        </SyncBadge>
        <Text
          style={{
            color: mobileRouteShellPalette.secondaryText,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {detailLabel}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {summary.pending > 0 ? (
          <Text style={{ color: mobileRouteShellPalette.secondaryText, fontSize: 13 }}>
            {summary.pending} pending
          </Text>
        ) : null}
        {summary.failed > 0 ? (
          <Text
            style={{
              color: hasFailures
                ? mobileRouteShellPalette.signalDanger
                : mobileRouteShellPalette.secondaryText,
              fontSize: 13,
            }}
          >
            {summary.failed} failed
          </Text>
        ) : null}
        {summary.synced > 0 ? (
          <Text style={{ color: mobileRouteShellPalette.secondaryText, fontSize: 13 }}>
            {summary.synced} synced
          </Text>
        ) : null}
        <Text style={{ color: mobileRouteShellPalette.mutedText, fontSize: 13 }}>
          {formatLastSync(lastSyncAt)}
        </Text>
        {nextRetryLabel ? (
          <Text style={{ color: mobileRouteShellPalette.mutedText, fontSize: 13 }}>
            {nextRetryLabel}
          </Text>
        ) : null}
      </View>
      {lastError ? (
        <Text
          style={{
            color: mobileRouteShellPalette.signalDanger,
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          {lastError}
        </Text>
      ) : null}
      {pendingLabels.length > 0 ? (
        <View style={{ gap: 3 }}>
          {pendingLabels.map((label) => (
            <Text
              key={label}
              style={{
                color: mobileRouteShellPalette.secondaryText,
                fontSize: 12,
              }}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
      {hasPendingItems || activity === "syncing" ? (
        <Pressable
          disabled={syncDisabled}
          onPress={() => void syncNow()}
          style={{
            ...mobileRouteShellStyles.control,
            backgroundColor: syncDisabled
              ? mobileRouteShellPalette.border
              : mobileRouteShellPalette.rail,
          }}
        >
          <Text
            style={{
              color: syncDisabled
                ? mobileRouteShellPalette.mutedText
                : mobileRouteShellPalette.inverseText,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            {manualSyncLabel}
          </Text>
        </Pressable>
      ) : null}
      {hasSyncedItems ? (
        <Pressable
          onPress={clearSynced}
          style={{
            ...mobileRouteShellStyles.control,
            backgroundColor: mobileRouteShellPalette.surface,
            borderColor: mobileRouteShellPalette.border,
            borderWidth: 1,
          }}
        >
          <Text
            style={{
              color: mobileRouteShellPalette.primaryText,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            Clear synced
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
