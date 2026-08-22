import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { TestElement } from "../test-utils/reactElement";
import { JobPhotoUploadForm, PhotoActionButtons } from "./JobPhotoUploadForm";

const queuePhoto = vi.hoisted(() => vi.fn());
const setDescription = vi.hoisted(() => vi.fn());
const photoDraft = vi.hoisted(() => ({
  value: {
    description: "",
    queuedAt: null as string | null,
    queuedPhotos: [] as Array<{ local_uri: string }>,
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useMemo: <T,>(factory: () => T) => factory(),
    useState: <T,>(initial: T) => [initial, vi.fn()],
  };
});

vi.mock("expo-image-picker", () => ({
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
  requestCameraPermissionsAsync: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
}));

vi.mock("../store/useJobPhotos", () => ({
  useJobPhotos: (selector?: (state: unknown) => unknown) => {
    const state = {
      drafts: {},
      getDraft: () => photoDraft.value,
      queuePhoto,
      setDescription,
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

vi.mock("react-native", async () => {
  const ReactModule = await import("react");

  return {
    Image: ({ source, style }: { source?: unknown; style?: unknown }) =>
      ReactModule.createElement("Image", { source, style }),
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
      onPress,
      style,
      variant,
    }: {
      children?: ReactNode;
      onPress?: () => void;
      style?: unknown;
      variant?: string;
    }) =>
      ReactModule.createElement(
        "CaptureButton",
        { onPress, style, variant },
        children,
      ),
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

describe("JobPhotoUploadForm", () => {
  it("lets shared capture buttons own simple action text", () => {
    const element = (
      <PhotoActionButtons
        cameraLabel="Camera"
        libraryLabel="Library"
        onCamera={vi.fn()}
        onLibrary={vi.fn()}
      />
    );
    const buttons = collectElementsByType(element, "CaptureButton");

    expect(buttons).toHaveLength(2);
    expect(buttons.map((button) => button.props.children)).toEqual([
      "Camera",
      "Library",
    ]);
  });

  it("frames queued photo previews with the shared capture card primitive", () => {
    photoDraft.value = {
      description: "Dry storage monitor",
      queuedAt: "2026-05-27T12:00:00.000Z",
      queuedPhotos: [{ local_uri: "file:///queued-proof.jpg" }],
    };

    const element = <JobPhotoUploadForm jobId="job-1" />;
    const cards = collectElementsByType(element, "CaptureCard");
    const images = collectElementsByType(element, "Image");

    expect(cards).toHaveLength(1);
    expect(cards[0].props.style).toEqual(
      expect.objectContaining({
        overflow: "hidden",
        padding: 0,
      }),
    );
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({
      uri: "file:///queued-proof.jpg",
    });
  });
});

function collectElementsByType(
  node: ReactNode,
  type: string,
): TestElement[] {
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
