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

export function SyncStatusIndicator() {
  const items = useOfflineQueue((state) => state.items);
  const syncNow = useQueueSync((state) => state.syncNow);
  const { activity, lastError, lastSyncAt, networkStatus } = useSyncStatus();
  const summary = useMemo(() => getOfflineQueueSummary(items), [items]);
  const hasReadyItems = useMemo(() => hasReadyOfflineQueueItems(items), [items]);
  const isOffline = networkStatus === "offline";
  const hasFailures = summary.failed > 0 || Boolean(lastError);
  const statusColor = isOffline ? "#F59E0B" : hasFailures ? "#B91C1C" : "#10B981";
  const statusBackground = isOffline ? "#FFFBEB" : hasFailures ? "#FEF2F2" : "#ECFDF5";
  const statusBorder = isOffline ? "#FDE68A" : hasFailures ? "#FECACA" : "#A7F3D0";
  const canSync = hasReadyItems && networkStatus === "online" && activity !== "syncing";

  return (
    <View
      style={{
        backgroundColor: statusBackground,
        borderColor: statusBorder,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: statusColor, fontSize: 13, fontWeight: "800" }}>
        {activity === "syncing" ? "Syncing" : networkStatus === "online" ? "Online" : "Offline"}
      </Text>
      <Text style={{ color: "#374151", fontSize: 13 }}>
        {summary.pending} pending
      </Text>
      <Text style={{ color: "#374151", fontSize: 13 }}>
        {summary.failed} failed
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13 }}>
        {formatLastSync(lastSyncAt)}
      </Text>
      {lastError ? (
        <Text style={{ color: "#B91C1C", fontSize: 13, fontWeight: "700" }}>
          {lastError}
        </Text>
      ) : null}
      {canSync ? (
        <Pressable
          onPress={() => void syncNow()}
          style={{
            alignItems: "center",
            backgroundColor: "#111827",
            borderRadius: 6,
            justifyContent: "center",
            minHeight: 28,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>
            Sync
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
