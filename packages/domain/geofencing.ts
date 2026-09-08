import type {
  JobGeofenceEvent,
  JobGeofenceEventInput,
  JobGeofenceEventQueuePayload,
  JobGeofenceEventType,
} from "@pest-patrol/types";

export const DEFAULT_GEOFENCE_RADIUS_METERS = 150;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface JobGeofenceCheck {
  distance_m: number | null;
  status: "inside" | "outside" | "unavailable";
  within_radius: boolean | null;
}

export type DispatchLocationEvidenceState = "captured" | "missing";

export type DispatchLocationEvidenceRadiusState =
  | "inside"
  | "outside"
  | "unavailable";

export interface DispatchLocationEvidenceEvent {
  accuracy_m: number | null;
  captured_at: string;
  distance_m: number | null;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  map_url: string;
  radius_label: string;
  radius_state: DispatchLocationEvidenceRadiusState;
  within_radius: boolean | null;
}

export interface DispatchLocationEvidence {
  job_id: string;
  latest_arrival: DispatchLocationEvidenceEvent | null;
  latest_departure: DispatchLocationEvidenceEvent | null;
  latest_event: DispatchLocationEvidenceEvent | null;
  state: DispatchLocationEvidenceState;
  summary_label: string;
}

export type DispatchLocationEvidenceByJob = Record<
  string,
  DispatchLocationEvidence
>;

interface GeofencePayloadInput {
  accuracy_m?: number | null;
  captured_at?: string | null;
  client_event_id?: string | null;
  current: GeoPoint;
  event_type: JobGeofenceEventType;
  job_id: string;
  serviceLocation?: GeoPoint | null;
}

const eventTypes: JobGeofenceEventType[] = ["arrival", "departure"];

function timestamp(value?: string | null) {
  return value ?? new Date().toISOString();
}

