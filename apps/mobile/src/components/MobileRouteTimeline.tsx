import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileDailyRouteTimeline, MobileRouteTimelineJob } from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";

import { AssignedJobCard } from "./AssignedJobCard";

interface MobileRouteTimelineProps {
  focusedJobId?: string | null;
  onFocusJob?: (jobId: string) => void;
  renderJobControls: (job: Job) => ReactNode;
  statusLabels: Record<JobStatus, string>;
  timeline: MobileDailyRouteTimeline;
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
}: {
  item: MobileRouteTimelineJob;
  renderJobControls: (job: Job) => ReactNode;
  statusLabels: Record<JobStatus, string>;
}) {
  return (
    <View style={styles.routeSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{item.sectionLabel}</Text>
        <Text style={styles.readinessLabel}>{item.readinessLabel}</Text>
      </View>
      <AssignedJobCard
        address={item.job.location?.address}
        customerName={item.job.customer?.name}
        notes={item.job.service_notes}
        scheduledStart={item.job.scheduled_start}
        statusLabel={statusLabels[item.job.status]}
        workPlan={item.workPlan}
      >
        {renderJobControls(item.job)}
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
        />
      ) : null}

      {timeline.next ? (
        <RouteSection
          item={timeline.next}
          renderJobControls={renderJobControls}
          statusLabels={statusLabels}
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
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16,
  },
  laterCopy: {
    flex: 1,
    gap: 2,
  },
  laterCustomer: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  laterReadiness: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  laterRow: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  laterSection: {
    gap: 8,
  },
  laterStatus: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  laterStatusText: {
    color: "#1E3A8A",
    fontSize: 11,
    fontWeight: "800",
  },
  laterTime: {
    minWidth: 58,
  },
  laterTimeText: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "800",
  },
  readinessLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
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
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summary: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  summaryLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  syncLabel: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
