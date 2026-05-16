import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { mobileRouteShellPalette } from "../styles/routeShellStyles";
import { MobileTechnicianHeader } from "./MobileTechnicianHeader";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

const language = vi.hoisted(() => ({
  lang: "en" as "en" | "es",
  toggleLanguage: vi.fn(),
}));

vi.mock("../store/useLanguage", () => ({
  useLanguage: (selector: (state: unknown) => unknown) =>
    selector({
      lang: language.lang,
      toggleLanguage: language.toggleLanguage,
    }),
}));

vi.mock("./SyncStatusIndicator", () => ({
  SyncStatusIndicator: () => React.createElement("SyncStatusIndicator"),
}));

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

describe("MobileTechnicianHeader", () => {
  it("uses operational rail tokens for the technician command panel", () => {
    const element = (
      <MobileTechnicianHeader
        assignedJobCount={3}
        onSignOut={() => undefined}
        profileId="technician-1"
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
    expect(textStyles).toContainEqual(
      expect.objectContaining({
        color: mobileRouteShellPalette.accentText,
      }),
    );
  });

  it("uses production readiness copy without a duplicate refresh action", () => {
    const element = (
      <MobileTechnicianHeader
        assignedJobCount={0}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );
    const text = collectText(element);

    expect(text).toContain("No route today");
    expect(text).toContain("No stops assigned");
    expect(text).toContain("Check with dispatch if you expected scheduled stops.");
    expect(text).not.toContain("Demo next");
    expect(text).not.toContain(
      "Open the first assigned job, capture treatment notes, then explain queued sync.",
    );
    expect(text.filter((value) => value === "Refresh")).toHaveLength(0);
  });
});
