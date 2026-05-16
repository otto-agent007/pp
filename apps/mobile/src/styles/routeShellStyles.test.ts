import { describe, expect, it } from "vitest";
import {
  duration,
  lightTheme,
  radius,
  spacing,
  status,
} from "@pest-patrol/ui-tokens";

import {
  mobileCaptureControlStyles,
  mobileRouteShellPalette,
  mobileRouteShellStyles,
  mobileRouteShellTone,
} from "./routeShellStyles";

describe("mobile route shell styles", () => {
  it("maps the operational rail to shared Pest Patrol design tokens", () => {
    expect(mobileRouteShellPalette.canvas).toBe(lightTheme.background.canvas);
    expect(mobileRouteShellPalette.surface).toBe(lightTheme.background.surface);
    expect(mobileRouteShellPalette.rail).toBe(lightTheme.background.inverse);
    expect(mobileRouteShellPalette.border).toBe(lightTheme.border.subtle);
    expect(mobileRouteShellPalette.primaryText).toBe(lightTheme.text.primary);
    expect(mobileRouteShellPalette.secondaryText).toBe(lightTheme.text.secondary);
  });

  it("keeps route-shell layout values on shared spacing, radius, and motion tokens", () => {
    expect(mobileRouteShellStyles.screen.padding).toBe(spacing[6]);
    expect(mobileRouteShellStyles.card.borderRadius).toBe(radius.md);
    expect(mobileRouteShellStyles.control.minHeight).toBe(44);
    expect(mobileRouteShellStyles.transitionMs).toBe(duration.base);
  });

  it("uses visual status tokens for sync and visit-flow shell states", () => {
    expect(mobileRouteShellTone.sync.ready.backgroundColor).toBe(status.sync.queued.bg);
    expect(mobileRouteShellTone.sync.failed.borderColor).toBe(status.sync.failed.border);
    expect(mobileRouteShellTone.visit.done.backgroundColor).toBe(status.sync.synced.bg);
    expect(mobileRouteShellTone.visit.failed.backgroundColor).toBe(status.sync.failed.bg);
    expect(mobileRouteShellTone.visit.pending.backgroundColor).toBe(status.sync.retrying.bg);
    expect(mobileRouteShellTone.visit.missing.backgroundColor).toBe(status.alert.neutral.bg);
  });

  it("exposes shared capture-control styles for mobile field controls", () => {
    expect(mobileCaptureControlStyles.section.borderColor).toBe(
      mobileRouteShellPalette.border,
    );
    expect(mobileCaptureControlStyles.input.borderColor).toBe(
      mobileRouteShellPalette.borderStrong,
    );
    expect(mobileCaptureControlStyles.primaryButton.backgroundColor).toBe(
      mobileRouteShellPalette.rail,
    );
    expect(mobileCaptureControlStyles.secondaryButton.borderColor).toBe(
      mobileRouteShellPalette.borderStrong,
    );
    expect(mobileCaptureControlStyles.successText.color).toBe(
      mobileRouteShellPalette.signalSynced,
    );
  });
});
