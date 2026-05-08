import { Pressable, Text, View } from "react-native";
import { brand, semantic } from "@pest-patrol/ui-tokens";
import type { Job, JobStatus } from "@pest-patrol/types";

import { useAssignedJobs } from "../store/useAssignedJobs";

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

  if (job.status === "canceled") {
    return null;
  }

  return (
    <View
      style={{
        borderColor: semantic.border.subtle,
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

        return (
          <Pressable
            key={status}
            onPress={() => queueStatusUpdate(job.id, status)}
            style={{
              alignItems: "center",
              backgroundColor: isActive ? brand.primary : semantic.background.surface,
              borderColor: isActive ? brand.primary : semantic.border.default,
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 40,
              paddingHorizontal: 10,
            }}
          >
            <Text
              style={{
                color: isActive ? semantic.text.inverse : semantic.text.primary,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {statusLabels[status]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
