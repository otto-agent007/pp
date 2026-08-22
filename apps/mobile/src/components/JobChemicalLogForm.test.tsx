import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { TestElement } from "../test-utils/reactElement";
import { JobChemicalLogForm } from "./JobChemicalLogForm";

const language = vi.hoisted(() => ({
  value: "en" as "en" | "es",
}));
const queueLog = vi.hoisted(() => vi.fn());
const setDraftField = vi.hoisted(() => vi.fn());
const loadChemicals = vi.hoisted(() => vi.fn());
const chemicalDraft = vi.hoisted(() => ({
  value: {
    amount: "",
    chemicalId: "",
    notes: "",
    queuedAt: null as string | null,
  },
}));
const treatmentDraft = vi.hoisted(() => ({
  value: {
    values: {
      areas_treated: "",
      target_pests: "",
    },
  },
}));
const inventoryState = vi.hoisted(() => ({
  error: null as string | null,
  items: [] as Array<{
    created_at: string;
    current_stock: number;
    epa_number: string | null;
    id: string;
    name: string;
    reorder_level: number | null;
    status: "active";
    unit: "oz" | "gal" | "lb" | "each";
    updated_at: string;
  }>,
  load: loadChemicals,
  status: "ready" as "idle" | "loading" | "ready" | "error",
}));
const syncStatusState = vi.hoisted(() => ({
  networkStatus: "online" as "online" | "offline",
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
    useMemo: <T,>(factory: () => T) => factory(),
    useState: <T,>(initial: T) => [initial, vi.fn()],
  };
});

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({ t: translations[language.value] }),
  };
});

vi.mock("../store/useChemicalInventory", () => ({
  useChemicalInventory: () => inventoryState,
}));

vi.mock("../store/useChemicalLogs", () => ({
  useChemicalLogs: (selector?: (state: unknown) => unknown) => {
    const state = {
      drafts: {
        "job-1": chemicalDraft.value,
      },
      getDraft: () => chemicalDraft.value,
      queueLog,
      setDraftField,
    };

    return selector ? selector(state) : state;
  },
}));

vi.mock("../store/useFormDrafts", () => ({
  useFormDrafts: (selector: (state: unknown) => unknown) =>
    selector({
      getDraft: () => treatmentDraft.value,
    }),
}));

vi.mock("../store/useSyncStatus", () => ({
  useSyncStatus: (selector: (state: unknown) => unknown) =>
    selector(syncStatusState),
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    ActivityIndicator: ({ color }: { color?: string }) =>
      ReactModule.createElement("ActivityIndicator", { color }),
    Text: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("Text", { style }, children),
    TextInput: ({
      onChangeText,
      placeholder,
      style,
      value,
    }: {
      onChangeText?: (value: string) => void;
      placeholder?: string;
      style?: unknown;
      value?: string;
    }) =>
      ReactModule.createElement("TextInput", {
        onChangeText,
        placeholder,
        style,
        value,
      }),
    View: ({ children, style }: { children?: ReactNode; style?: unknown }) =>
      ReactModule.createElement("View", { style }, children),
  };
});

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");

  return {
    CaptureButton: ({
      children,
      disabled,
      onPress,
      style,
      variant,
    }: {
      children?: ReactNode;
      disabled?: boolean;
      onPress?: () => void;
      style?: unknown;
      variant?: string;
    }) =>
      ReactModule.createElement(
        "CaptureButton",
        { disabled, onPress, style, variant },
        children,
      ),
    CaptureSection: ({
      children,
      style,
    }: {
      children?: ReactNode;
      style?: unknown;
    }) => ReactModule.createElement("CaptureSection", { style }, children),
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
    const element = node as TestElement;

    if (typeof element.type === "function") {
      return collectText(
        (element.type as (props: typeof element.props) => ReactNode)(
          element.props,
        ),
      );
    }

    return collectText(element.props.children);
  }

  return [];
}

