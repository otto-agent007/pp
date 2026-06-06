import React from "react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Job, OfflineQueueItem } from "@pest-patrol/types";

import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
  mobileRouteShellTone,
} from "../styles/routeShellStyles";
import { JobStatusControls } from "./JobStatusControls";

const queueStatusUpdate = vi.hoisted(() => vi.fn());
const queueItems = vi.hoisted(() => ({
  value: [] as unknown[],
}));
const language = vi.hoisted(() => ({
  value: "en" as "en" | "es",
}));

vi.mock("../store/useAssignedJobs", () => ({
  useAssignedJobs: () => queueStatusUpdate,
}));

vi.mock("../store/useOfflineQueue", () => ({
  useOfflineQueue: () => queueItems.value,
}));

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");
  const useLanguage = (selector: (state: unknown) => unknown) =>
    selector({
      lang: language.value,
      setLanguage: (lang: "en" | "es") => {
        language.value = lang;
      },
      t: translations[language.value],
    });

  useLanguage.getState = () => ({
    setLanguage: (lang: "en" | "es") => {
      language.value = lang;
    },
  });

  return { useLanguage };
});

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    Pressable: ({
      children,
      onPress,
      style,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      style?: unknown;
    }) => ReactModule.createElement("Pressable", { onPress, style }, children),
    Text: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("Text", { style }, children),
    View: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("View", { style }, children),
  };
});

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");
  const { mobileRouteShellPalette } = await import("../styles/routeShellStyles");

  return {
    CaptureButton: ({
      children,
      onPress,
      style,
      variant,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      style?: unknown;
      variant?: string;
    }) =>
      ReactModule.createElement(
        "Pressable",
        {
          onPress,
          style: [
            {
              backgroundColor:
                variant === "primary" || variant === "warning"
                  ? mobileRouteShellPalette.rail
                  : mobileRouteShellPalette.surface,
            },
            style,
          ],
          variant,
        },
        children,
      ),
    CaptureCard: ({
      children,
      style,
      tone,
    }: {
      children?: ReactNode;
      style?: unknown;
      tone?: string;
    }) => ReactModule.createElement("CaptureCard", { style, tone }, children),
    CaptureSection: ({
      children,
      style,
    }: {
      children?: ReactNode;
      style?: unknown;
    }) => ReactModule.createElement("CaptureSection", { style }, children),
  };
});

const job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: "technician-1",
  scheduled_start: "2026-05-07T08:00:00",
  scheduled_end: null,
  status: "in_progress",
  service_notes: null,
  created_at: "2026-05-07T00:00:00.000Z",
  updated_at: "2026-05-07T00:00:00.000Z",
} satisfies Job;

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
      const Component = element.type as (props: typeof element.props) => ReactNode;

      return collectText(Component(element.props));
    }

    return collectText(element.props.children);
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

function collectElementsByType(node: ReactNode, type: string): React.ReactElement[] {
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

function flattenStyles(style: unknown): Record<string, unknown>[] {
  if (!style) {
    return [];
  }

  if (Array.isArray(style)) {
    return style.flatMap(flattenStyles);
  }

  if (typeof style === "object") {
    return [style as Record<string, unknown>];
  }

  return [];
}

describe("JobStatusControls", () => {
  afterEach(() => {
    language.value = "en";
  });

  it("shows a soft completion warning and allows completing anyway", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];

    const element = <JobStatusControls job={job} />;

    expect(collectText(element)).toContain("Review before completing");
    expect(collectText(element).join(" ")).toContain(
      "Some field captures still need attention before completion.",
    );
    expect(collectText(element)).toContain("Complete anyway");

    const completeAnyway = collectPressables(element).at(-1);
    completeAnyway?.props.onPress();

    expect(queueStatusUpdate).toHaveBeenCalledWith("job-1", "completed");
  });

  it("does not queue completion from the guarded completion button", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];

    const element = <JobStatusControls job={job} />;
    const guardedCompleted = collectPressables(element).at(3);
    guardedCompleted?.props.onPress();

    expect(queueStatusUpdate).not.toHaveBeenCalled();
  });

  it("queues completion directly when required captures are synced", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [
      queueItem("geofence_event_create"),
      queueItem("chemical_log_create"),
      queueItem("photo_upload"),
      queueItem("signature_capture"),
      queueItem("form_submission_create"),
    ];

    const element = <JobStatusControls job={job} />;

    expect(collectText(element)).not.toContain("Review before completing");

    const completed = collectPressables(element).at(3);
    completed?.props.onPress();

    expect(queueStatusUpdate).toHaveBeenCalledWith("job-1", "completed");
  });

  it("renders Spanish field status copy when the technician language is Spanish", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];
    language.value = "es";

    const element = <JobStatusControls job={job} />;
    const text = collectText(element);

    expect(text).toContain("En camino");
    expect(text).toContain("Revisar antes de completar");
    expect(text).toContain("Completar de todos modos");
  });

  it("uses shared route-shell capture control tokens", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];

    const element = <JobStatusControls job={job} />;
    const pressableStyles = collectElementsByType(element, "Pressable").flatMap(
      (item) => flattenStyles(item.props.style),
    );
    const textStyles = collectElementsByType(element, "Text").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(collectElementsByType(element, "CaptureSection")).toHaveLength(1);
    expect(collectElementsByType(element, "CaptureCard").length).toBeGreaterThan(
      0,
    );
    expect(collectElementsByType(element, "CaptureCard")[0].props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining(mobileCaptureControlStyles.warningCard),
        expect.objectContaining(mobileRouteShellTone.visit.pending),
      ]),
    );
    expect(pressableStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: mobileRouteShellPalette.rail,
      }),
    );
    expect(textStyles).toContainEqual(
      expect.objectContaining(mobileCaptureControlStyles.warningTitle),
    );
  });

  it("adopts shared native capture primitives without changing completion behavior", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];

    const element = <JobStatusControls job={job} />;

    expect(collectElementsByType(element, "CaptureSection")).toHaveLength(1);
    expect(collectElementsByType(element, "CaptureCard").length).toBeGreaterThan(
      0,
    );
    expect(
      collectElementsByType(element, "Pressable").filter(
        (item) => item.props.variant === "primary",
      ).length,
    ).toBeGreaterThan(0);
  });
});

function queueItem(action: OfflineQueueItem["action"]): OfflineQueueItem {
  return {
    action,
    attempts: 0,
    created_at: "2026-05-07T00:00:00.000Z",
    id: action,
    last_error: null,
    next_retry_at: null,
    payload: { job_id: "job-1" },
    status: "synced",
    updated_at: "2026-05-07T00:00:00.000Z",
  };
}
