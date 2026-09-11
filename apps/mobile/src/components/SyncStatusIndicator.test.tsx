import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { status } from "@pest-patrol/ui-tokens";

import { mobileRouteShellTone } from "../styles/routeShellStyles";
import type { TestElement } from "../test-utils/reactElement";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useMemo: <T,>(factory: () => T) => factory(),
  };
});

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({ t: translations.en }),
  };
});

const offlineQueueState = vi.hoisted(() => ({
  clearSynced: vi.fn(),
  discard: vi.fn(),
  items: [] as unknown[],
  rejected: [] as unknown[],
}));
const queueSyncState = vi.hoisted(() => ({
  syncNow: vi.fn(),
}));
const persistenceHealthState = vi.hoisted(() => ({
  failures: {} as Record<string, string>,
}));
const syncStatusState = vi.hoisted(() => ({
  activity: "idle",
  lastError: null as string | null,
  lastSyncAt: null as string | null,
  networkStatus: "online",
}));
const syncBadgeCalls = vi.hoisted(() => [] as Array<{
  children?: ReactNode;
  count?: number;
  tone?: string;
}>);

vi.mock("../store/useOfflineQueue", () => ({
  useOfflineQueue: (selector: (state: typeof offlineQueueState) => unknown) =>
    selector(offlineQueueState),
}));

vi.mock("../store/mobilePersistenceHealth", () => ({
  hasMobilePersistenceFailure: (failures: Record<string, string>) =>
    Object.keys(failures).length > 0,
  useMobilePersistenceHealth: (
    selector: (state: typeof persistenceHealthState) => unknown,
  ) => selector(persistenceHealthState),
}));

vi.mock("../store/useQueueSync", () => ({
  useQueueSync: () => queueSyncState,
}));

vi.mock("../store/useSyncStatus", () => ({
  useSyncStatus: () => syncStatusState,
}));

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");

  return {
    SyncBadge: ({
      children,
      count,
      tone,
    }: {
      children?: ReactNode;
      count?: number;
      tone?: string;
    }) => {
      syncBadgeCalls.push({ children, count, tone });

      return ReactModule.createElement(
        "SyncBadge",
        { count, tone },
        children,
      );
    },
  };
});

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

