import { Text } from "react-native";
import {
  buildMobileJobWorkPlan,
  getMobileCompletionReadinessGuard,
} from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";
import {
  CaptureButton,
  CaptureCard,
  CaptureSection,
} from "@pest-patrol/ui-native";

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
  const copy = useLanguage((state) => state.t.jobs.fieldCopy);
  const fieldStatus = useLanguage((state) => state.t.jobs.fieldStatus);
  const statusLabels = useLanguage((state) => state.t.jobs.status);
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
    <CaptureSection
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {mobileStatuses.map((status) => {
        const isActive = job.status === status;
        const isGuardedCompletion =
          status === "completed" && shouldWarnBeforeCompletion;

        return (
          <CaptureButton
            key={status}
            onPress={() => {
              if (!isGuardedCompletion) {
                queueStatusUpdate(job.id, status);
              }
            }}
            variant={isActive ? "primary" : "secondary"}
            style={{
              borderColor: isActive
                ? mobileRouteShellPalette.rail
                : mobileRouteShellPalette.borderStrong,
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
                ? fieldStatus.reviewCompletion
                : statusLabels[status]}
            </Text>
          </CaptureButton>
        );
      })}

      {shouldWarnBeforeCompletion ? (
        <CaptureCard
          style={[
            mobileCaptureControlStyles.warningCard,
            mobileRouteShellTone.visit.pending,
          ]}
          tone="warning"
        >
          <Text style={mobileCaptureControlStyles.warningTitle}>
            {fieldStatus.reviewBeforeCompleting}
          </Text>
          <Text style={mobileCaptureControlStyles.warningBody}>
            {copy.fieldFlow.reviewSummary}
          </Text>
          <CaptureButton
            onPress={() => queueStatusUpdate(job.id, "completed")}
            variant="warning"
            style={mobileCaptureControlStyles.warningButton}
          >
            <Text style={mobileCaptureControlStyles.primaryButtonText}>
              {fieldStatus.completeAnyway}
            </Text>
          </CaptureButton>
        </CaptureCard>
      ) : null}
    </CaptureSection>
  );
}
