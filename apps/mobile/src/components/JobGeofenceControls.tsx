import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Location from "expo-location";
import type { Job, JobGeofenceEventType } from "@pest-patrol/types";
import { CaptureButton, CaptureSection } from "@pest-patrol/ui-native";

import { useJobGeofencing } from "../store/useJobGeofencing";
import { useLanguage } from "../store/useLanguage";
import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
} from "../styles/routeShellStyles";

interface JobGeofenceControlsProps {
  job: Job;
}

type ArrivalNoticeDecision = "delay_5_min" | "send_now" | "skip";

function eventLabel(
  eventType: JobGeofenceEventType,
  copy: { arrival: string; departure: string },
) {
  return eventType === "arrival" ? copy.arrival : copy.departure;
}

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template,
  );
}

function resultMessage(
  eventType: JobGeofenceEventType,
  payload: {
    distance_m: number | null;
    within_radius: boolean | null;
  },
  copy: {
    arrival: string;
    departure: string;
    outsideRadius: string;
    withinRadius: string;
    withoutCoordinates: string;
  },
) {
  const label = eventLabel(eventType, copy);

  if (payload.within_radius === null) {
    return interpolate(copy.withoutCoordinates, { event: label });
  }

  if (payload.within_radius) {
    return interpolate(copy.withinRadius, {
      distance: String(payload.distance_m),
      event: label,
    });
  }

  return interpolate(copy.outsideRadius, {
    distance: String(payload.distance_m),
    event: label,
  });
}

function arrivalNoticeMessage(
  decision: ArrivalNoticeDecision,
  copy: {
    arrivalNotice: {
      status: {
        delayFiveMinutes: string;
        sendNow: string;
        skip: string;
      };
    };
  },
) {
  if (decision === "delay_5_min") {
    return copy.arrivalNotice.status.delayFiveMinutes;
  }

  if (decision === "skip") {
    return copy.arrivalNotice.status.skip;
  }

  return copy.arrivalNotice.status.sendNow;
}

function arrivalNoticeButtonLabel(
  decision: ArrivalNoticeDecision,
  copy: {
    arrivalNotice: {
      delayFiveMinutes: string;
      sendNow: string;
      skip: string;
    };
  },
) {
  if (decision === "delay_5_min") {
    return copy.arrivalNotice.delayFiveMinutes;
  }

  if (decision === "skip") {
    return copy.arrivalNotice.skip;
  }

  return copy.arrivalNotice.sendNow;
}

