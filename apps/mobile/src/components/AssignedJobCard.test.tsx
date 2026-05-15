import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { mobileRouteShellPalette } from "../styles/routeShellStyles";
import { AssignedJobCard } from "./AssignedJobCard";

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

describe("AssignedJobCard", () => {
  it("uses route-shell tokens for the job card surface and status rail", () => {
    const element = (
      <AssignedJobCard
        address="10 Pine Street"
        customerName="Apex Homes"
        notes="Check bait stations"
        scheduledStart="2026-05-07T08:00:00"
        statusLabel="In progress"
      />
    );
    const viewStyles = collectElementsByType(element, "View").flatMap((item) =>
      flattenStyles(item.props.style),
    );
    const textStyles = collectElementsByType(element, "Text").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(viewStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: mobileRouteShellPalette.surface,
        borderColor: mobileRouteShellPalette.border,
      }),
    );
    expect(viewStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: mobileRouteShellPalette.routeSoft,
      }),
    );
    expect(textStyles).toContainEqual(
      expect.objectContaining({
        color: mobileRouteShellPalette.primaryText,
      }),
    );
  });
});
