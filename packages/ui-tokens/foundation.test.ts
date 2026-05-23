import { describe, expect, it } from "vitest";

import {
  brand,
  customerTheme,
  darkTheme,
  duration,
  easing,
  figmaColorVariables,
  lightTheme,
  palette,
  primitive,
  semantic,
  status,
} from "./index";

describe("Pest Patrol design token foundation", () => {
  it("exports the Pest Patrol primitive palette without generic color aliases", () => {
    expect(primitive).toMatchObject({
      navy: {
        950: "#071A3D",
        900: "#0A234F",
        800: "#102F66",
      },
      sky: {
        500: "#0EA5E9",
        600: "#0284C7",
      },
      red: {
        500: "#E11D2E",
        600: "#C51628",
      },
      yellow: {
        400: "#FACC15",
        500: "#EAB308",
      },
      green: {
        500: "#16A34A",
        600: "#15803D",
      },
      cream: {
        50: "#F6F2EA",
      },
      slate: {
        50: "#F8FAFC",
        100: "#F1F5F9",
        200: "#E2E8F0",
        300: "#CBD5E1",
        500: "#64748B",
        700: "#334155",
        800: "#1E293B",
        950: "#0F172A",
      },
      white: "#FFFFFF",
    });

    expect(palette).toBe(primitive);
    expect("blue" in primitive).toBe(false);
    expect("emerald" in primitive).toBe(false);
    expect("amber" in primitive).toBe(false);
    expect("gray" in primitive).toBe(false);

    expect(brand).toMatchObject({
      primary: primitive.sky[500],
      secondary: primitive.yellow[400],
      accent: primitive.green[500],
    });
  });

  it("exports Pest Patrol light, dark, and customer semantic themes", () => {
    expect(semantic).toBe(lightTheme);
    expect(lightTheme).toMatchObject({
      background: {
        canvas: primitive.white,
        surface: primitive.white,
        subtle: primitive.slate[50],
        inverse: primitive.navy[950],
      },
      border: {
        subtle: primitive.slate[200],
        default: primitive.slate[300],
        strong: primitive.navy[800],
      },
      text: {
        primary: primitive.navy[950],
        secondary: primitive.slate[700],
        muted: primitive.slate[500],
        inverse: primitive.white,
      },
      action: {
        primary: primitive.sky[500],
        primaryStrong: primitive.sky[600],
        danger: primitive.red[500],
      },
      status: {
        scheduled: primitive.slate[700],
        enRoute: primitive.sky[500],
        inProgress: primitive.yellow[400],
        completed: primitive.green[500],
        urgent: primitive.red[500],
      },
    });
    expect(darkTheme).toMatchObject({
      background: {
        canvas: primitive.slate[950],
        surface: primitive.slate[800],
        subtle: primitive.navy[900],
      },
      text: {
        primary: primitive.white,
        secondary: primitive.slate[300],
        muted: primitive.slate[300],
      },
      border: {
        subtle: primitive.slate[700],
        default: primitive.slate[500],
        strong: primitive.sky[500],
      },
      action: {
        primary: primitive.sky[500],
        primaryStrong: primitive.sky[600],
        danger: primitive.red[500],
      },
    });
    expect(customerTheme.action.primary).toBe(primitive.sky[500]);
  });

  it("exports visual status tokens for operational states", () => {
    expect(Object.keys(status.job)).toEqual([
      "scheduled",
      "en_route",
      "in_progress",
      "completed",
      "canceled",
    ]);
    expect(Object.keys(status.invoice)).toEqual(["draft", "sent", "paid", "void"]);
    expect(Object.keys(status.inventory)).toEqual([
      "active",
      "archived",
      "low_stock",
      "out_of_stock",
    ]);
    expect(Object.keys(status.sync)).toEqual([
      "queued",
      "retrying",
      "failed",
      "synced",
    ]);
    expect(Object.keys(status.alert)).toEqual([
      "neutral",
      "info",
      "success",
      "warning",
      "danger",
    ]);

    expect(status.job.scheduled).toMatchObject({
      fg: primitive.slate[700],
      bg: primitive.slate[50],
      border: primitive.slate[200],
      solid: primitive.slate[700],
    });
    expect(status.job.en_route.solid).toBe(primitive.sky[500]);
    expect(status.job.in_progress.solid).toBe(primitive.yellow[400]);
    expect(status.job.completed.solid).toBe(primitive.green[500]);
    expect(status.sync.queued.bg).toBe(primitive.sky[50]);
    expect(status.sync.retrying.bg).toBe(primitive.yellow[50]);
    expect(status.sync.synced.bg).toBe(primitive.green[50]);
    expect(status.sync.failed.fgStrong).toBe(primitive.red[600]);
  });

  it("exports Figma variable names that mirror code token paths", () => {
    expect(figmaColorVariables).toMatchObject({
      "primitive/navy/950": primitive.navy[950],
      "primitive/sky/500": primitive.sky[500],
      "primitive/red/500": primitive.red[500],
      "semantic/light/background/canvas": lightTheme.background.canvas,
      "semantic/light/background/surface": lightTheme.background.surface,
      "semantic/light/background/subtle": lightTheme.background.subtle,
      "semantic/light/border/default": lightTheme.border.default,
      "semantic/light/border/subtle": lightTheme.border.subtle,
      "semantic/light/text/primary": lightTheme.text.primary,
      "semantic/light/text/muted": lightTheme.text.muted,
      "semantic/light/action/primary": lightTheme.action.primary,
      "semantic/status/en-route": lightTheme.status.enRoute,
      "semantic/status/in-progress": lightTheme.status.inProgress,
      "semantic/status/completed": lightTheme.status.completed,
      "semantic/dark/background/canvas": darkTheme.background.canvas,
      "semantic/dark/background/surface": darkTheme.background.surface,
      "semantic/dark/border/default": darkTheme.border.default,
    });
  });

  it("exports React Native-friendly durations and CSS easing curves", () => {
    expect(duration).toMatchObject({
      instant: 0,
      fast: 120,
      base: 200,
      slow: 320,
      slower: 500,
    });
    expect(easing).toMatchObject({
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      enter: "cubic-bezier(0, 0, 0.2, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
      emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    });
  });
});
