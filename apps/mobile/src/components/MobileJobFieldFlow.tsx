import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getMobileWorkModeForJob,
  type MobileJobWorkPlanItem,
  type MobileWorkMode,
  type MobileWorkModeChecklistItem,
  type MobileWorkModeId,
  type MobileWorkModeRequirement,
} from "@pest-patrol/domain";
import type { Job } from "@pest-patrol/types";

import {
  getVisitFlowTone,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
} from "../styles/routeShellStyles";
import { useLanguage } from "../store/useLanguage";

export interface MobileJobFieldFlowProps {
  chemicalLog: ReactNode;
  geofenceControls: ReactNode;
  job?: Job;
  jobStatusControls: ReactNode;
  photoUpload: ReactNode;
  signatureCapture: ReactNode;
  treatmentForm: ReactNode;
  workMode?: MobileWorkMode;
  workPlan: MobileJobWorkPlanItem[];
}

const flowSteps: Array<{
  control: keyof Omit<MobileJobFieldFlowProps, "job" | "workMode" | "workPlan">;
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

function localizedValue(
  record: Record<string, string>,
  key: string,
  fallback: string,
) {
  return record[key] ?? fallback;
}

function requirementStateLabel(
  requirement: MobileWorkModeRequirement,
  labels: {
    needed: string;
    notExpected: string;
    optional: string;
    recommended: string;
  },
) {
  if (requirement === "recommended") return labels.recommended;
  if (requirement === "optional") return labels.optional;
  if (requirement === "not_expected") return labels.notExpected;

  return labels.needed;
}

function checklistStateLabel(
  item: MobileWorkModeChecklistItem,
  planItem: MobileJobWorkPlanItem | undefined,
  labels: {
    done: string;
    failed: string;
    needed: string;
    notExpected: string;
    optional: string;
    queued: string;
    recommended: string;
  },
) {
  if (planItem?.state === "done") return labels.done;
  if (planItem?.state === "pending") return labels.queued;
  if (planItem?.state === "failed") return labels.failed;

  return requirementStateLabel(item.required, labels);
}

function modeWarningKeys(modeId: MobileWorkModeId) {
  if (modeId === "estimate") {
    return ["estimateTreatmentNotRequired", "chemicalIfUsed"] as const;
  }
  if (modeId === "wdo_escrow") return ["officeReviewRequired"] as const;

  return [] as const;
}

export function MobileJobFieldFlow({
  chemicalLog,
  geofenceControls,
  job,
  jobStatusControls,
  photoUpload,
  signatureCapture,
  treatmentForm,
  workMode,
  workPlan,
}: MobileJobFieldFlowProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const workModeCopy = useLanguage((state) => state.t.jobs.workModes);
  const resolvedWorkMode = workMode ?? (job ? getMobileWorkModeForJob(job) : null);
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
      {resolvedWorkMode ? (
        <View style={styles.modePanel}>
          <Text style={styles.title}>
            {localizedValue(
              workModeCopy.labels,
              resolvedWorkMode.id,
              resolvedWorkMode.label,
            )}
          </Text>
          <Text style={styles.summary}>
            {localizedValue(
              workModeCopy.summaries,
              resolvedWorkMode.id,
              resolvedWorkMode.summary,
            )}
          </Text>
          {modeWarningKeys(resolvedWorkMode.id).map((key) => (
            <Text key={key} style={styles.modeWarning}>
              {workModeCopy.warnings[key]}
            </Text>
          ))}
          {resolvedWorkMode.proofExpectations.length > 0 ? (
            <Text style={styles.modeWarning}>
              {workModeCopy.proofExpectations.photoProofExpected}
            </Text>
          ) : null}
          <View style={styles.modeChecklist}>
            {resolvedWorkMode.checklistItems.map((item) => {
              const planItem =
                item.relatedStep === "sync"
                  ? undefined
                  : workPlan.find((candidate) => candidate.id === item.relatedStep);

              return (
                <View key={item.id} style={styles.modeChecklistItem}>
                  <View style={styles.modeChecklistCopy}>
                    <Text style={styles.stepTitle}>
                      {localizedValue(
                        workModeCopy.checklistLabels,
                        item.id,
                        item.label,
                      )}
                    </Text>
                    <Text style={styles.stepSummary}>
                      {localizedValue(
                        workModeCopy.checklistSummaries,
                        item.id,
                        item.summary,
                      )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statePill,
                      getVisitFlowTone(planItem?.state ?? "missing"),
                    ]}
                  >
                    <Text style={styles.stateText}>
                      {checklistStateLabel(item, planItem, copy.fieldFlow.stateLabels)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.title}>{copy.fieldFlow.title}</Text>
          <Text style={styles.summary}>{summary}</Text>
        </>
      )}
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
  modeChecklist: {
    gap: 8,
    marginTop: 2,
  },
  modeChecklistCopy: {
    flex: 1,
    gap: 2,
  },
  modeChecklistItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  modePanel: {
    ...mobileRouteShellStyles.compactCard,
    gap: 8,
  },
  modeWarning: {
    color: mobileRouteShellPalette.accentText,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
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
