import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import type { Job, JobGeofenceEventType } from "@pest-patrol/types";

import { useJobGeofencing } from "../store/useJobGeofencing";
import { useLanguage } from "../store/useLanguage";
import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
} from "../styles/routeShellStyles";

interface JobGeofenceControlsProps {
  job: Job;
}

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

export function JobGeofenceControls({ job }: JobGeofenceControlsProps) {
  const copy = useLanguage((state) => state.t.jobs.fieldCopy.location);
  const { getDraft, queueGeofenceEvent } = useJobGeofencing();
  const drafts = useJobGeofencing((state) => state.drafts);
  const [activeEvent, setActiveEvent] = useState<JobGeofenceEventType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = useMemo(() => getDraft(job.id), [drafts, getDraft, job.id]);
  const serviceLatitude = job.location?.latitude;
  const serviceLongitude = job.location?.longitude;

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
    <View style={mobileCaptureControlStyles.section}>
      <Text style={mobileCaptureControlStyles.title}>
        {copy.title}
      </Text>
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

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["arrival", "departure"] as const).map((eventType) => (
          <Pressable
            disabled={Boolean(activeEvent)}
            key={eventType}
            onPress={() => void captureEvent(eventType)}
            style={{
              ...(eventType === "arrival"
                ? mobileCaptureControlStyles.primaryButton
                : mobileCaptureControlStyles.secondaryButton),
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
          </Pressable>
        ))}
      </View>
    </View>
  );
}
