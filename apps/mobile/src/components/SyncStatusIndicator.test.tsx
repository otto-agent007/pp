import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { mobileRouteShellTone } from "../styles/routeShellStyles";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

const offlineQueueState = vi.hoisted(() => ({
  clearSynced: vi.fn(),
  items: [] as unknown[],
}));
const queueSyncState = vi.hoisted(() => ({
  syncNow: vi.fn(),
}));
const syncStatusState = vi.hoisted(() => ({
  activity: "idle",
  lastError: null as string | null,
  lastSyncAt: null as string | null,
  networkStatus: "online",
}));

vi.mock("../store/useOfflineQueue", () => ({
  useOfflineQueue: (selector: (state: typeof offlineQueueState) => unknown) =>
    selector(offlineQueueState),
}));

vi.mock("../store/useQueueSync", () => ({
  useQueueSync: () => queueSyncState,
}));

vi.mock("../store/useSyncStatus", () => ({
  useSyncStatus: () => syncStatusState,
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    Pressable: ({
      children,
      disabled,
      onPress,
      style,
    }: {
      children?: ReactNode;
      disabled?: boolean;
      onPress?: () => void;
      style?: unknown;
    }) =>
      ReactModule.createElement(
        "Pressable",
        { disabled, onPress, style },
        children,
      ),
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

describe("SyncStatusIndicator", () => {
  it("uses shared sync-failure tone when the route shell needs attention", () => {
    syncStatusState.lastError = "Network failed";

    const element = <SyncStatusIndicator />;
    const styles = collectElementsByType(element, "View").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(styles).toContainEqual(
      expect.objectContaining(mobileRouteShellTone.sync.failed),
    );

    syncStatusState.lastError = null;
  });
});
