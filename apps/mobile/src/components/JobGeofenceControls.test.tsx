import React, { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "@pest-patrol/types";

import { JobGeofenceControls } from "./JobGeofenceControls";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

const language = vi.hoisted(() => ({
  value: "en" as "en" | "es",
}));

const location = vi.hoisted(() => ({
  getCurrentPositionAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
}));

const geofenceState = vi.hoisted(() => ({
  drafts: {} as Record<
    string,
    {
      arrivalNotice: {
        clientEventId: string;
        decision: "delay_5_min" | "send_now" | "skip";
        queuedAt: string;
      } | null;
      lastEvent: Record<string, unknown> | null;
      queuedAt: string | null;
    }
  >,
  queueItems: [] as Array<{
    action: string;
    payload: Record<string, unknown>;
  }>,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useMemo: <T,>(factory: () => T) => factory(),
    useState: <T,>(initial: T) => [initial, vi.fn()] as const,
  };
});

vi.mock("expo-secure-store", () => secureStore);

vi.mock("expo-location", () => ({
  Accuracy: { Balanced: 1 },
  getCurrentPositionAsync: location.getCurrentPositionAsync,
  requestForegroundPermissionsAsync:
    location.requestForegroundPermissionsAsync,
}));

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({
        lang: language.value,
        setLanguage: (lang: "en" | "es") => {
          language.value = lang;
        },
        t: translations[language.value],
      }),
  };
});

vi.mock("../store/useJobGeofencing", async () => {
  const { createJobGeofenceEventQueuePayload } = await import("@pest-patrol/domain");

  function emptyDraft() {
    return {
      arrivalNotice: null,
      lastEvent: null,
      queuedAt: null,
    };
  }

  function arrivalNotificationPayload(input: {
    capturedAt: string;
    clientEventId: string;
    decision: "delay_5_min" | "send_now" | "skip";
    jobId: string;
  }) {
    return {
      captured_at: input.capturedAt,
      client_event_id: input.clientEventId,
      decision: input.decision,
      job_id: input.jobId,
    };
  }

  const useJobGeofencing = (selector?: (state: unknown) => unknown) => {
    const state = {
      drafts: geofenceState.drafts,
      getDraft: (jobId: string) => geofenceState.drafts[jobId] ?? emptyDraft(),
      hydrate: vi.fn(),
      queueArrivalNotification: (input: {
        capturedAt: string;
        clientEventId: string;
        decision: "delay_5_min" | "send_now" | "skip";
        jobId: string;
      }) => {
        const draft = geofenceState.drafts[input.jobId] ?? emptyDraft();

        if (
          !draft.lastEvent ||
          draft.lastEvent.event_type !== "arrival" ||
          draft.lastEvent.client_event_id !== input.clientEventId
        ) {
          throw new Error("Arrival event is required");
        }

        const existingArrivalNotice =
          draft.arrivalNotice?.clientEventId === input.clientEventId
            ? draft.arrivalNotice
            : null;
        const payload = arrivalNotificationPayload({
          ...input,
          decision: existingArrivalNotice?.decision ?? input.decision,
        });

        if (!existingArrivalNotice) {
          geofenceState.queueItems.push({
            action: "arrival_notification_create",
            payload,
          });
          geofenceState.drafts[input.jobId] = {
            ...draft,
            arrivalNotice: {
              clientEventId: input.clientEventId,
              decision: input.decision,
              queuedAt: now,
            },
          };
        }

        return payload;
      },
      queueGeofenceEvent: (input: {
        accuracyM?: number | null;
        eventType: "arrival" | "departure";
        jobId: string;
        latitude: number;
        longitude: number;
        serviceLatitude?: number | null;
        serviceLongitude?: number | null;
      }) => {
        const payload = createJobGeofenceEventQueuePayload({
          job_id: input.jobId,
          event_type: input.eventType,
          current: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
          serviceLocation:
            input.serviceLatitude === null ||
            input.serviceLatitude === undefined ||
            input.serviceLongitude === null ||
            input.serviceLongitude === undefined
              ? null
              : {
                  latitude: input.serviceLatitude,
                  longitude: input.serviceLongitude,
                },
          accuracy_m: input.accuracyM,
        });

        geofenceState.queueItems.push({
          action: "geofence_event_create",
          payload,
        });
        geofenceState.drafts[input.jobId] = {
          arrivalNotice: null,
          lastEvent: payload,
          queuedAt: now,
        };

        return payload;
      },
    };

    return selector ? selector(state) : state;
  };

  return { useJobGeofencing };
});

