import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import {
  getOfflineQueueItemLabel,
  getOfflineQueueRecoveryItems,
  getOfflineQueueSummary,
  hasReadyOfflineQueueItems,
} from "@pest-patrol/domain";
import type { MutationOutcomeKind } from "@pest-patrol/types";
import { SyncBadge, type SyncBadgeTone } from "@pest-patrol/ui-native";

import {
  getMobileSyncTone,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { useLanguage } from "../store/useLanguage";
import {
  hasMobilePersistenceFailure,
  useMobilePersistenceHealth,
} from "../store/mobilePersistenceHealth";
import { useOfflineQueue } from "../store/useOfflineQueue";
import { useQueueSync } from "../store/useQueueSync";
import { useSyncStatus } from "../store/useSyncStatus";

function formatLastSync(
  value: string | null,
  copy: { notSynced: string; syncedAt: string },
) {
  if (!value) {
    return copy.notSynced;
  }

  return `${copy.syncedAt} ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

function formatNextRetry(
  value: string | null,
  copy: { nextRetryAt: string },
) {
  if (!value) {
    return null;
  }

  return `${copy.nextRetryAt} ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

/**
 * What a stopped item means to the technician, rather than what it means to the
 * queue.
 *
 * CR19 recorded `outcome` on every item and nothing read it: the screen showed
 * one "failed" count whether the write had lost a race or could never apply.
 * A conflict sends the technician to the job to look; a terminal failure sends
 * them to redo the work. `unknown` covers an item marked failed before this
 * field existed.
 */
function recoveryOutcomeLabel(
  outcome: MutationOutcomeKind | null,
  copy: { conflict: string; terminal: string; unknown: string },
) {
  if (outcome === "conflict") {
    return copy.conflict;
  }

  if (outcome === "terminal") {
    return copy.terminal;
  }

  return copy.unknown;
}

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template,
  );
}

