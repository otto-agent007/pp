import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  getMobileWorkModeForJob,
} from "@pest-patrol/domain";
import type {
  MobileDailyRouteTimeline,
  MobileRouteTimelineJob,
  MobileWorkModeId,
} from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";
import type { StatusPillTone } from "@pest-patrol/ui-native";

import {
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { AssignedJobCard } from "./AssignedJobCard";

const statusTones: Record<JobStatus, StatusPillTone> = {
  canceled: "neutral",
  completed: "success",
  en_route: "info",
  in_progress: "warning",
  scheduled: "neutral",
};

interface MobileRouteTimelineProps {
  focusedJobId?: string | null;
  onFocusJob?: (jobId: string) => void;
  renderJobControls: (job: Job, workPlan: MobileRouteTimelineJob["workPlan"]) => ReactNode;
  statusLabels: Record<JobStatus, string>;
  timeline: MobileDailyRouteTimeline;
  workModeLabels: Record<MobileWorkModeId, string>;
  workModeSummaries: Record<MobileWorkModeId, string>;
}

function formatRouteTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function RouteSection({
  item,
  renderJobControls,
  statusLabels,
  workModeLabels,
  workModeSummaries,
}: {
  item: MobileRouteTimelineJob;
  renderJobControls: (
    job: Job,
    workPlan: MobileRouteTimelineJob["workPlan"],
  ) => ReactNode;
  statusLabels: Record<JobStatus, string>;
  workModeLabels: Record<MobileWorkModeId, string>;
  workModeSummaries: Record<MobileWorkModeId, string>;
}) {
  const workMode = getMobileWorkModeForJob(item.job);

  return (
    <View style={styles.routeSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{item.sectionLabel}</Text>
        <View style={styles.sectionMeta}>
          <Text style={styles.readinessLabel}>{item.readinessLabel}</Text>
          <Text style={styles.nextActionLabel}>{item.nextAction.label}</Text>
          <Text style={styles.stopSyncLabel}>{item.syncTriage.label}</Text>
        </View>
      </View>
      <AssignedJobCard
        address={item.job.location?.address}
        customerName={item.job.customer?.name}
        notes={item.job.service_notes}
        scheduledStart={item.job.scheduled_start}
        statusLabel={statusLabels[item.job.status]}
        statusTone={statusTones[item.job.status]}
        workModeBadgeTone={workMode.badgeTone}
        workModeLabel={workModeLabels[workMode.id] ?? workMode.label}
        workModeSummary={workModeSummaries[workMode.id] ?? workMode.summary}
        workPlan={item.workPlan}
      >
        {renderJobControls(item.job, item.workPlan)}
      </AssignedJobCard>
    </View>
  );
}

function LaterRouteRow({
  item,
  onFocusJob,
  statusLabels,
}: {
  item: MobileRouteTimelineJob;
  onFocusJob?: (jobId: string) => void;
  statusLabels: Record<JobStatus, string>;
}) {
  return (
    <Pressable
      onPress={() => onFocusJob?.(item.job.id)}
      style={styles.laterRow}
    >
      <View style={styles.laterTime}>
        <Text style={styles.laterTimeText}>{formatRouteTime(item.job.scheduled_start)}</Text>
      </View>
      <View style={styles.laterCopy}>
        <Text style={styles.laterCustomer}>
          {item.job.customer?.name ?? "Unknown customer"}
        </Text>
        <Text style={styles.laterAddress}>
          {item.job.location?.address ?? "No location saved"}
        </Text>
        <Text style={styles.laterReadiness}>{item.readinessLabel}</Text>
        <Text style={styles.laterNextAction}>{item.nextAction.label}</Text>
        <Text style={styles.laterSync}>{item.syncTriage.label}</Text>
      </View>
      <View style={styles.laterStatus}>
        <Text style={styles.laterStatusText}>{statusLabels[item.job.status]}</Text>
      </View>
    </Pressable>
  );
}

export function MobileRouteTimeline({
  focusedJobId,
  onFocusJob,
  renderJobControls,
  statusLabels,
  timeline,
  workModeLabels,
  workModeSummaries,
}: MobileRouteTimelineProps) {
  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.title}>{timeline.summary.title}</Text>
        <Text style={styles.summaryLabel}>{timeline.summary.label}</Text>
        <Text style={styles.syncLabel}>{timeline.summary.syncLabel}</Text>
      </View>

      {timeline.current ? (
        <RouteSection
          item={timeline.current}
          renderJobControls={renderJobControls}
          statusLabels={statusLabels}
          workModeLabels={workModeLabels}
          workModeSummaries={workModeSummaries}
        />
      ) : null}

      {timeline.next ? (
        <RouteSection
          item={timeline.next}
          renderJobControls={renderJobControls}
          statusLabels={statusLabels}
          workModeLabels={workModeLabels}
          workModeSummaries={workModeSummaries}
        />
      ) : null}

      {timeline.later.length > 0 ? (
        <View style={styles.laterSection}>
          <Text style={styles.sectionLabel}>Later today</Text>
          {timeline.later.map((item) => (
            item.job.id === focusedJobId ? (
              <RouteSection
                item={item}
                key={item.job.id}
                renderJobControls={renderJobControls}
                statusLabels={statusLabels}
                workModeLabels={workModeLabels}
                workModeSummaries={workModeSummaries}
              />
            ) : (
              <LaterRouteRow
                item={item}
                key={item.job.id}
                onFocusJob={onFocusJob}
                statusLabels={statusLabels}
              />
            )
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  laterAddress: {
    color: mobileRouteShellPalette.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  laterCopy: {
    flex: 1,
    gap: 2,
  },
  laterCustomer: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: 14,
    fontWeight: "800",
  },
  laterReadiness: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  laterNextAction: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: 12,
    fontWeight: "800",
  },
  laterSync: {
    color: mobileRouteShellPalette.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },
  laterRow: {
    alignItems: "flex-start",
    ...mobileRouteShellStyles.compactCard,
    flexDirection: "row",
    gap: 10,
  },
  laterSection: {
    gap: 8,
  },
  laterStatus: {
    backgroundColor: mobileRouteShellPalette.routeSoft,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  laterStatusText: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 11,
    fontWeight: "800",
  },
  laterTime: {
    minWidth: 58,
  },
  laterTimeText: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 13,
    fontWeight: "800",
  },
  readinessLabel: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 12,
    fontWeight: "700",
  },
  nextActionLabel: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
  },
  routeSection: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  stopSyncLabel: {
    color: mobileRouteShellPalette.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    backgroundColor: mobileRouteShellPalette.rail,
    borderColor: mobileRouteShellPalette.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  summaryLabel: {
    color: mobileRouteShellPalette.inverseText,
    fontSize: 15,
    fontWeight: "800",
  },
  syncLabel: {
    color: mobileRouteShellPalette.inverseText,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: mobileRouteShellPalette.inverseText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
