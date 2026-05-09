import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import type { Job, JobGeofenceEventType } from "@pest-patrol/types";

import { useJobGeofencing } from "../store/useJobGeofencing";
import { useLanguage } from "../store/useLanguage";

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
    <View
      style={{
        borderColor: "#E5E7EB",
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={{ color: "#111827", fontSize: 15, fontWeight: "800" }}>
        {copy.title}
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13 }}>
        {copy.description}
      </Text>
      {serviceLatitude === null ||
      serviceLatitude === undefined ||
      serviceLongitude === null ||
      serviceLongitude === undefined ? (
        <Text style={{ color: "#6B7280", fontSize: 13 }}>
          {copy.missingCoordinates}
        </Text>
      ) : null}

      {error ? (
        <Text style={{ color: "#B91C1C", fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.lastEvent ? (
        <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
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
              alignItems: "center",
              backgroundColor: eventType === "arrival" ? "#1E3A8A" : "#FFFFFF",
              borderColor: eventType === "arrival" ? "#1E3A8A" : "#D1D5DB",
              borderRadius: 8,
              borderWidth: 1,
              flex: 1,
              justifyContent: "center",
              minHeight: 44,
              opacity: activeEvent ? 0.7 : 1,
            }}
          >
            {activeEvent === eventType ? (
              <ActivityIndicator
                color={eventType === "arrival" ? "#FFFFFF" : "#1E3A8A"}
              />
            ) : (
              <Text
                style={{
                  color: eventType === "arrival" ? "#FFFFFF" : "#111827",
                  fontSize: 14,
                  fontWeight: "800",
                }}
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
