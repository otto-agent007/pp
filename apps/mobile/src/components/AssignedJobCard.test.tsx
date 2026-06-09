import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { mobileRouteShellPalette } from "../styles/routeShellStyles";
import { AssignedJobCard } from "./AssignedJobCard";

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({ t: translations.en }),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");

  return {
    StatusPill: ({
      children,
      tone,
    }: {
      children?: ReactNode;
      tone?: string;
    }) => ReactModule.createElement("StatusPill", { tone }, children),
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
        backgroundColor: mobileRouteShellPalette.surfaceSubtle,
      }),
    );
    expect(textStyles).toContainEqual(
      expect.objectContaining({
        color: mobileRouteShellPalette.primaryText,
      }),
    );
  });

  it("renders technician-friendly classification copy", () => {
    const element = (
      <AssignedJobCard
        address="10 Pine Street"
        classificationLabel="WDO / Escrow"
        classificationSummary="Office review is required before release."
        customerName="Apex Homes"
        scheduledStart="2026-05-07T08:00:00"
        statusLabel="Scheduled"
      />
    );
    const text = collectText(element);

    expect(text).toContain("WDO / Escrow");
    expect(text).toContain("Office review is required before release.");
    expect(text.join(" ")).not.toMatch(/billing_disposition|service_offering/i);
  });
});
