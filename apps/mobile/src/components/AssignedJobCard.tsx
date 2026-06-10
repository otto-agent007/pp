import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  MobileJobWorkPlanItem,
  MobileWorkModeBadgeTone,
} from "@pest-patrol/domain";
import { StatusPill } from "@pest-patrol/ui-native";

import {
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { useLanguage } from "../store/useLanguage";

export interface AssignedJobCardProps {
  address?: string | null;
  children?: ReactNode;
  classificationLabel?: string | null;
  classificationSummary?: string | null;
  customerName?: string | null;
  notes?: string | null;
  scheduledStart: string;
  statusLabel: string;
  statusTone?: "danger" | "info" | "neutral" | "success" | "warning";
  workModeBadgeTone?: MobileWorkModeBadgeTone;
  workModeLabel?: string | null;
  workModeSummary?: string | null;
  workPlan?: MobileJobWorkPlanItem[];
}

function formatAssignedJobTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

type LocalizedFieldFlowState = "done" | "failed" | "needed" | "queued";

function normalizeFieldFlowState(
  state: MobileJobWorkPlanItem["state"],
): LocalizedFieldFlowState {
  switch (state) {
    case "done":
      return "done";
    case "failed":
      return "failed";
    case "missing":
      return "needed";
    case "pending":
      return "queued";
    default:
      return "needed";
  }
}

export function AssignedJobCard({
  address,
  children,
  classificationLabel,
  classificationSummary,
  customerName,
  notes,
  scheduledStart,
  statusLabel,
  statusTone = "info",
  workModeBadgeTone = "neutral",
  workModeLabel,
  workModeSummary,
  workPlan = [],
}: AssignedJobCardProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const displayModeLabel = workModeLabel ?? classificationLabel;
  const displayModeSummary = workModeSummary ?? classificationSummary;
  const localizedWorkPlan = useMemo(
    () =>
      workPlan.map((item) => ({
        ...item,
        normalizedState: normalizeFieldFlowState(item.state),
        label: copy.fieldFlow.steps[item.id],
        stateLabel: copy.fieldFlow.stateLabels[
          normalizeFieldFlowState(item.state)
        ],
        summary:
          copy.fieldFlow.stateSummaries[normalizeFieldFlowState(item.state)],
      })),
    [
      copy.fieldFlow.stateLabels,
      copy.fieldFlow.stateSummaries,
      copy.fieldFlow.steps,
      workPlan,
    ],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.timeLabel}>Scheduled</Text>
          <Text style={styles.time}>{formatAssignedJobTime(scheduledStart)}</Text>
        </View>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </View>

      <View style={styles.body}>
        {displayModeLabel ? (
          <View
            style={[
              styles.classificationBox,
              workModeBadgeTone === "danger"
                ? styles.workModeDanger
                : workModeBadgeTone === "info"
                  ? styles.workModeInfo
                  : workModeBadgeTone === "success"
                    ? styles.workModeSuccess
                    : workModeBadgeTone === "warning"
                      ? styles.workModeWarning
                      : styles.workModeNeutral,
            ]}
          >
            <Text style={styles.classificationLabel}>{displayModeLabel}</Text>
            {displayModeSummary ? (
              <Text style={styles.classificationSummary}>
                {displayModeSummary}
              </Text>
            ) : null}
          </View>
        ) : null}
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
          <Text style={styles.workPlanTitle}>{copy.fieldFlow.title}</Text>
          {localizedWorkPlan.map((item) => (
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
              <View
                style={[
                  styles.workPlanState,
                  item.state === "done"
                    ? styles.workPlanDone
                    : item.state === "pending"
                      ? styles.workPlanPending
                      : item.state === "failed"
                        ? styles.workPlanFailed
                        : styles.workPlanMissing,
                ]}
              >
                <Text style={styles.workPlanStateText}>{item.stateLabel}</Text>
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
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    marginTop: 10,
  },
  card: {
    ...mobileRouteShellStyles.card,
  },
  classificationBox: {
    backgroundColor: mobileRouteShellPalette.routeSoft,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: mobileRouteShellStyles.card.borderRadius,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  classificationLabel: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  classificationSummary: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  controls: {
    gap: 10,
    marginTop: 14,
  },
  customer: {
    color: mobileRouteShellPalette.primaryText,
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
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  notesBox: {
    backgroundColor: mobileRouteShellPalette.surfaceSubtle,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: mobileRouteShellStyles.card.borderRadius,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  notesLabel: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  time: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  timeLabel: {
    color: mobileRouteShellPalette.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  workPlan: {
    backgroundColor: mobileRouteShellPalette.surfaceSubtle,
    borderColor: mobileRouteShellPalette.border,
    borderRadius: mobileRouteShellStyles.card.borderRadius,
    borderWidth: 1,
    gap: 9,
    marginTop: 14,
    padding: 12,
  },
  workPlanCopy: {
    flex: 1,
    gap: 2,
  },
  workPlanFailed: {
    backgroundColor: mobileRouteShellPalette.signalDanger,
  },
  workPlanDone: {
    backgroundColor: mobileRouteShellPalette.signalSynced,
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
    alignItems: "flex-start",
  },
  workPlanLabel: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: 13,
    fontWeight: "800",
  },
  workPlanMissing: {
    backgroundColor: mobileRouteShellPalette.signalMissing,
  },
  workPlanPending: {
    backgroundColor: mobileRouteShellPalette.signalQueued,
  },
  workPlanState: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  workPlanStateText: {
    color: mobileRouteShellPalette.inverseText,
    fontSize: 11,
    fontWeight: "800",
  },
  workPlanSummary: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  workPlanTitle: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  workModeDanger: {
    borderColor: mobileRouteShellPalette.signalDanger,
  },
  workModeInfo: {
    borderColor: mobileRouteShellPalette.rail,
  },
  workModeNeutral: {
    borderColor: mobileRouteShellPalette.border,
  },
  workModeSuccess: {
    borderColor: mobileRouteShellPalette.signalSynced,
  },
  workModeWarning: {
    borderColor: mobileRouteShellPalette.signalQueued,
  },
});
