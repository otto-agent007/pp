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
  buildMobileDailyRouteTimeline,
  hasReadyOfflineQueueItems,
} from "@pest-patrol/domain";
import type { MobileJobWorkPlanItem } from "@pest-patrol/domain";
import type { Job, JobStatus } from "@pest-patrol/types";
import {
  fontSize,
  fontWeight,
  lightTheme,
  radius,
  spacing,
  status as statusTokens,
} from "@pest-patrol/ui-tokens";

import { JobChemicalLogForm } from "../src/components/JobChemicalLogForm";
import { JobGeofenceControls } from "../src/components/JobGeofenceControls";
import { MobileJobFieldFlow } from "../src/components/MobileJobFieldFlow";
import { JobPhotoUploadForm } from "../src/components/JobPhotoUploadForm";
import { MobileRouteTimeline } from "../src/components/MobileRouteTimeline";
import { JobSignatureCaptureForm } from "../src/components/JobSignatureCaptureForm";
import { JobStatusControls } from "../src/components/JobStatusControls";
import { JobTreatmentForm } from "../src/components/JobTreatmentForm";
import { MobileTechnicianHeader } from "../src/components/MobileTechnicianHeader";
import { useAssignedJobs } from "../src/store/useAssignedJobs";
import { useAuth } from "../src/store/useAuth";
import { useChemicalLogs } from "../src/store/useChemicalLogs";
import { useFormDrafts } from "../src/store/useFormDrafts";
import { useJobGeofencing } from "../src/store/useJobGeofencing";
import { useJobPhotos } from "../src/store/useJobPhotos";
import { useJobSignatures } from "../src/store/useJobSignatures";
import { useLanguage } from "../src/store/useLanguage";
import { useOfflineQueue } from "../src/store/useOfflineQueue";
import { useQueueSync } from "../src/store/useQueueSync";
import { useSyncStatus } from "../src/store/useSyncStatus";
import {
  mobileRouteShellPalette,
  mobileRouteShellStyles,
  mobileRouteShellTone,
} from "../src/styles/routeShellStyles";

const mobileAuthShellPalette = {
  border: lightTheme.border.default,
  canvas: lightTheme.background.canvas,
  errorText: statusTokens.alert.danger.fg,
  inverseText: lightTheme.text.inverse,
  primaryAction: lightTheme.background.inverse,
  primaryText: lightTheme.text.primary,
  secondaryText: lightTheme.text.secondary,
  surface: lightTheme.background.surface,
} as const;

