import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { MobileDailyRouteTimeline } from "@pest-patrol/domain";

import { MobileRouteTimeline } from "./MobileRouteTimeline";

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", null, children),
    Pressable: ({
      children,
      onPress,
    }: {
      children?: ReactNode;
      onPress?: () => void;
    }) => ReactModule.createElement("Pressable", { onPress }, children),
    View: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("View", null, children),
  };
});

const now = "2026-05-07T17:15:00.000Z";

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

const timeline = {
  current: {
    job: {
      id: "job-current",
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: "technician-1",
      scheduled_start: "2026-05-07T08:00:00",
      scheduled_end: null,
      status: "in_progress",
      service_notes: "Check bait stations",
      created_at: now,
      updated_at: now,
      customer: {
        id: "customer-1",
        name: "Apex Homes",
        phone: null,
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      location: {
        id: "location-1",
        customer_id: "customer-1",
        address: "10 Pine Street",
        nickname: null,
        service_notes: null,
        is_primary: true,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    },
    readinessLabel: "2 done, 1 pending, 3 missing",
    sectionLabel: "Current job",
    workPlan: [],
  },
  date: "2026-05-07",
  later: [
    {
      job: {
        id: "job-later",
        customer_id: "customer-2",
        location_id: "location-2",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-07T11:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
        customer: {
          id: "customer-2",
          name: "Green Market",
          phone: null,
          email: null,
          property_type: "commercial",
          service_notes: null,
          status: "active",
          created_at: now,
          updated_at: now,
        },
        location: {
          id: "location-2",
          customer_id: "customer-2",
          address: "20 Oak Avenue",
          nickname: null,
          service_notes: null,
          is_primary: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      readinessLabel: "1 done, 0 pending, 5 missing",
      sectionLabel: "Later today",
      workPlan: [],
    },
  ],
  next: {
    job: {
      id: "job-next",
      customer_id: "customer-3",
      location_id: "location-3",
      assigned_tech_id: "technician-1",
      scheduled_start: "2026-05-07T09:30:00",
      scheduled_end: null,
      status: "scheduled",
      service_notes: null,
      created_at: now,
      updated_at: now,
      customer: {
        id: "customer-3",
        name: "Lopez Residence",
        phone: null,
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      location: {
        id: "location-3",
        customer_id: "customer-3",
        address: "30 Cedar Road",
        nickname: null,
        service_notes: null,
        is_primary: true,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    },
    readinessLabel: "1 done, 1 pending, 4 missing",
    sectionLabel: "Next job",
    workPlan: [],
  },
  summary: {
    label: "3 jobs assigned today",
    syncLabel: "1 local item in sync queue",
    title: "Today's route",
  },
} satisfies MobileDailyRouteTimeline;

describe("MobileRouteTimeline", () => {
  it("renders current, next, and compact later route sections", () => {
    const element = (
      <MobileRouteTimeline
        renderJobControls={(job) => `Controls for ${job.id}`}
        statusLabels={{
          canceled: "Canceled",
          completed: "Completed",
          en_route: "En route",
          in_progress: "In progress",
          scheduled: "Scheduled",
        }}
        timeline={timeline}
      />
    );

    const text = collectText(element);

    expect(text).toContain("Today's route");
    expect(text).toContain("3 jobs assigned today");
    expect(text).toContain("Current job");
    expect(text).toContain("Apex Homes");
    expect(text).toContain("Controls for job-current");
    expect(text).toContain("Next job");
    expect(text).toContain("Lopez Residence");
    expect(text).toContain("Controls for job-next");
    expect(text).toContain("Later today");
    expect(text).toContain("Green Market");
    expect(text).toContain("1 done, 0 pending, 5 missing");
    expect(text).not.toContain("Controls for job-later");
  });

  it("renders full controls for a focused later route stop", () => {
    const element = (
      <MobileRouteTimeline
        focusedJobId="job-later"
        onFocusJob={() => undefined}
        renderJobControls={(job) => `Controls for ${job.id}`}
        statusLabels={{
          canceled: "Canceled",
          completed: "Completed",
          en_route: "En route",
          in_progress: "In progress",
          scheduled: "Scheduled",
        }}
        timeline={timeline}
      />
    );

    const text = collectText(element);

    expect(text).toContain("Green Market");
    expect(text).toContain("Controls for job-later");
  });

  it("keeps later stops compact when focus points elsewhere", () => {
    const element = (
      <MobileRouteTimeline
        focusedJobId="job-missing"
        renderJobControls={(job) => `Controls for ${job.id}`}
        statusLabels={{
          canceled: "Canceled",
          completed: "Completed",
          en_route: "En route",
          in_progress: "In progress",
          scheduled: "Scheduled",
        }}
        timeline={timeline}
      />
    );

    expect(collectText(element)).not.toContain("Controls for job-later");
  });

  it("focuses compact later stops when pressed", () => {
    const onFocusJob = vi.fn();
    const element = (
      <MobileRouteTimeline
        onFocusJob={onFocusJob}
        renderJobControls={(job) => `Controls for ${job.id}`}
        statusLabels={{
          canceled: "Canceled",
          completed: "Completed",
          en_route: "En route",
          in_progress: "In progress",
          scheduled: "Scheduled",
        }}
        timeline={timeline}
      />
    );
    const pressables = collectElementsByType(element, "Pressable");

    pressables[0].props.onPress();

    expect(onFocusJob).toHaveBeenCalledWith("job-later");
  });
});
