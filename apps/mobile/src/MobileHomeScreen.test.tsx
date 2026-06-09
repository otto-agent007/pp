import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import MobileHomeScreen from "../app/index";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useEffect: () => undefined,
    useMemo: <T,>(factory: () => T) => factory(),
    useState: <T,>(initial: T) => [initial, vi.fn()] as const,
  };
});

const assignedJobsState = vi.hoisted(() => ({
  error: "Network failed",
  jobs: [],
  lastLoadedAt: null as string | null,
  load: vi.fn(),
  reset: vi.fn(),
  status: "error" as "error" | "idle" | "loading" | "ready",
}));
const authState = vi.hoisted(() => ({
  error: null as string | null,
  initialize: vi.fn(),
  profile: { id: "technician-1" },
  signIn: vi.fn(),
  signOut: vi.fn(),
  status: "signed_in" as "loading" | "signed_in" | "signed_out",
}));
const offlineQueueState = vi.hoisted(() => ({
  hydrate: vi.fn(),
  items: [],
}));

vi.mock("./components/JobChemicalLogForm", () => ({
  JobChemicalLogForm: () => React.createElement("JobChemicalLogForm"),
}));
vi.mock("./components/JobGeofenceControls", () => ({
  JobGeofenceControls: () => React.createElement("JobGeofenceControls"),
}));
vi.mock("./components/MobileJobFieldFlow", () => ({
  MobileJobFieldFlow: () => React.createElement("MobileJobFieldFlow"),
}));
vi.mock("./components/JobPhotoUploadForm", () => ({
  JobPhotoUploadForm: () => React.createElement("JobPhotoUploadForm"),
}));
vi.mock("./components/MobileRouteTimeline", () => ({
  MobileRouteTimeline: () => React.createElement("MobileRouteTimeline"),
}));
vi.mock("./components/JobSignatureCaptureForm", () => ({
  JobSignatureCaptureForm: () => React.createElement("JobSignatureCaptureForm"),
}));
vi.mock("./components/JobStatusControls", () => ({
  JobStatusControls: () => React.createElement("JobStatusControls"),
}));
vi.mock("./components/JobTreatmentForm", () => ({
  JobTreatmentForm: () => React.createElement("JobTreatmentForm"),
}));
vi.mock("./components/MobileTechnicianHeader", () => ({
  MobileTechnicianHeader: () => React.createElement("MobileTechnicianHeader"),
}));

vi.mock("./store/useAssignedJobs", () => ({
  useAssignedJobs: () => assignedJobsState,
}));
vi.mock("./store/useAuth", () => ({
  useAuth: () => authState,
}));
vi.mock("./store/useChemicalLogs", () => ({
  useChemicalLogs: { getState: () => ({ hydrate: vi.fn() }) },
}));
vi.mock("./store/useFormDrafts", () => ({
  useFormDrafts: { getState: () => ({ hydrate: vi.fn() }) },
}));
vi.mock("./store/useJobGeofencing", () => ({
  useJobGeofencing: { getState: () => ({ hydrate: vi.fn() }) },
}));
vi.mock("./store/useJobPhotos", () => ({
  useJobPhotos: { getState: () => ({ hydrate: vi.fn() }) },
}));
vi.mock("./store/useJobSignatures", () => ({
  useJobSignatures: { getState: () => ({ hydrate: vi.fn() }) },
}));
vi.mock("./store/useLanguage", () => ({
  useLanguage: Object.assign(
    (selector: (state: unknown) => unknown) =>
      selector({
        t: {
          jobs: {
          status: {
            canceled: "Canceled",
            completed: "Completed",
            en_route: "En route",
            in_progress: "In progress",
            scheduled: "Scheduled",
          },
          classification: {
            callback: "Callback",
            estimate: "Estimate",
            exclusion: "Exclusion",
            follow_up: "Follow-up",
            general_pest: "General Pest",
            inspection: "Inspection",
            project_work: "Project Work",
            recurring_service: "Recurring Service",
            warranty: "Warranty",
            wdo_escrow: "WDO / Escrow",
          },
        },
      },
    }),
    {
      getState: () => ({
        hydrateLanguagePreference: vi.fn(),
      }),
    },
  ),
}));
vi.mock("./store/useOfflineQueue", () => {
  const useOfflineQueue = (selector: (state: typeof offlineQueueState) => unknown) =>
    selector(offlineQueueState);
  useOfflineQueue.getState = () => offlineQueueState;

  return { useOfflineQueue };
});
vi.mock("./store/useQueueSync", () => ({
  useQueueSync: (selector: (state: { syncNow: () => void }) => unknown) =>
    selector({ syncNow: vi.fn() }),
}));
vi.mock("./store/useSyncStatus", () => ({
  useSyncStatus: () => ({ activity: "idle", networkStatus: "online" }),
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    ActivityIndicator: ({ color }: { color?: string }) =>
      ReactModule.createElement("ActivityIndicator", { color }),
    Pressable: ({
      children,
      onPress,
      style,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      style?: unknown;
    }) => ReactModule.createElement("Pressable", { onPress, style }, children),
    ScrollView: ({
      children,
      contentContainerStyle,
      style,
    }: {
      children?: ReactNode;
      contentContainerStyle?: unknown;
      style?: unknown;
    }) =>
      ReactModule.createElement(
        "ScrollView",
        { contentContainerStyle, style },
        children,
      ),
    Text: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("Text", { style }, children),
    TextInput: (props: Record<string, unknown>) =>
      ReactModule.createElement("TextInput", props),
    View: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("View", { style }, children),
  };
});

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
    const rendered =
      typeof element.type === "function"
        ? collectText(
            (element.type as (props: typeof element.props) => ReactNode)(
              element.props,
            ),
          )
        : [];

    return [...collectText(element.props.children), ...rendered];
  }

  return [];
}

function collectPressables(node: ReactNode): React.ReactElement[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectPressables);
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement;
    const rendered =
      typeof element.type === "function"
        ? collectPressables(
            (element.type as (props: typeof element.props) => ReactNode)(
              element.props,
            ),
          )
        : [];

    return [
      ...(element.type === "Pressable" ? [element] : []),
      ...collectPressables(element.props.children),
      ...rendered,
    ];
  }

  return [];
}

describe("MobileHomeScreen", () => {
  it("shows a retry action in the assigned-jobs error card", () => {
    const element = <MobileHomeScreen />;
    const text = collectText(element);
    const retry = collectPressables(element).find((pressable) =>
      collectText(pressable).includes("Retry"),
    );

    expect(text).toContain("Unable to load assigned jobs");
    expect(text).toContain("Network failed");
    expect(text).toContain("Retry");

    retry?.props.onPress();

    expect(assignedJobsState.load).toHaveBeenCalled();
  });
});