export function SyncStatusIndicator() {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const clearSynced = useOfflineQueue((state) => state.clearSynced);
  const discard = useOfflineQueue((state) => state.discard);
  const items = useOfflineQueue((state) => state.items);
  const rejected = useOfflineQueue((state) => state.rejected);
  const persistenceFailures = useMobilePersistenceHealth(
    (state) => state.failures,
  );
  const syncNow = useQueueSync((state) => state.syncNow);
  const { activity, lastError, lastSyncAt, networkStatus } = useSyncStatus();
  const summary = useMemo(() => getOfflineQueueSummary(items), [items]);
  const pendingLabels = useMemo(
    () =>
      items
        // A stopped item is listed in the recovery section below, with what
        // happened to it and a way out. Repeating it here as a bare label read
        // as work still in flight.
        .filter((item) => item.status !== "synced" && item.status !== "failed")
        .slice(0, 4)
        .map((item) => getOfflineQueueItemLabel(item)),
    [items],
  );
  const recoveryItems = useMemo(
    () => getOfflineQueueRecoveryItems(items, rejected),
    [items, rejected],
  );
  const hasReadyItems = useMemo(() => hasReadyOfflineQueueItems(items), [items]);
  const isOffline = networkStatus === "offline";
  // Entries the persisted-queue validation refused are failures too, and they
  // are not in the item summary, so counting only summary.failed would leave
  // the card looking calm while unreadable field work sat under it.
  // A device that has stopped storing writes is a failure of the same kind:
  // the queue looks healthy in memory while nothing behind it would survive a
  // restart. Folding it into hasFailures is what turns the card red and offers
  // the sync button, which is the one action that gets the work off the device.
  const hasStorageFailure = hasMobilePersistenceFailure(persistenceFailures);
  const hasFailures =
    recoveryItems.length > 0 || Boolean(lastError) || hasStorageFailure;
  const hasSyncedItems = summary.synced > 0;
  const hasPendingItems = summary.pending > 0;
  const hasSyncHistory = hasSyncedItems || Boolean(lastSyncAt);
  const canSync =
    hasReadyItems && networkStatus === "online" && activity !== "syncing";
  const syncDisabled = !canSync;
  const nextRetryLabel = formatNextRetry(summary.nextRetryAt, copy.sync);
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
      ? copy.sync.syncingNow
      : isOffline
        ? copy.sync.savedOffline
        : hasFailures
          ? copy.sync.failedTitle
          : hasPendingItems
            ? copy.sync.queuedTitle
            : hasSyncHistory
              ? copy.sync.syncedTitle
              : copy.sync.noLocalChanges;
  const detailLabel =
    activity === "syncing"
      ? copy.sync.syncingNow
      : isOffline
        ? copy.sync.offlineDetail
        : hasFailures
          ? copy.sync.failedDetail
          : hasPendingItems
            ? copy.sync.pendingDetail
            : hasSyncedItems
              ? copy.sync.syncedDetail
              : copy.sync.noItemsWaiting;
  const manualSyncLabel =
    activity === "syncing"
      ? copy.sync.syncingNow
      : isOffline
        ? copy.sync.syncWhenOnline
        : hasFailures
          ? copy.sync.retrySync
          : hasReadyItems
            ? copy.sync.syncNow
            : copy.sync.noItemsWaiting;

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
        {summary.queued > 0 ? (
          <Text style={{ color: mobileRouteShellPalette.secondaryText, fontSize: 13 }}>
            {interpolate(copy.sync.counts.queued, { count: String(summary.queued) })}
          </Text>
        ) : null}
        {summary.retrying > 0 ? (
          <Text style={{ color: mobileRouteShellPalette.secondaryText, fontSize: 13 }}>
            {interpolate(copy.sync.counts.retrying, {
              count: String(summary.retrying),
            })}
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
            {interpolate(copy.sync.counts.failed, { count: String(summary.failed) })}
          </Text>
        ) : null}
        {summary.synced > 0 ? (
          <Text style={{ color: mobileRouteShellPalette.secondaryText, fontSize: 13 }}>
            {interpolate(copy.sync.counts.synced, { count: String(summary.synced) })}
          </Text>
        ) : null}
        <Text style={{ color: mobileRouteShellPalette.mutedText, fontSize: 13 }}>
          {formatLastSync(lastSyncAt, copy.sync)}
        </Text>
        {nextRetryLabel ? (
          <Text style={{ color: mobileRouteShellPalette.mutedText, fontSize: 13 }}>
            {nextRetryLabel}
          </Text>
        ) : null}
      </View>
      {hasStorageFailure ? (
        <View style={{ gap: 3 }}>
          <Text
            style={{
              color: mobileRouteShellPalette.signalDanger,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {copy.sync.storageFailedTitle}
          </Text>
          <Text
            style={{
              color: mobileRouteShellPalette.secondaryText,
              fontSize: 12,
              lineHeight: 17,
            }}
          >
            {copy.sync.storageFailedDetail}
          </Text>
        </View>
      ) : null}
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
      {recoveryItems.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: mobileRouteShellPalette.signalDanger,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {copy.sync.recoveryTitle}
          </Text>
          <Text
            style={{
              color: mobileRouteShellPalette.secondaryText,
              fontSize: 12,
              lineHeight: 17,
            }}
          >
            {copy.sync.recoveryDetail}
          </Text>
          {recoveryItems.map((recoveryItem) => (
            <View
              key={recoveryItem.id}
              style={{
                ...mobileRouteShellStyles.compactCard,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: mobileRouteShellPalette.primaryText,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {recoveryItem.label}
              </Text>
              <Text
                style={{
                  color: mobileRouteShellPalette.secondaryText,
                  fontSize: 12,
                  lineHeight: 17,
                }}
              >
                {recoveryOutcomeLabel(recoveryItem.outcome, copy.sync.outcomes)}
              </Text>
              <Text
                style={{
                  color: mobileRouteShellPalette.signalDanger,
                  fontSize: 12,
                }}
              >
                {recoveryItem.lastError}
              </Text>
              <Pressable
                onPress={() => discard(recoveryItem.id)}
                style={{
                  ...mobileRouteShellStyles.control,
                  backgroundColor: mobileRouteShellPalette.surface,
                  borderColor: mobileRouteShellPalette.borderStrong,
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
                  {copy.sync.discard}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {hasPendingItems || activity === "syncing" || hasFailures ? (
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
            {copy.sync.clearSynced}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
