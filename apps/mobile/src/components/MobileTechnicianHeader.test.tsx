import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mobileRouteShellPalette } from "../styles/routeShellStyles";
import type { TestElement } from "../test-utils/reactElement";
import { MobileTechnicianHeader } from "./MobileTechnicianHeader";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");

  return {
    Button: ({
      children,
      onPress,
    }: {
      children?: ReactNode;
      onPress?: () => void;
    }) => ReactModule.createElement("Pressable", { onPress }, children),
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

function collectElementsByType(node: ReactNode, type: string): TestElement[] {
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
    const element = node as TestElement;
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
    const element = node as TestElement;
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
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_BRAND_KEY;
    language.lang = "en";
    language.toggleLanguage.mockReset();
  });

  it("renders the Pest Patrol mobile header title by default", () => {
    const element = (
      <MobileTechnicianHeader
        assignedJobCount={1}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );

    expect(collectText(element)).toContain("Pest Patrol OS");
  });

  it("renders the demo brand mobile header title", () => {
    process.env.EXPO_PUBLIC_BRAND_KEY = "demo_pest";

    const element = (
      <MobileTechnicianHeader
        assignedJobCount={1}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );

    expect(collectText(element)).toContain("Coastal Shield OS");
    expect(collectText(element)).not.toContain("Pest Patrol OS");
  });

  it("shows the Spanish language option while English is active", () => {
    language.lang = "en";

    const element = (
      <MobileTechnicianHeader
        assignedJobCount={1}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );

    expect(collectText(element)).toContain("Español");
  });

  it("shows the English language option while Spanish is active", () => {
    language.lang = "es";

    const element = (
      <MobileTechnicianHeader
        assignedJobCount={1}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );

    expect(collectText(element)).toContain("English");
  });

  it("keeps the header language button wired to the language toggle", () => {
    const element = (
      <MobileTechnicianHeader
        assignedJobCount={1}
        onSignOut={() => undefined}
        profileId="technician-1"
      />
    );
    const languageButton = collectElementsByType(element, "Pressable").find(
      (item) => collectText(item).includes("Español"),
    );

    languageButton?.props.onPress!();

    expect(language.toggleLanguage).toHaveBeenCalledTimes(1);
  });

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
