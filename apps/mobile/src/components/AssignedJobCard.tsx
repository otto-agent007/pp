import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brand, radius, semantic } from "@pest-patrol/ui-tokens";

export interface AssignedJobCardProps {
  address?: string | null;
  children?: ReactNode;
  customerName?: string | null;
  notes?: string | null;
  scheduledStart: string;
  statusLabel: string;
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

      {children ? <View style={styles.controls}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  address: {
    color: semantic.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    marginTop: 10,
  },
  card: {
    backgroundColor: semantic.background.surface,
    borderColor: semantic.border.subtle,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  controls: {
    gap: 10,
    marginTop: 14,
  },
  customer: {
    color: semantic.text.primary,
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
    color: semantic.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  notesBox: {
    backgroundColor: semantic.background.canvas,
    borderColor: semantic.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  notesLabel: {
    color: brand.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusPill: {
    backgroundColor: semantic.status.info.bg,
    borderColor: semantic.status.info.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: brand.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  time: {
    color: brand.primary,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  timeLabel: {
    color: semantic.text.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
  },
});
