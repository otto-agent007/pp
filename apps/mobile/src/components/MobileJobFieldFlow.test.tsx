import React from "react";
import type { ReactNode } from "react";
import type { Job } from "@pest-patrol/types";
import { describe, expect, it, vi } from "vitest";

import { mobileRouteShellTone } from "../styles/routeShellStyles";
import { MobileJobFieldFlow } from "./MobileJobFieldFlow";

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({ t: translations.en }),
  };
});

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: ({
      children,
      style,
    }: {
      children?: ReactNode;
      style?: unknown;
    }) => ReactModule.createElement("Text", { style }, children),
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

describe("MobileJobFieldFlow", () => {
  it("groups field controls into the visit flow without dropping queue controls", () => {
    const element = (
      <MobileJobFieldFlow
        chemicalLog="Chemical log control"
        geofenceControls="Geofence control"
        jobStatusControls="Status control"
        photoUpload="Photo control"
        signatureCapture="Signature control"
        treatmentForm="Treatment form control"
        workPlan={[
          {
            id: "status",
            label: "Start or complete job",
            state: "done",
            summary: "Job is in progress.",
          },
          {
            id: "geofence",
            label: "Capture arrival/departure",
            state: "pending",
            summary: "Geofence event is queued for sync.",
          },
          {
            id: "form",
            label: "Submit treatment form",
            state: "missing",
            summary: "No treatment form queued yet.",
          },
          {
            id: "photo",
            label: "Capture photos",
            state: "failed",
            summary: "Photo capture needs retry.",
          },
        ]}
      />
    );

    const text = collectText(element);
    const renderedText = text.join("");

    expect(text).toContain("Field checklist");
    expect(renderedText).toContain("1 done - 1 queued - 1 failed - 1 needed");
    expect(text).toContain("Start visit");
    expect(text).toContain("Done");
    expect(text).toContain("Status control");
    expect(text).toContain("Arrive and depart");
    expect(text).toContain("Queued");
    expect(text).toContain("Geofence control");
    expect(text).toContain("Treatment notes");
    expect(text).toContain("Needed");
    expect(text).toContain("Treatment form control");
    expect(text).toContain("Chemical use");
    expect(text).toContain("Chemical log control");
    expect(text).toContain("Photos");
    expect(text).toContain("Failed");
    expect(text).toContain("Sync failed - retry available.");
    expect(text).toContain("Photo control");
    expect(text).toContain("Signature");
    expect(text).toContain("Signature control");
  });

  it("uses shared visual tones for done, queued, and needed visit states", () => {
    const element = (
      <MobileJobFieldFlow
        chemicalLog="Chemical log control"
        geofenceControls="Geofence control"
        jobStatusControls="Status control"
        photoUpload="Photo control"
        signatureCapture="Signature control"
        treatmentForm="Treatment form control"
        workPlan={[
          {
            id: "status",
            label: "Start or complete job",
            state: "done",
            summary: "Job is in progress.",
          },
          {
            id: "geofence",
            label: "Capture arrival/departure",
            state: "pending",
            summary: "Geofence event is queued for sync.",
          },
          {
            id: "form",
            label: "Submit treatment form",
            state: "missing",
            summary: "No treatment form queued yet.",
          },
        ]}
      />
    );
    const styles = collectElementsByType(element, "View").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(styles).toContainEqual(
      expect.objectContaining(mobileRouteShellTone.visit.done),
    );
    expect(styles).toContainEqual(
      expect.objectContaining(mobileRouteShellTone.visit.pending),
    );
    expect(styles).toContainEqual(
      expect.objectContaining(mobileRouteShellTone.visit.missing),
    );
  });

  it.each([
    [
      "Estimate",
      {
        billing_disposition: "estimate_only",
        job_purpose: "estimate",
      },
      [
        "Estimate",
        "Treatment is not required unless directed.",
        "Estimate scope",
        "Chemical log is only needed if product was used.",
        "Recommended",
      ],
    ],
    [
      "Recurring Service",
      {
        service_cadence: "monthly",
        service_family: "recurring_general_pest",
      },
      ["Recurring Service", "Access/issues notes", "Chemical log if used"],
    ],
    [
      "Exclusion / Project",
      {
        service_offering_id: "rodent_exclusion",
      },
      ["Exclusion / Project", "Before photos", "After photos", "Photo proof expected"],
    ],
    [
      "WDO / Escrow",
      {
        service_family: "termite_wdo",
        service_offering_id: "wdo_escrow_inspection",
      },
      [
        "WDO / Escrow",
        "Office review required before final document release.",
        "Required photos",
      ],
    ],
  ])("renders %s work-mode checklist copy", (_label, jobOverrides, expectedCopy) => {
    const element = (
      <MobileJobFieldFlow
        chemicalLog="Chemical log control"
        geofenceControls="Geofence control"
        job={{
          assigned_tech_id: null,
          created_at: "2026-06-09T12:00:00Z",
          customer_id: "customer-1",
          id: "job-1",
          location_id: "location-1",
          scheduled_end: null,
          scheduled_start: "2026-06-09T12:00:00Z",
          service_notes: null,
          status: "scheduled",
          updated_at: "2026-06-09T12:00:00Z",
          ...jobOverrides,
        } as Job}
        jobStatusControls="Status control"
        photoUpload="Photo control"
        signatureCapture="Signature control"
        treatmentForm="Treatment form control"
        workPlan={[
          {
            id: "status",
            label: "Start or complete job",
            state: "missing",
            summary: "Job is scheduled.",
          },
        ]}
      />
    );
    const renderedText = collectText(element).join(" ");

    for (const expected of expectedCopy) {
      expect(renderedText).toContain(expected);
    }
    expect(renderedText).toContain("Status control");
    expect(renderedText).toContain("Geofence control");
    expect(renderedText).toContain("Treatment form control");
    expect(renderedText).toContain("Chemical log control");
    expect(renderedText).toContain("Photo control");
    expect(renderedText).toContain("Signature control");
    expect(renderedText).not.toMatch(
      /job_purpose|billing_disposition|service_family|service_offering_id/i,
    );
  });
});