export function JobGeofenceControls({ job }: JobGeofenceControlsProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy.location);
  const { getDraft, queueArrivalNotification, queueGeofenceEvent } =
    useJobGeofencing();
  const drafts = useJobGeofencing((state) => state.drafts);
  const [activeEvent, setActiveEvent] = useState<JobGeofenceEventType | null>(
    null,
  );
  const [activeDecision, setActiveDecision] =
    useState<ArrivalNoticeDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(job.id), [drafts, getDraft, job.id]);
  const serviceLatitude = job.location?.latitude;
  const serviceLongitude = job.location?.longitude;
  const hasArrivalNotice = Boolean(
    draft.lastEvent &&
      draft.lastEvent.event_type === "arrival" &&
      draft.arrivalNotice &&
      draft.arrivalNotice.clientEventId === draft.lastEvent.client_event_id,
  );
  const shouldShowArrivalNotice =
    Boolean(draft.lastEvent) &&
    draft.lastEvent?.event_type === "arrival" &&
    !hasArrivalNotice;

  async function captureArrivalNotice(decision: ArrivalNoticeDecision) {
    if (!draft.lastEvent || draft.lastEvent.event_type !== "arrival") {
      return;
    }

    setActiveDecision(decision);
    setError(null);

    try {
      queueArrivalNotification({
        capturedAt: draft.lastEvent.captured_at,
        clientEventId: draft.lastEvent.client_event_id,
        decision,
        jobId: job.id,
      });
    } catch (arrivalError) {
      setError(
        arrivalError instanceof Error
          ? arrivalError.message
          : copy.fallbackError,
      );
    } finally {
      setActiveDecision(null);
    }
  }

  async function captureEvent(eventType: JobGeofenceEventType) {
    setActiveEvent(eventType);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setError(copy.permissionError);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      queueGeofenceEvent({
        jobId: job.id,
        eventType,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        serviceLatitude,
        serviceLongitude,
      });
    } catch (locationError) {
      setError(
        locationError instanceof Error
          ? locationError.message
          : copy.fallbackError,
      );
    } finally {
      setActiveEvent(null);
    }
  }

  return (
    <CaptureSection>
      <Text style={mobileCaptureControlStyles.title}>{copy.title}</Text>
      <Text style={mobileCaptureControlStyles.warningBody}>
        {copy.description}
      </Text>
      {serviceLatitude === null ||
      serviceLatitude === undefined ||
      serviceLongitude === null ||
      serviceLongitude === undefined ? (
        <Text style={mobileCaptureControlStyles.warningBody}>
          {copy.missingCoordinates}
        </Text>
      ) : null}

      {error ? (
        <Text style={mobileCaptureControlStyles.errorText}>{error}</Text>
      ) : null}
      {draft.lastEvent ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {resultMessage(draft.lastEvent.event_type, draft.lastEvent, copy)}
        </Text>
      ) : null}
      {hasArrivalNotice && draft.arrivalNotice ? (
        <Text style={mobileCaptureControlStyles.successText}>
          {arrivalNoticeMessage(draft.arrivalNotice.decision, copy)}
        </Text>
      ) : null}

      {shouldShowArrivalNotice && draft.lastEvent ? (
        <View
          style={{
            borderColor: mobileRouteShellPalette.border,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: mobileRouteShellPalette.surface,
            gap: 12,
            marginTop: 4,
            padding: 12,
          }}
        >
          <Text style={mobileCaptureControlStyles.title}>
            {copy.arrivalNotice.title}
          </Text>
          <Text style={mobileCaptureControlStyles.warningBody}>
            {copy.arrivalNotice.description}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["send_now", "delay_5_min", "skip"] as const).map((decision) => (
              <CaptureButton
                disabled={Boolean(activeDecision)}
                key={decision}
                onPress={() => void captureArrivalNotice(decision)}
                variant={decision === "send_now" ? "primary" : "secondary"}
                style={{
                  flex: 1,
                  opacity: activeDecision ? 0.7 : 1,
                }}
              >
                {activeDecision === decision ? (
                  <ActivityIndicator
                    color={
                      decision === "send_now"
                        ? mobileRouteShellPalette.inverseText
                        : mobileRouteShellPalette.accentText
                    }
                  />
                ) : (
                  <Text
                    style={
                      decision === "send_now"
                        ? mobileCaptureControlStyles.primaryButtonText
                        : mobileCaptureControlStyles.secondaryButtonText
                    }
                  >
                    {arrivalNoticeButtonLabel(decision, copy)}
                  </Text>
                )}
              </CaptureButton>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["arrival", "departure"] as const).map((eventType) => (
          <CaptureButton
            disabled={Boolean(activeEvent)}
            key={eventType}
            onPress={() => void captureEvent(eventType)}
            variant={eventType === "arrival" ? "primary" : "secondary"}
            style={{
              flex: 1,
              opacity: activeEvent ? 0.7 : 1,
            }}
          >
            {activeEvent === eventType ? (
              <ActivityIndicator
                color={
                  eventType === "arrival"
                    ? mobileRouteShellPalette.inverseText
                    : mobileRouteShellPalette.accentText
                }
              />
            ) : (
              <Text
                style={
                  eventType === "arrival"
                    ? mobileCaptureControlStyles.primaryButtonText
                    : mobileCaptureControlStyles.secondaryButtonText
                }
              >
                {eventLabel(eventType, copy)}
              </Text>
            )}
          </CaptureButton>
        ))}
      </View>
    </CaptureSection>
  );
}
