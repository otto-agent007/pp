import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileJobWorkPlanItem } from "@pest-patrol/domain";

import {
  getVisitFlowTone,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";

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
  title: string;
}> = [
  { control: "jobStatusControls", id: "status", title: "Start visit" },
  { control: "geofenceControls", id: "geofence", title: "Arrive and depart" },
  { control: "treatmentForm", id: "form", title: "Treatment notes" },
  { control: "chemicalLog", id: "chemical", title: "Chemical use" },
  { control: "photoUpload", id: "photo", title: "Photos" },
  { control: "signatureCapture", id: "signature", title: "Signature" },
];

function stateLabel(state?: MobileJobWorkPlanItem["state"]) {
  if (state === "done") {
    return "Done";
  }

  if (state === "pending") {
    return "Queued";
  }

  return "Needed";
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
  const controls = {
    chemicalLog,
    geofenceControls,
    jobStatusControls,
    photoUpload,
    signatureCapture,
    treatmentForm,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visit flow</Text>
      {flowSteps.map((step, index) => {
        const planItem = workPlan.find((item) => item.id === step.id);

        return (
          <View key={step.id} style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSummary}>
                  {planItem?.summary ?? "Complete this step when ready."}
                </Text>
              </View>
              <View
                style={[
                  styles.statePill,
                  getVisitFlowTone(planItem?.state),
                ]}
              >
                <Text style={styles.stateText}>{stateLabel(planItem?.state)}</Text>
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
  stateDone: {
    backgroundColor: getVisitFlowTone("done").backgroundColor,
    borderColor: getVisitFlowTone("done").borderColor,
  },
  stateMissing: {
    backgroundColor: getVisitFlowTone("missing").backgroundColor,
    borderColor: getVisitFlowTone("missing").borderColor,
  },
  statePending: {
    backgroundColor: getVisitFlowTone("pending").backgroundColor,
    borderColor: getVisitFlowTone("pending").borderColor,
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
