import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import {
  getOfflineQueueSummary,
  hasReadyOfflineQueueItems,
} from "@pest-patrol/domain";

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
  const statusColor = isOffline ? "#B45309" : hasFailures ? "#B91C1C" : "#047857";
  const statusBackground = isOffline
    ? "#FFFBEB"
    : hasFailures
      ? "#FEF2F2"
      : "#ECFDF5";
  const statusBorder = isOffline ? "#FDE68A" : hasFailures ? "#FECACA" : "#A7F3D0";
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
      ? "Sending queued updates. Keep the app open until this finishes."
      : isOffline
        ? "Work is saved on this device and will stay pending until the connection returns."
        : hasFailures
          ? "Failed items remain visible for review. Use sync after fixing the issue."
          : hasPendingItems
            ? "Queued updates are ready for manual sync."
            : hasSyncedItems
              ? "All visible completed updates are synced. Clear synced when acknowledged."
              : "No local work is waiting to sync.";
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
        backgroundColor: statusBackground,
        borderColor: statusBorder,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        marginTop: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ color: statusColor, fontSize: 13, fontWeight: "800" }}>
          {statusLabel}
        </Text>
        <Text style={{ color: "#374151", fontSize: 13, lineHeight: 18 }}>
          {detailLabel}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Text style={{ color: "#374151", fontSize: 13 }}>
          {summary.pending} pending
        </Text>
        <Text
          style={{ color: hasFailures ? "#B91C1C" : "#374151", fontSize: 13 }}
        >
          {summary.failed} failed
        </Text>
        <Text style={{ color: "#374151", fontSize: 13 }}>
          {summary.synced} synced
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 13 }}>
          {formatLastSync(lastSyncAt)}
        </Text>
        {nextRetryLabel ? (
          <Text style={{ color: "#6B7280", fontSize: 13 }}>
            {nextRetryLabel}
          </Text>
        ) : null}
      </View>
      {lastError ? (
        <Text style={{ color: "#B91C1C", fontSize: 13, fontWeight: "700" }}>
          {lastError}
        </Text>
      ) : null}
      {hasPendingItems || activity === "syncing" ? (
        <Pressable
          disabled={syncDisabled}
          onPress={() => void syncNow()}
          style={{
            alignItems: "center",
            backgroundColor: syncDisabled ? "#E5E7EB" : "#111827",
            borderRadius: 6,
            justifyContent: "center",
            minHeight: 36,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: syncDisabled ? "#6B7280" : "#FFFFFF",
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
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderColor: "#D1D5DB",
            borderRadius: 6,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 36,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "#111827", fontSize: 12, fontWeight: "800" }}>
            Clear synced
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
