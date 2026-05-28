import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { JobSignatureCaptureForm } from "./JobSignatureCaptureForm";

const signatureDraft = vi.hoisted(() => ({
  value: {
    queuedAt: null as string | null,
    signerName: "",
  },
}));
const queueSignature = vi.hoisted(() => vi.fn());
const setSignerName = vi.hoisted(() => vi.fn());

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(initial: T) => ({ current: initial }),
    useState: <T,>(initial: T) => [initial, vi.fn()],
  };
});

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
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

vi.mock("react-native-signature-canvas", async () => {
  const ReactModule = await import("react");

  return {
    default: ({
      autoClear,
      clearText,
      confirmText,
      webStyle,
    }: {
      autoClear?: boolean;
      clearText?: string;
      confirmText?: string;
      webStyle?: string;
    }) =>
      ReactModule.createElement("SignatureCanvas", {
        autoClear,
        clearText,
        confirmText,
        webStyle,
      }),
  };
});

vi.mock("@pest-patrol/ui-native", async () => {
  const ReactModule = await import("react");

  return {
    CaptureCard: ({
      children,
      style,
      tone,
    }: {
      children?: ReactNode;
      style?: unknown;
      tone?: string;
    }) => ReactModule.createElement("CaptureCard", { style, tone }, children),
    CaptureSection: ({
      children,
      style,
    }: {
      children?: ReactNode;
      style?: unknown;
    }) => ReactModule.createElement("CaptureSection", { style }, children),
  };
});

vi.mock("../store/useJobSignatures", () => ({
  useJobSignatures: (selector?: (state: unknown) => unknown) => {
    const state = {
      drafts: {},
      getDraft: () => signatureDraft.value,
      queueSignature,
      setSignerName,
    };

    return selector ? selector(state) : state;
  },
}));

vi.mock("../store/useLanguage", async () => {
  const { translations } = await import("@pest-patrol/i18n");

  return {
    useLanguage: (selector: (state: unknown) => unknown) =>
      selector({ t: translations.en }),
  };
});

describe("JobSignatureCaptureForm", () => {
  it("frames the signature pad with the shared capture card primitive", () => {
    const element = <JobSignatureCaptureForm jobId="job-1" />;
    const cards = collectElementsByType(element, "CaptureCard");
    const signaturePads = collectElementsByType(element, "SignatureCanvas");

    expect(cards).toHaveLength(1);
    expect(cards[0].props.style).toEqual(
      expect.objectContaining({
        height: 220,
        overflow: "hidden",
        padding: 0,
      }),
    );
    expect(signaturePads).toHaveLength(1);
    expect(signaturePads[0].props.autoClear).toBe(false);
  });
});

function collectElementsByType(
  node: ReactNode,
  type: string,
): React.ReactElement[] {
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
    if (typeof element.type === "function") {
      return collectElementsByType(
        (element.type as (props: typeof element.props) => ReactNode)(
          element.props,
        ),
        type,
      );
    }

    return [
      ...(element.type === type ? [element] : []),
      ...collectElementsByType(element.props.children, type),
    ];
  }

  return [];
}
