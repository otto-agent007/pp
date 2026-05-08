import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Job, OfflineQueueItem } from "@pest-patrol/types";

import { JobStatusControls } from "./JobStatusControls";

const queueStatusUpdate = vi.hoisted(() => vi.fn());
const queueItems = vi.hoisted(() => ({
  value: [] as unknown[],
}));

vi.mock("../store/useAssignedJobs", () => ({
  useAssignedJobs: () => queueStatusUpdate,
}));

vi.mock("../store/useOfflineQueue", () => ({
  useOfflineQueue: () => queueItems.value,
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    Pressable: ({
      children,
      onPress,
    }: {
      children?: ReactNode;
      onPress?: () => void;
    }) => ReactModule.createElement("Pressable", { onPress }, children),
    Text: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", null, children),
    View: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("View", null, children),
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

describe("JobStatusControls", () => {
  it("shows a soft completion warning and allows completing anyway", () => {
    queueStatusUpdate.mockReset();
    queueItems.value = [];

    const element = <JobStatusControls job={job} />;

    expect(collectText(element)).toContain("Review before completing");
    expect(collectText(element).join(" ")).toContain("Missing capture arrival/departure");
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
