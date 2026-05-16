import { Pressable, Text, View } from "react-native";
import {
  buildMobileJobWorkPlan,
  getMobileCompletionReadinessGuard,
} from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";

import { useAssignedJobs } from "../store/useAssignedJobs";
import { useLanguage } from "../store/useLanguage";
import { useOfflineQueue } from "../store/useOfflineQueue";
import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
  mobileRouteShellTone,
} from "../styles/routeShellStyles";

interface JobStatusControlsProps {
  job: Job;
}

const mobileStatuses: JobStatus[] = [
  "scheduled",
  "en_route",
  "in_progress",
  "completed",
];

export function JobStatusControls({ job }: JobStatusControlsProps) {
  const queueStatusUpdate = useAssignedJobs((state) => state.queueStatusUpdate);
  const copy = useLanguage((state) => state.t.jobs);
  const queueItems = useOfflineQueue((state) => state.items);
  const completionGuard = getMobileCompletionReadinessGuard(
    buildMobileJobWorkPlan(job, queueItems),
  );
  const shouldWarnBeforeCompletion =
    job.status !== "completed" && !completionGuard.ready;

  if (job.status === "canceled") {
    return null;
  }

  return (
    <View
      style={{
        ...mobileCaptureControlStyles.section,
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {mobileStatuses.map((status) => {
        const isActive = job.status === status;
        const isGuardedCompletion =
          status === "completed" && shouldWarnBeforeCompletion;

        return (
          <Pressable
            key={status}
            onPress={() => {
              if (!isGuardedCompletion) {
                queueStatusUpdate(job.id, status);
              }
            }}
            style={{
              ...(isActive
                ? mobileCaptureControlStyles.primaryButton
                : mobileCaptureControlStyles.secondaryButton),
              borderColor: isActive
                ? mobileRouteShellPalette.rail
                : mobileRouteShellPalette.borderStrong,
              borderWidth: 1,
              minHeight: 40,
            }}
          >
            <Text
              style={
                isActive
                  ? mobileCaptureControlStyles.primaryButtonText
                  : mobileCaptureControlStyles.secondaryButtonText
              }
            >
              {isGuardedCompletion
                ? copy.fieldStatus.reviewCompletion
                : copy.status[status]}
            </Text>
          </Pressable>
        );
      })}

      {shouldWarnBeforeCompletion ? (
        <View
          style={{
            ...mobileCaptureControlStyles.warningCard,
            ...mobileRouteShellTone.visit.pending,
          }}
        >
          <Text style={mobileCaptureControlStyles.warningTitle}>
            {copy.fieldStatus.reviewBeforeCompleting}
          </Text>
          <Text style={mobileCaptureControlStyles.warningBody}>
            {completionGuard.summary}
          </Text>
          <Pressable
            onPress={() => queueStatusUpdate(job.id, "completed")}
            style={mobileCaptureControlStyles.warningButton}
          >
            <Text style={mobileCaptureControlStyles.primaryButtonText}>
              {copy.fieldStatus.completeAnyway}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
