import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileJobWorkPlanItem } from "@pest-patrol/domain";

export interface AssignedJobCardProps {
  address?: string | null;
  children?: ReactNode;
  customerName?: string | null;
  notes?: string | null;
  scheduledStart: string;
  statusLabel: string;
  workPlan?: MobileJobWorkPlanItem[];
}

function formatAssignedJobTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AssignedJobCard({
  address,
  children,
  customerName,
  notes,
  scheduledStart,
  statusLabel,
  workPlan = [],
}: AssignedJobCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.timeLabel}>Scheduled</Text>
          <Text style={styles.time}>{formatAssignedJobTime(scheduledStart)}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.customer}>{customerName ?? "Unknown customer"}</Text>
        <Text style={styles.address}>{address ?? "No location saved"}</Text>
        {notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notes}>{notes}</Text>
          </View>
        ) : null}
      </View>

      {workPlan.length > 0 ? (
        <View style={styles.workPlan}>
          <Text style={styles.workPlanTitle}>Field work plan</Text>
          {workPlan.map((item) => (
            <View key={item.id} style={styles.workPlanItem}>
              <View
                style={[
                  styles.workPlanDot,
                  item.state === "done"
                    ? styles.workPlanDone
                    : item.state === "pending"
                      ? styles.workPlanPending
                      : styles.workPlanMissing,
                ]}
              />
              <View style={styles.workPlanCopy}>
                <Text style={styles.workPlanLabel}>{item.label}</Text>
                <Text style={styles.workPlanSummary}>{item.summary}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {children ? <View style={styles.controls}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  address: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  controls: {
    gap: 10,
    marginTop: 14,
  },
  customer: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 4,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  notes: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  notesBox: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  notesLabel: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusPill: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "800",
  },
  time: {
    color: "#1E3A8A",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  timeLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  workPlan: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    marginTop: 14,
    padding: 12,
  },
  workPlanCopy: {
    flex: 1,
    gap: 2,
  },
  workPlanDone: {
    backgroundColor: "#047857",
  },
  workPlanDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  workPlanItem: {
    flexDirection: "row",
    gap: 8,
  },
  workPlanLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  workPlanMissing: {
    backgroundColor: "#9CA3AF",
  },
  workPlanPending: {
    backgroundColor: "#B45309",
  },
  workPlanSummary: {
    color: "#4B5563",
    fontSize: 12,
    lineHeight: 16,
  },
  workPlanTitle: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