function makeClientEventId() {
  return globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}`;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function requireCoordinate(value: number, fieldName: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function normalizeOptionalNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Geofence measurement is invalid");
  }

  return value;
}

function normalizeEventType(value: JobGeofenceEventType) {
  if (!eventTypes.includes(value)) {
    throw new Error("Geofence event type is invalid");
  }

  return value;
}

function eventTime(event: JobGeofenceEvent) {
  const time = Date.parse(event.captured_at);

  return Number.isFinite(time) ? time : 0;
}

function eventLabel(eventType: JobGeofenceEventType) {
  return eventType === "departure" ? "Departure" : "Arrival";
}

function metersLabel(value: number) {
  return `${Math.round(value)} m`;
}

function radiusState(
  event: Pick<JobGeofenceEvent, "within_radius">,
): DispatchLocationEvidenceRadiusState {
  if (event.within_radius === true) {
    return "inside";
  }

  if (event.within_radius === false) {
    return "outside";
  }

  return "unavailable";
}

function radiusLabel(
  event: Pick<JobGeofenceEvent, "distance_m" | "within_radius">,
) {
  if (event.within_radius === true) {
    return event.distance_m === null
      ? "Within service radius"
      : `Within service radius (${metersLabel(event.distance_m)})`;
  }

  if (event.within_radius === false) {
    return event.distance_m === null
      ? "Outside service radius"
      : `Outside service radius (${metersLabel(event.distance_m)})`;
  }

  return "Service coordinates unavailable";
}

function emptyDispatchLocationEvidence(jobId: string): DispatchLocationEvidence {
  return {
    job_id: jobId,
    latest_arrival: null,
    latest_departure: null,
    latest_event: null,
    state: "missing",
    summary_label: "No synced GPS evidence yet",
  };
}

function toDispatchLocationEvidenceEvent(
  event: JobGeofenceEvent,
): DispatchLocationEvidenceEvent {
  return {
    accuracy_m: event.accuracy_m,
    captured_at: event.captured_at,
    distance_m: event.distance_m,
    event_type: event.event_type,
    latitude: event.latitude,
    longitude: event.longitude,
    map_url: buildDispatchLocationMapUrl({
      latitude: event.latitude,
      longitude: event.longitude,
    }),
    radius_label: radiusLabel(event),
    radius_state: radiusState(event),
    within_radius: event.within_radius,
  };
}

export function calculateDistanceMeters(left: GeoPoint, right: GeoPoint) {
  const earthRadiusMeters = 6_371_000;
  const leftLatitude = (left.latitude * Math.PI) / 180;
  const rightLatitude = (right.latitude * Math.PI) / 180;
  const deltaLatitude = ((right.latitude - left.latitude) * Math.PI) / 180;
  const deltaLongitude = ((right.longitude - left.longitude) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusMeters * centralAngle);
}

export function buildDispatchLocationMapUrl(point: GeoPoint) {
  const latitude = requireCoordinate(point.latitude, "Latitude", -90, 90);
  const longitude = requireCoordinate(point.longitude, "Longitude", -180, 180);

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}

export function buildDispatchLocationEvidenceByJob(
  jobIds: string[],
  events: JobGeofenceEvent[],
): DispatchLocationEvidenceByJob {
  const sortedEvents = [...events].sort(
    (left, right) => eventTime(right) - eventTime(left),
  );
  const ids = new Set<string>(jobIds);

  sortedEvents.forEach((event) => ids.add(event.job_id));

  return [...ids].reduce<DispatchLocationEvidenceByJob>((evidenceByJob, jobId) => {
    const jobEvents = sortedEvents.filter((event) => event.job_id === jobId);
    const latestEvent = jobEvents[0]
      ? toDispatchLocationEvidenceEvent(jobEvents[0])
      : null;
    const latestArrival = jobEvents.find((event) => event.event_type === "arrival");
    const latestDeparture = jobEvents.find(
      (event) => event.event_type === "departure",
    );

    evidenceByJob[jobId] = latestEvent
      ? {
          job_id: jobId,
          latest_arrival: latestArrival
            ? toDispatchLocationEvidenceEvent(latestArrival)
            : null,
          latest_departure: latestDeparture
            ? toDispatchLocationEvidenceEvent(latestDeparture)
            : null,
          latest_event: latestEvent,
          state: "captured",
          summary_label: `Latest GPS: ${eventLabel(latestEvent.event_type)}`,
        }
      : emptyDispatchLocationEvidence(jobId);

    return evidenceByJob;
  }, {});
}

export function buildJobGeofenceCheck(
  current: GeoPoint,
  serviceLocation?: GeoPoint | null,
  radiusMeters = DEFAULT_GEOFENCE_RADIUS_METERS,
): JobGeofenceCheck {
  if (!serviceLocation) {
    return {
      distance_m: null,
      status: "unavailable",
      within_radius: null,
    };
  }

  const distance = calculateDistanceMeters(current, serviceLocation);
  const withinRadius = distance <= radiusMeters;

  return {
    distance_m: distance,
    status: withinRadius ? "inside" : "outside",
    within_radius: withinRadius,
  };
}

export function normalizeJobGeofenceEventInput(
  input: JobGeofenceEventInput,
): JobGeofenceEventInput {
  return {
    job_id: requireNonEmpty(input.job_id, "Job"),
    event_type: normalizeEventType(input.event_type),
    latitude: requireCoordinate(input.latitude, "Latitude", -90, 90),
    longitude: requireCoordinate(input.longitude, "Longitude", -180, 180),
    accuracy_m: normalizeOptionalNumber(input.accuracy_m),
    distance_m: normalizeOptionalNumber(input.distance_m),
    within_radius: input.within_radius ?? null,
    client_event_id: requireNonEmpty(input.client_event_id, "Client event id"),
    captured_at: requireNonEmpty(input.captured_at, "Captured at"),
  };
}

export function validateJobGeofenceEventInput(input: JobGeofenceEventInput) {
  return normalizeJobGeofenceEventInput(input);
}

export function createJobGeofenceEventQueuePayload(
  input: GeofencePayloadInput,
): JobGeofenceEventQueuePayload {
  const capturedAt = timestamp(input.captured_at);
  const check = buildJobGeofenceCheck(input.current, input.serviceLocation);

  const normalized = normalizeJobGeofenceEventInput({
    job_id: input.job_id,
    event_type: input.event_type,
    latitude: input.current.latitude,
    longitude: input.current.longitude,
    accuracy_m: input.accuracy_m,
    distance_m: check.distance_m,
    within_radius: check.within_radius,
    client_event_id: input.client_event_id ?? makeClientEventId(),
    captured_at: capturedAt,
  });

  return {
    ...normalized,
    accuracy_m: normalized.accuracy_m ?? null,
    distance_m: normalized.distance_m ?? null,
    within_radius: normalized.within_radius ?? null,
  };
}