const mobileAuthShellStyles = {
  button: {
    alignItems: "center",
    backgroundColor: mobileAuthShellPalette.primaryAction,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  buttonText: {
    color: mobileAuthShellPalette.inverseText,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  errorText: {
    color: mobileAuthShellPalette.errorText,
    fontSize: fontSize.sm,
  },
  form: {
    gap: spacing[3],
    marginTop: spacing[7],
  },
  input: {
    backgroundColor: mobileAuthShellPalette.surface,
    borderColor: mobileAuthShellPalette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: mobileAuthShellPalette.primaryText,
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: mobileAuthShellPalette.canvas,
    flex: 1,
    justifyContent: "center",
    padding: spacing[6],
  },
  loadingText: {
    color: mobileAuthShellPalette.secondaryText,
    fontSize: fontSize.base,
    marginTop: spacing[3],
  },
  screen: {
    backgroundColor: mobileAuthShellPalette.canvas,
    flex: 1,
    justifyContent: "center",
    padding: spacing[6],
  },
  subtitle: {
    color: mobileAuthShellPalette.secondaryText,
    fontSize: fontSize.base,
    marginTop: spacing[2],
  },
  title: {
    color: mobileAuthShellPalette.primaryText,
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.extrabold,
  },
} as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderFieldControls(job: Job, workPlan: MobileJobWorkPlanItem[]) {
  return (
    <MobileJobFieldFlow
      chemicalLog={<JobChemicalLogForm jobId={job.id} />}
      geofenceControls={<JobGeofenceControls job={job} />}
      jobStatusControls={<JobStatusControls job={job} />}
      photoUpload={<JobPhotoUploadForm jobId={job.id} />}
      signatureCapture={<JobSignatureCaptureForm jobId={job.id} />}
      treatmentForm={<JobTreatmentForm jobId={job.id} />}
      workPlan={workPlan}
    />
  );
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
  const jobCopy = useLanguage((state) => state.t.jobs);
  const [email, setEmail] = useState("");
  const [focusedRouteJobId, setFocusedRouteJobId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const date = todayKey();
  const routeTimeline = useMemo(
    () => buildMobileDailyRouteTimeline(jobs, date, queueItems),
    [date, jobs, queueItems],
  );
  const routeJobCount =
    (routeTimeline.current ? 1 : 0) +
    (routeTimeline.next ? 1 : 0) +
    routeTimeline.later.length;
  const statusLabels = useMemo<Record<JobStatus, string>>(
    () => ({
      canceled: jobCopy.status.canceled,
      completed: jobCopy.status.completed,
      en_route: jobCopy.status.en_route,
      in_progress: jobCopy.status.in_progress,
      scheduled: jobCopy.status.scheduled,
    }),
    [jobCopy.status],
  );
  const classificationLabels = useMemo<Record<string, string>>(
    () => ({
      Callback: jobCopy.classification.callback,
      Estimate: jobCopy.classification.estimate,
      Exclusion: jobCopy.classification.exclusion,
      "Follow-up": jobCopy.classification.follow_up,
      "General Pest": jobCopy.classification.general_pest,
      Inspection: jobCopy.classification.inspection,
      "Project Work": jobCopy.classification.project_work,
      "Recurring Service": jobCopy.classification.recurring_service,
      Warranty: jobCopy.classification.warranty,
      "WDO / Escrow": jobCopy.classification.wdo_escrow,
    }),
    [jobCopy.classification],
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void useLanguage.getState().hydrateLanguagePreference();
  }, []);

  useEffect(() => {
    if (status === "signed_in" && jobsStatus === "idle") {
      void load();
    }
  }, [jobsStatus, load, status]);

  useEffect(() => {
    if (status === "signed_in") {
      void useOfflineQueue.getState().hydrate();
      void useFormDrafts.getState().hydrate();
      void useChemicalLogs.getState().hydrate();
      void useJobPhotos.getState().hydrate();
      void useJobSignatures.getState().hydrate();
      void useJobGeofencing.getState().hydrate();
    }
  }, [status]);

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
      <View style={mobileAuthShellStyles.loadingScreen}>
        <ActivityIndicator
          color={mobileAuthShellPalette.primaryAction}
          size="large"
        />
        <Text style={mobileAuthShellStyles.loadingText}>Loading</Text>
      </View>
    );
  }

  if (status === "signed_out") {
    return (
      <View style={mobileAuthShellStyles.screen}>
        <Text style={mobileAuthShellStyles.title}>Pest Patrol OS</Text>
        <Text style={mobileAuthShellStyles.subtitle}>Technician login</Text>

        <View style={mobileAuthShellStyles.form}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={mobileAuthShellPalette.secondaryText}
            style={mobileAuthShellStyles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={mobileAuthShellPalette.secondaryText}
            secureTextEntry
            style={mobileAuthShellStyles.input}
            value={password}
          />
          {error ? (
            <Text style={mobileAuthShellStyles.errorText}>{error}</Text>
          ) : null}
          <Pressable
            onPress={() => void signIn(email, password)}
            style={mobileAuthShellStyles.button}
          >
            <Text style={mobileAuthShellStyles.buttonText}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={mobileRouteShellStyles.screen}>
      <MobileTechnicianHeader
        assignedJobCount={routeJobCount}
        error={error}
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
            <Text
              style={{
                color: mobileRouteShellPalette.primaryText,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Today's route
            </Text>
            <Text
              style={{
                color: mobileRouteShellPalette.mutedText,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {routeTimeline.date}
            </Text>
          </View>
          <Pressable
            onPress={() => void load()}
            style={{
              ...mobileRouteShellStyles.control,
              borderColor: mobileRouteShellPalette.border,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: mobileRouteShellPalette.primaryText,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              Refresh
            </Text>
          </Pressable>
        </View>

        {jobsStatus === "loading" ? (
          <View
            style={{
              alignItems: "center",
              ...mobileRouteShellStyles.card,
            }}
          >
            <ActivityIndicator color={mobileRouteShellPalette.accentText} />
            <Text
              style={{
                color: mobileRouteShellPalette.secondaryText,
                fontSize: 14,
                marginTop: 10,
              }}
            >
              Loading assigned jobs
            </Text>
          </View>
        ) : null}

        {jobsStatus === "error" ? (
          <View
            style={{
              backgroundColor: mobileRouteShellTone.sync.failed.backgroundColor,
              borderColor: mobileRouteShellTone.sync.failed.borderColor,
              borderRadius: mobileRouteShellStyles.card.borderRadius,
              borderWidth: 1,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: mobileRouteShellPalette.signalDanger,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              Unable to load assigned jobs
            </Text>
            <Text
              style={{
                color: mobileRouteShellPalette.signalDanger,
                fontSize: 14,
                marginTop: 6,
              }}
            >
              {jobsError}
            </Text>
            <Pressable
              onPress={() => void load()}
              style={{
                ...mobileRouteShellStyles.control,
                backgroundColor: mobileRouteShellPalette.rail,
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: mobileRouteShellPalette.inverseText,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {jobsStatus === "ready" && routeJobCount === 0 ? (
          <View
            style={{
              ...mobileRouteShellStyles.card,
            }}
          >
            <Text
              style={{
                color: mobileRouteShellPalette.primaryText,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              No jobs assigned today
            </Text>
            <Text
              style={{
                color: mobileRouteShellPalette.mutedText,
                fontSize: 14,
                marginTop: 6,
              }}
            >
              Pull to refresh later or check with dispatch if your route is missing.
            </Text>
          </View>
        ) : null}

        {jobsStatus === "ready" && routeJobCount > 0 ? (
        <MobileRouteTimeline
          classificationLabels={classificationLabels}
          focusedJobId={focusedRouteJobId}
            onFocusJob={setFocusedRouteJobId}
            renderJobControls={renderFieldControls}
            statusLabels={statusLabels}
            timeline={routeTimeline}
          />
        ) : null}

        {lastLoadedAt ? (
          <Text style={{ color: mobileRouteShellPalette.mutedText, fontSize: 12 }}>
            Last refreshed {formatTime(lastLoadedAt)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