describe("SyncStatusIndicator", () => {
  it("uses compact sync detail copy and suppresses zero-value counts", () => {
    offlineQueueState.items = [];
    syncStatusState.activity = "idle";
    syncStatusState.lastError = null;
    syncStatusState.lastSyncAt = null;
    syncStatusState.networkStatus = "online";

    const text = collectText(<SyncStatusIndicator />).join("");

    expect(text).toContain("No local changes");
    expect(text).toContain("Nothing waiting to sync.");
    expect(text).toContain("Not synced");
    expect(text).not.toContain("0 pending");
    expect(text).not.toContain("0 failed");
    expect(text).not.toContain("0 synced");
  });

  it("shows only non-zero sync summary counts", () => {
    offlineQueueState.items = [
      {
        action: "job_status_update",
        attempts: 0,
        created_at: "2026-05-07T10:00:00.000Z",
        id: "queue-1",
        last_error: null,
        next_retry_at: null,
        payload: { job_id: "job-1", status: "completed" },
        status: "queued",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
    ];
    syncStatusState.activity = "idle";
    syncStatusState.lastError = null;
    syncStatusState.lastSyncAt = null;
    syncStatusState.networkStatus = "online";

    const text = collectText(<SyncStatusIndicator />).join("");

    expect(text).toContain("1 queued");
    expect(text).not.toContain("0 failed");
    expect(text).not.toContain("0 synced");

    offlineQueueState.items = [];
  });

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

  it("tells the technician when the device has stopped saving their work", () => {
    persistenceHealthState.failures = {
      "pest-patrol:offline-queue:v1": "quota exceeded",
    };

    const element = <SyncStatusIndicator />;
    const text = collectText(element);
    const styles = collectElementsByType(element, "View").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(text).toContain("This device is not saving your work");
    expect(text.join(" ")).toContain("only in memory right now");
    // The queue itself is empty and nothing has errored, so without folding
    // storage into hasFailures the card would have read as calm.
    expect(styles).toContainEqual(
      expect.objectContaining(mobileRouteShellTone.sync.failed),
    );

    persistenceHealthState.failures = {};
  });

  it("stays calm when the device is storing writes", () => {
    const element = <SyncStatusIndicator />;

    expect(collectText(element)).not.toContain(
      "This device is not saving your work",
    );
  });

  it("uses the shared warning sync badge for offline pending work", () => {
    syncBadgeCalls.length = 0;
    offlineQueueState.items = [
      {
        action: "job_status_update",
        attempts: 0,
        created_at: "2026-05-07T10:00:00.000Z",
        id: "queue-1",
        last_error: null,
        next_retry_at: null,
        payload: { job_id: "job-1", status: "completed" },
        status: "queued",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
    ];
    syncStatusState.networkStatus = "offline";

    const element = <SyncStatusIndicator />;
    const text = collectText(element).join("");
    const styles = collectElementsByType(element, "View").flatMap((item) =>
      flattenStyles(item.props.style),
    );

    expect(text).toContain("Saved offline");
    expect(syncBadgeCalls).toContainEqual(
      expect.objectContaining({
        count: 1,
        tone: "warning",
      }),
    );
    expect(styles).toContainEqual(
      expect.objectContaining({
        backgroundColor: status.alert.warning.bg,
        borderColor: status.alert.warning.border,
      }),
    );

    offlineQueueState.items = [];
    syncStatusState.networkStatus = "online";
  });

  it("tells a conflict apart from a terminal failure, which CR19 recorded and nothing read", () => {
    offlineQueueState.items = [
      {
        action: "job_status_update",
        attempts: 1,
        created_at: "2026-05-07T10:00:00.000Z",
        id: "queue-conflict",
        last_error: "Job status transition is not allowed",
        next_retry_at: null,
        outcome: "conflict",
        payload: { job_id: "job-1", status: "completed" },
        status: "failed",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
      {
        action: "photo_upload",
        attempts: 5,
        created_at: "2026-05-07T10:00:00.000Z",
        id: "queue-terminal",
        last_error: "Photo content type is not allowed",
        next_retry_at: null,
        outcome: "terminal",
        payload: {
          content_type: "image/jpeg",
          file_name: "photo.jpg",
          job_id: "job-2",
          local_uri: "file://photo.jpg",
          storage_bucket: "job-media",
          storage_path: "job-2/photo.jpg",
        },
        status: "failed",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
    ];
    syncStatusState.activity = "idle";
    syncStatusState.lastError = null;
    syncStatusState.lastSyncAt = null;
    syncStatusState.networkStatus = "online";

    const text = collectText(<SyncStatusIndicator />).join("");

    expect(text).toContain("Needs your attention");
    expect(text).toContain("Status update for job job-1");
    expect(text).toContain("The office or another device changed this first");
    expect(text).toContain("Job status transition is not allowed");
    expect(text).toContain("Photo capture for job job-2");
    expect(text).toContain("This cannot be sent.");
    expect(text).toContain("Photo content type is not allowed");

    offlineQueueState.items = [];
  });

  it("shows an entry the persisted-queue validation refused, and discards it on press", () => {
    offlineQueueState.items = [];
    offlineQueueState.rejected = [
      {
        action: "chemical_log_create",
        entry: { payload: { job_id: "job-3" } },
        id: "queue-damaged",
        last_error: "Chemical is required",
        outcome: "terminal",
        status: "failed",
      },
    ];
    offlineQueueState.discard.mockClear();
    syncStatusState.activity = "idle";
    syncStatusState.lastError = null;
    syncStatusState.lastSyncAt = null;
    syncStatusState.networkStatus = "online";

    const element = <SyncStatusIndicator />;
    const text = collectText(element).join("");
    const discard = collectElementsByType(element, "Pressable").find((pressable) =>
      collectText(pressable).includes("Discard"),
    );

    expect(text).toContain("Chemical log for job job-3");
    expect(text).toContain("Chemical is required");
    // The card reads as failing even though no queue item is failed: the
    // summary counts items, and a refused entry is not one.
    expect(text).toContain("Sync failed - retry");

    discard?.props.onPress!();

    expect(offlineQueueState.discard).toHaveBeenCalledWith("queue-damaged");

    offlineQueueState.rejected = [];
  });
});
