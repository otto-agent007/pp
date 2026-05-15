import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MobileJobFieldFlow } from "./MobileJobFieldFlow";

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", null, children),
    View: ({ children }: { children?: ReactNode }) =>
      ReactModule.createElement("View", null, children),
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
        ]}
      />
    );

    const text = collectText(element);

    expect(text).toContain("Visit flow");
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
    expect(text).toContain("Photo control");
    expect(text).toContain("Signature");
    expect(text).toContain("Signature control");
  });
});