vi.mock("react-native", () => ({
  ActivityIndicator: ({ color }: { color?: string }) =>
    React.createElement("ActivityIndicator", { color }),
  Text: ({ children }: { children?: ReactNode }) =>
    React.createElement("Text", null, children),
  View: ({ children }: { children?: ReactNode }) =>
    React.createElement("View", null, children),
}));

vi.mock("@pest-patrol/ui-native", () => ({
  CaptureButton: ({
    children,
    disabled,
    onPress,
    variant,
  }: {
    children?: ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    variant?: string;
  }) =>
    React.createElement(
      "CaptureButton",
      { disabled, onPress, variant },
      children,
    ),
  CaptureSection: ({ children }: { children?: ReactNode }) =>
    React.createElement("CaptureSection", null, children),
}));

const now = "2026-05-05T22:30:00.000Z";
const job = {
  assigned_tech_id: "technician-1",
  created_at: now,
  customer_id: "customer-1",
  id: "job-1",
  location: {
    address: "10 Pine Street",
    created_at: now,
    customer_id: "customer-1",
    id: "location-1",
    is_primary: true,
    latitude: 33.8123,
    longitude: -117.9187,
    nickname: "Main office",
    service_notes: null,
    status: "active",
    updated_at: now,
  },
  location_id: "location-1",
  scheduled_end: null,
  scheduled_start: now,
  service_notes: null,
  status: "in_progress",
  updated_at: now,
} as const satisfies Job;

describe("JobGeofenceControls", () => {
  beforeEach(() => {
    language.value = "en";
    geofenceState.drafts = {};
    geofenceState.queueItems = [];
    secureStore.deleteItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
    location.getCurrentPositionAsync.mockReset();
    location.requestForegroundPermissionsAsync.mockReset();
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        accuracy: 12,
        latitude: 33.8121,
        longitude: -117.919,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the arrival approval card and queues the send now choice", async () => {
    const arrivalButton = findButton(JobGeofenceControls({ job }), "Arrival");

    expect(arrivalButton).toBeDefined();
    await triggerPress(arrivalButton);

    const afterArrival = JobGeofenceControls({ job });
    expect(collectText(afterArrival)).toContain("Arrival notice");
    expect(collectText(afterArrival)).toContain("Send now");
    expect(collectText(afterArrival)).toContain("Delay 5 min");
    expect(collectText(afterArrival)).toContain("Skip");

    const sendNowButton = findButton(afterArrival, "Send now");
    expect(sendNowButton).toBeDefined();
    await triggerPress(sendNowButton);

    const afterChoice = JobGeofenceControls({ job });
    expect(collectText(afterChoice)).toContain(
      "Arrival notice queued for immediate send",
    );
    expect(collectText(afterChoice)).not.toContain("Send now");
    expect(geofenceState.queueItems).toHaveLength(2);
    expect(geofenceState.queueItems[1]).toMatchObject({
      action: "arrival_notification_create",
    });
  });

  it("renders the arrival approval card copy in Spanish", async () => {
    language.value = "es";

    const arrivalButton = findButton(JobGeofenceControls({ job }), "Llegada");
    expect(arrivalButton).toBeDefined();
    await triggerPress(arrivalButton);

    const afterArrival = JobGeofenceControls({ job });
    expect(collectText(afterArrival)).toContain("Aviso de llegada");
    expect(collectText(afterArrival)).toContain("Enviar ahora");
    expect(collectText(afterArrival)).toContain("Retrasar 5 min");
    expect(collectText(afterArrival)).toContain("Omitir");
  });
});

async function triggerPress(element?: React.ReactElement) {
  if (!element?.props.onPress) {
    throw new Error("Button press handler is missing");
  }

  element.props.onPress();
  await Promise.resolve();
  await Promise.resolve();
}

function findButton(
  node: ReactNode,
  label: string,
): React.ReactElement | undefined {
  return collectElementsByType(node, "CaptureButton").find((button) =>
    collectText(button.props.children).includes(label),
  );
}

function collectText(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement;

    if (typeof element.type === "function") {
      return collectText(
        (element.type as (props: typeof element.props) => ReactNode)(
          element.props,
        ),
      );
    }

    return collectText(element.props.children);
  }

  return [];
}

function collectElementsByType(
  node: ReactNode,
  type: string,
): React.ReactElement[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElementsByType(child, type));
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement;
    const rendered =
      typeof element.type === "function"
        ? collectElementsByType(
            (element.type as (props: typeof element.props) => ReactNode)(
              element.props,
            ),
            type,
          )
        : [];

    return [
      ...(element.type === type ? [element] : []),
      ...collectElementsByType(element.props.children, type),
      ...rendered,
    ];
  }

  return [];
}
