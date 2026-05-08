import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  buildMobileDailyJobs,
  hasReadyOfflineQueueItems,
} from "@pest-patrol/domain";
import type { JobStatus } from "@pest-patrol/types";

import { AssignedJobCard } from "../src/components/AssignedJobCard";
import { JobChemicalLogForm } from "../src/components/JobChemicalLogForm";
import { JobGeofenceControls } from "../src/components/JobGeofenceControls";
import { JobPhotoUploadForm } from "../src/components/JobPhotoUploadForm";
import { JobSignatureCaptureForm } from "../src/components/JobSignatureCaptureForm";
import { JobStatusControls } from "../src/components/JobStatusControls";
import { JobTreatmentForm } from "../src/components/JobTreatmentForm";
import { MobileTechnicianHeader } from "../src/components/MobileTechnicianHeader";
import { useAssignedJobs } from "../src/store/useAssignedJobs";
import { useAuth } from "../src/store/useAuth";
import { useOfflineQueue } from "../src/store/useOfflineQueue";
import { useQueueSync } from "../src/store/useQueueSync";
import { useSyncStatus } from "../src/store/useSyncStatus";

const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MobileHomeScreen() {
  const { error, initialize, profile, signIn, signOut, status } = useAuth();
  const {
    error: jobsError,
    jobs,
    lastLoadedAt,
    load,
    reset,
    status: jobsStatus,
  } = useAssignedJobs();
  const queueItems = useOfflineQueue((state) => state.items);
  const syncNow = useQueueSync((state) => state.syncNow);
  const { activity: syncActivity, networkStatus } = useSyncStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const date = todayKey();
  const dailyJobs = useMemo(() => buildMobileDailyJobs(jobs, date), [date, jobs]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === "signed_in" && jobsStatus === "idle") {
      void load();
    }
  }, [jobsStatus, load, status]);

  useEffect(() => {
    if (
      status === "signed_in" &&
      syncActivity === "idle" &&
      networkStatus === "online" &&
      hasReadyOfflineQueueItems(queueItems)
    ) {
      void syncNow();
    }
  }, [networkStatus, queueItems, status, syncActivity, syncNow]);

  async function handleSignOut() {
    reset();
    await signOut();
  }

  if (status === "loading") {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#F9FAFB",
          flex: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator color="#1E3A8A" size="large" />
        <Text style={{ color: "#4B5563", fontSize: 16, marginTop: 12 }}>
          Loading
        </Text>
      </View>
    );
  }

  if (status === "signed_out") {
    return (
      <View
        style={{
          backgroundColor: "#F9FAFB",
          flex: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "#111827", fontSize: 30, fontWeight: "800" }}>
          Pest Patrol OS
        </Text>
        <Text style={{ color: "#4B5563", fontSize: 16, marginTop: 8 }}>
          Technician login
        </Text>

        <View style={{ gap: 12, marginTop: 28 }}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#D1D5DB",
              borderRadius: 8,
              borderWidth: 1,
              color: "#111827",
              minHeight: 48,
              paddingHorizontal: 14,
            }}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#D1D5DB",
              borderRadius: 8,
              borderWidth: 1,
              color: "#111827",
              minHeight: 48,
              paddingHorizontal: 14,
            }}
            value={password}
          />
          {error ? (
            <Text style={{ color: "#B91C1C", fontSize: 14 }}>{error}</Text>
          ) : null}
          <Pressable
            onPress={() => void signIn(email, password)}
            style={{
              alignItems: "center",
              backgroundColor: "#1E3A8A",
              borderRadius: 8,
              minHeight: 48,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#F9FAFB",
        flex: 1,
        padding: 24,
        paddingTop: 56,
      }}
    >
      <MobileTechnicianHeader
        assignedJobCount={dailyJobs.jobs.length}
        error={error}
        onRefreshJobs={() => void load()}
        onSignOut={() => void handleSignOut()}
        profileId={profile?.id}
      />
      <ScrollView
        style={{ marginTop: 28 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: "#111827", fontSize: 22, fontWeight: "800" }}>
              Today's jobs
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
              {dailyJobs.date}
            </Text>
          </View>
          <Pressable
            onPress={() => void load()}
            style={{
              alignItems: "center",
              borderColor: "#D1D5DB",
              borderRadius: 8,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 40,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: "#111827", fontSize: 14, fontWeight: "700" }}>
              Refresh
            </Text>
          </Pressable>
        </View>

        {jobsStatus === "loading" ? (
          <View
            style={{
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderColor: "#E5E7EB",
              borderRadius: 10,
              borderWidth: 1,
              padding: 20,
            }}
          >
            <ActivityIndicator color="#1E3A8A" />
            <Text style={{ color: "#4B5563", fontSize: 14, marginTop: 10 }}>
              Loading assigned jobs
            </Text>
          </View>
        ) : null}

        {jobsStatus === "error" ? (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              borderRadius: 10,
              borderWidth: 1,
              padding: 16,
            }}
          >
            <Text style={{ color: "#991B1B", fontSize: 14, fontWeight: "700" }}>
              Unable to load assigned jobs
            </Text>
            <Text style={{ color: "#B91C1C", fontSize: 14, marginTop: 6 }}>
              {jobsError}
            </Text>
          </View>
        ) : null}

        {jobsStatus === "ready" && dailyJobs.jobs.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5E7EB",
              borderRadius: 10,
              borderWidth: 1,
              padding: 18,
            }}
          >
            <Text style={{ color: "#111827", fontSize: 16, fontWeight: "700" }}>
              No jobs assigned today
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 14, marginTop: 6 }}>
              Pull to refresh later or check with dispatch if your route is missing.
            </Text>
          </View>
        ) : null}

        {dailyJobs.jobs.map((job) => (
          <AssignedJobCard
            address={job.location?.address}
            customerName={job.customer?.name}
            key={job.id}
            notes={job.service_notes}
            scheduledStart={job.scheduled_start}
            statusLabel={statusLabels[job.status]}
          >
            <JobStatusControls job={job} />
            <JobGeofenceControls job={job} />
            <JobChemicalLogForm jobId={job.id} />
            <JobPhotoUploadForm jobId={job.id} />
            <JobSignatureCaptureForm jobId={job.id} />
            <JobTreatmentForm jobId={job.id} />
          </AssignedJobCard>
        ))}

        {lastLoadedAt ? (
          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
            Last refreshed {formatTime(lastLoadedAt)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
