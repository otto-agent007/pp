import React from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  fontSize,
  fontWeight,
  lightTheme,
  primitive,
  radius,
  spacing,
  status,
} from "@pest-patrol/ui-tokens";

import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  StatTile,
  StatusPill,
  SyncBadge,
} from "./index";

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

function pressableStyles(
  element: React.ReactElement,
  pressed = false,
): Record<string, unknown>[] {
  const style = element.props.style;

  return flattenStyles(
    typeof style === "function" ? style({ pressed }) : style,
  );
}

function mergedStyles(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...flattenStyles(style));
}

describe("ui-native primitives", () => {
  it("renders buttons with tokenized variants, sizing, disabled, pressed, and full-width state", () => {
    const element = (
      <Button disabled fullWidth size="md" variant="ghost">
        Language
      </Button>
    );
    const pressable = collectElementsByType(element, "Pressable")[0];
    const defaultStyles = Object.assign({}, ...pressableStyles(pressable));
    const pressedStyles = Object.assign({}, ...pressableStyles(pressable, true));

    expect(pressable.props.disabled).toBe(true);
    expect(defaultStyles).toEqual(
      expect.objectContaining({
        alignSelf: "stretch",
        borderColor: lightTheme.border.default,
        minHeight: 44,
        opacity: 0.5,
      }),
    );
    expect(pressedStyles).toEqual(
      expect.objectContaining({
        backgroundColor: lightTheme.background.subtle,
      }),
    );
    expect(collectText(element)).toContain("Language");
  });

  it("renders cards and eyebrows with tokenized surface, padding, and text tones", () => {
    const card = (
      <Card padding="lg" tone="subtle">
        <Eyebrow tone="danger">Needs sync</Eyebrow>
      </Card>
    );
    const viewStyles = mergedStyles(
      collectElementsByType(card, "View")[0].props.style,
    );
    const textStyles = mergedStyles(
      collectElementsByType(card, "Text")[0].props.style,
    );

    expect(viewStyles).toEqual(
      expect.objectContaining({
        backgroundColor: lightTheme.background.subtle,
        borderColor: lightTheme.border.subtle,
        borderRadius: radius.md,
        padding: spacing[4],
      }),
    );
    expect(textStyles).toEqual(
      expect.objectContaining({
        color: status.sync.failed.solid,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        textTransform: "uppercase",
      }),
    );
  });

  it("renders status pills with tone colors and optional dots", () => {
    const withDot = <StatusPill tone="warning">Queued</StatusPill>;
    const withoutDot = (
      <StatusPill dot={false} tone="success">
        Synced
      </StatusPill>
    );
    const withDotViews = collectElementsByType(withDot, "View");
    const withoutDotViews = collectElementsByType(withoutDot, "View");
    const withDotMergedStyles = withDotViews.map((item) =>
      mergedStyles(item.props.style),
    );

    expect(withDotMergedStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: status.alert.warning.bg,
        borderColor: status.alert.warning.border,
      }),
    );
    expect(withDotMergedStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: status.sync.retrying.solid,
        height: 6,
        width: 6,
      }),
    );
    expect(withoutDotViews).toHaveLength(1);
    expect(collectText(withoutDot)).toContain("Synced");
  });

  it("renders sync badges with tone, count, and optional dots", () => {
    const element = (
      <SyncBadge count={3} tone="warning">
        Offline
      </SyncBadge>
    );
    const viewStyles = collectElementsByType(element, "View").map((item) =>
      mergedStyles(item.props.style),
    );

    expect(collectText(element)).toEqual(
      expect.arrayContaining(["Offline", "3"]),
    );
    expect(viewStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: status.alert.warning.bg,
        borderColor: status.alert.warning.border,
      }),
    );
    expect(viewStyles).toContainEqual(
      expect.objectContaining({
        backgroundColor: status.sync.retrying.solid,
        height: 6,
        width: 6,
      }),
    );
  });

  it("renders stat tiles with tone values and optional detail copy", () => {
    const element = (
      <StatTile detail="2 stops need sync" label="Queued" tone="info" value={3} />
    );
    const valueTextStyle = mergedStyles(
      collectElementsByType(element, "Text")[0].props.style,
    );

    expect(collectText(element)).toEqual(
      expect.arrayContaining(["3", "Queued", "2 stops need sync"]),
    );
    expect(valueTextStyle).toEqual(
      expect.objectContaining({
        color: status.alert.info.solid,
        fontSize: fontSize["2xl"],
        fontVariant: ["tabular-nums"],
      }),
    );
  });

  it("renders avatar initials, size, and palette from existing tokens", () => {
    const element = <Avatar name="Maya Torres" size="lg" />;
    const viewStyles = mergedStyles(
      collectElementsByType(element, "View")[0].props.style,
    );
    const textStyles = mergedStyles(
      collectElementsByType(element, "Text")[0].props.style,
    );

    expect(collectText(element)).toContain("MT");
    expect(viewStyles).toEqual(
      expect.objectContaining({
        height: 40,
        width: 40,
      }),
    );
    expect(viewStyles).not.toEqual(
      expect.objectContaining({
        backgroundColor: undefined,
      }),
    );
    expect(textStyles).toEqual(
      expect.objectContaining({
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
      }),
    );
    expect(Object.values(primitive.navy)).not.toContain(undefined);
  });
});
