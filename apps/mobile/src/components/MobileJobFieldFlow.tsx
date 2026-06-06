import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileJobWorkPlanItem } from "@pest-patrol/domain";

import {
  getVisitFlowTone,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { useLanguage } from "../store/useLanguage";

export interface MobileJobFieldFlowProps {
  chemicalLog: ReactNode;
  geofenceControls: ReactNode;
  jobStatusControls: ReactNode;
  photoUpload: ReactNode;
  signatureCapture: ReactNode;
  treatmentForm: ReactNode;
  workPlan: MobileJobWorkPlanItem[];
}

const flowSteps: Array<{
  control: keyof Omit<MobileJobFieldFlowProps, "workPlan">;
  id: MobileJobWorkPlanItem["id"];
}> = [
  { control: "jobStatusControls", id: "status" },
  { control: "geofenceControls", id: "geofence" },
  { control: "treatmentForm", id: "form" },
  { control: "chemicalLog", id: "chemical" },
  { control: "photoUpload", id: "photo" },
  { control: "signatureCapture", id: "signature" },
];

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template,
  );
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

export function MobileJobFieldFlow({
  chemicalLog,
  geofenceControls,
  jobStatusControls,
  photoUpload,
  signatureCapture,
  treatmentForm,
  workPlan,
}: MobileJobFieldFlowProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const controls = {
    chemicalLog,
    geofenceControls,
    jobStatusControls,
    photoUpload,
    signatureCapture,
    treatmentForm,
  };
  const doneCount = workPlan.filter((item) => item.state === "done").length;
  const queuedCount = workPlan.filter((item) => item.state === "pending").length;
  const failedCount = workPlan.filter((item) => item.state === "failed").length;
  const neededCount = workPlan.filter((item) => item.state === "missing").length;
  const summary = interpolate(copy.fieldFlow.summary, {
    done: String(doneCount),
    failed: String(failedCount),
    needed: String(neededCount),
    queued: String(queuedCount),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.fieldFlow.title}</Text>
      <Text style={styles.summary}>{summary}</Text>
      {flowSteps.map((step, index) => {
        const planItem = workPlan.find((item) => item.id === step.id);
        const stepState = planItem?.state ?? "missing";
        const copyState = normalizeFieldFlowState(stepState);

        return (
          <View key={step.id} style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{copy.fieldFlow.steps[step.id]}</Text>
                <Text style={styles.stepSummary}>
                  {copy.fieldFlow.stateSummaries[copyState]}
                </Text>
              </View>
              <View
                style={[
                  styles.statePill,
                  getVisitFlowTone(stepState),
                ]}
              >
                <Text style={styles.stateText}>
                  {copy.fieldFlow.stateLabels[copyState]}
                </Text>
              </View>
            </View>
            <View style={styles.stepControl}>{controls[step.control]}</View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  statePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stateText: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: 11,
    fontWeight: "800",
  },
  step: {
    ...mobileRouteShellStyles.compactCard,
  },
  stepControl: {
    marginTop: 10,
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  stepHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  stepNumber: {
    backgroundColor: mobileRouteShellPalette.rail,
    borderRadius: 999,
    color: mobileRouteShellPalette.inverseText,
    fontSize: 12,
    fontWeight: "800",
    height: 24,
    lineHeight: 24,
    textAlign: "center",
    width: 24,
  },
  stepSummary: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  summary: {
    color: mobileRouteShellPalette.secondaryText,
    fontSize: 12,
    fontWeight: "700",
  },
  stepTitle: {
    color: mobileRouteShellPalette.primaryText,
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