function collectButtons(node: ReactNode): TestElement[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectButtons);
  }

  if (React.isValidElement(node)) {
    const element = node as TestElement;
    const rendered =
      typeof element.type === "function"
        ? collectButtons(
            (element.type as (props: typeof element.props) => ReactNode)(
              element.props,
            ),
          )
        : [];

    return [
      ...(element.type === "CaptureButton" ? [element] : []),
      ...collectButtons(element.props.children),
      ...rendered,
    ];
  }

  return [];
}

describe("JobChemicalLogForm", () => {
  it("blocks queueing until the chemical context is complete and shows inline validation copy", () => {
    language.value = "en";
    syncStatusState.networkStatus = "offline";
    chemicalDraft.value = {
      amount: "2",
      chemicalId: "chem-1",
      notes: "Apply around the foundation",
      queuedAt: null,
    };
    treatmentDraft.value = {
      values: {
        areas_treated: "",
        target_pests: "",
      },
    };
    inventoryState.items = [
      {
        created_at: "2026-05-07T00:00:00.000Z",
        current_stock: 10,
        epa_number: "12345",
        id: "chem-1",
        name: "TermiShield",
        reorder_level: 2,
        status: "active",
        unit: "oz",
        updated_at: "2026-05-07T00:00:00.000Z",
      },
    ];

    const element = <JobChemicalLogForm jobId="job-1" />;
    const text = collectText(element).join(" ");
    const buttons = collectButtons(element);

    expect(text).toContain("Chemical log");
    expect(text).toContain("Inventory will reconcile after sync");
    expect(text).toContain("Add target pests and treated site details before saving");
    expect(buttons.at(-1)?.props.disabled).toBe(true);
  });

  it("queues a completed chemical draft and preserves saved-offline copy", () => {
    language.value = "en";
    syncStatusState.networkStatus = "online";
    queueLog.mockReset();
    chemicalDraft.value = {
      amount: "2.5",
      chemicalId: "chem-1",
      notes: "Apply around the foundation",
      queuedAt: "2026-05-07T11:30:00.000Z",
    };
    treatmentDraft.value = {
      values: {
        areas_treated: "Exterior perimeter",
        target_pests: "Ants",
      },
    };
    inventoryState.items = [
      {
        created_at: "2026-05-07T00:00:00.000Z",
        current_stock: 10,
        epa_number: "12345",
        id: "chem-1",
        name: "TermiShield",
        reorder_level: 2,
        status: "active",
        unit: "oz",
        updated_at: "2026-05-07T00:00:00.000Z",
      },
    ];

    const element = <JobChemicalLogForm jobId="job-1" />;
    const text = collectText(element).join(" ");
    const buttons = collectButtons(element);

    expect(text).toContain("Saved offline");
    expect(buttons.at(-1)?.props.disabled).toBe(false);

    buttons.at(-1)?.props.onPress!();

    expect(queueLog).toHaveBeenCalledWith("job-1");
  });

  it("renders the Spanish validation copy for missing context", () => {
    language.value = "es";
    syncStatusState.networkStatus = "offline";
    chemicalDraft.value = {
      amount: "2",
      chemicalId: "chem-1",
      notes: "",
      queuedAt: null,
    };
    treatmentDraft.value = {
      values: {
        areas_treated: "",
        target_pests: "",
      },
    };
    inventoryState.items = [
      {
        created_at: "2026-05-07T00:00:00.000Z",
        current_stock: 10,
        epa_number: "12345",
        id: "chem-1",
        name: "TermiShield",
        reorder_level: 2,
        status: "active",
        unit: "oz",
        updated_at: "2026-05-07T00:00:00.000Z",
      },
    ];

    const text = collectText(<JobChemicalLogForm jobId="job-1" />).join(" ");

    expect(text).toContain("Registro químico");
    expect(text).toContain("El inventario se reconciliará después de sincronizar");
    expect(text).toContain("Agrega las plagas objetivo y el sitio tratado antes de guardar");
    expect(text).toContain("Guardar químico");
  });
});
