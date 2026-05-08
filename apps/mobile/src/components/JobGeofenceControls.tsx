import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import { brand, semantic } from "@pest-patrol/ui-tokens";
import type { Job, JobGeofenceEventType } from "@pest-patrol/types";

import { useJobGeofencing } from "../store/useJobGeofencing";

interface JobGeofenceControlsProps {
  job: Job;
}

function eventLabel(eventType: JobGeofenceEventType) {
  return eventType === "arrival" ? "Arrival" : "Departure";
}

function resultMessage(eventType: JobGeofenceEventType, payload: {
  distance_m: number | null;
  within_radius: boolean | null;
}) {
  const label = eventLabel(eventType);

  if (payload.within_radius === null) {
    return `${label} queued without service coordinates`;
  }

  if (payload.within_radius) {
    return `${label} queued within ${payload.distance_m}m`;
  }

  return `${label} queued ${payload.distance_m}m from service location`;
}

export function JobGeofenceControls({ job }: JobGeofenceControlsProps) {
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
        setError("Location permission is required");
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
          : "Unable to capture location",
      );
    } finally {
      setActiveEvent(null);
    }
  }

  return (
    <View
      style={{
        borderColor: semantic.border.subtle,
        borderTopWidth: 1,
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={{ color: semantic.text.primary, fontSize: 15, fontWeight: "800" }}>
        Location
      </Text>
      <Text style={{ color: semantic.text.muted, fontSize: 13 }}>
        Capture arrival and departure at the service location. Location events
        queue locally and sync later.
      </Text>
      {serviceLatitude === null ||
      serviceLatitude === undefined ||
      serviceLongitude === null ||
      serviceLongitude === undefined ? (
        <Text style={{ color: semantic.text.muted, fontSize: 13 }}>
          Service coordinates are not saved yet
        </Text>
      ) : null}

      {error ? (
        <Text style={{ color: semantic.status.danger.fg, fontSize: 13 }}>{error}</Text>
      ) : null}
      {draft.lastEvent ? (
        <Text style={{ color: semantic.status.success.solid, fontSize: 13, fontWeight: "700" }}>
          {resultMessage(draft.lastEvent.event_type, draft.lastEvent)}
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
              backgroundColor:
                eventType === "arrival" ? brand.primary : semantic.background.surface,
              borderColor:
                eventType === "arrival" ? brand.primary : semantic.border.default,
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
                color={eventType === "arrival" ? semantic.text.inverse : brand.primary}
              />
            ) : (
              <Text
                style={{
                  color: eventType === "arrival" ? semantic.text.inverse : semantic.text.primary,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                {eventLabel(eventType)}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
