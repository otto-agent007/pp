import { Pressable, Text, View } from "react-native";
import {
  buildMobileJobWorkPlan,
  getMobileCompletionReadinessGuard,
} from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";

import { useAssignedJobs } from "../store/useAssignedJobs";
import { useOfflineQueue } from "../store/useOfflineQueue";

interface JobStatusControlsProps {
  job: Job;
}

const mobileStatuses: JobStatus[] = [
  "scheduled",
  "en_route",
  "in_progress",
  "completed",
];

const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

export function JobStatusControls({ job }: JobStatusControlsProps) {
  const queueStatusUpdate = useAssignedJobs((state) => state.queueStatusUpdate);
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
        borderColor: "#E5E7EB",
        borderTopWidth: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 14,
        paddingTop: 14,
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
              alignItems: "center",
              backgroundColor: isActive ? "#1E3A8A" : "#FFFFFF",
              borderColor: isActive ? "#1E3A8A" : "#D1D5DB",
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 40,
              paddingHorizontal: 10,
            }}
          >
            <Text
              style={{
                color: isActive ? "#FFFFFF" : "#111827",
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {isGuardedCompletion ? "Review completion" : statusLabels[status]}
            </Text>
          </Pressable>
        );
      })}

      {shouldWarnBeforeCompletion ? (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderColor: "#FDE68A",
            borderRadius: 8,
            borderWidth: 1,
            flexBasis: "100%",
            gap: 8,
            padding: 12,
          }}
        >
          <Text style={{ color: "#92400E", fontSize: 13, fontWeight: "800" }}>
            {completionGuard.label}
          </Text>
          <Text style={{ color: "#78350F", fontSize: 13, lineHeight: 18 }}>
            {completionGuard.summary}
          </Text>
          <Pressable
            onPress={() => queueStatusUpdate(job.id, "completed")}
            style={{
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "#92400E",
              borderRadius: 8,
              justifyContent: "center",
              minHeight: 38,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>
              Complete anyway
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
