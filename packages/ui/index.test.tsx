import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
} from "./index";

describe("@pest-patrol/ui", () => {
  it("renders token-backed button variants and exposes link classes", () => {
    render(
      <Button
        disabled
        trailingIcon={<span aria-hidden="true">+</span>}
        variant="danger"
      >
        Escalate
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Escalate" });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-theme-action-danger", "text-theme-text-inverse");
    expect(buttonClassName({ variant: "ghost", size: "sm" })).toContain(
      "border-theme-border-default",
    );
    expect(buttonClassName({ variant: "inverse" })).toContain(
      "text-theme-text-inverse",
    );
  });

  it("renders cards and eyebrows with semantic token classes", () => {
    render(
      <Card>
        <Eyebrow tone="accent">Dispatch</Eyebrow>
        <p>Today</p>
      </Card>,
    );

    expect(screen.getByText("Today").parentElement).toHaveClass(
      "bg-theme-background-surface",
      "border-theme-border-subtle",
    );
    expect(screen.getByText("Dispatch")).toHaveClass("text-primitive-sky-500");
  });

  it("renders status pills with visible text and optional dots", () => {
    render(
      <div>
        <StatusPill tone="warning">Queued</StatusPill>
        <StatusPill dot={false} tone="success">
          Synced
        </StatusPill>
      </div>,
    );

    expect(screen.getByText("Queued")).toHaveClass(
      "bg-status-alert-warning-bg",
      "text-status-alert-warning-fg",
    );
    expect(screen.getByText("Synced").querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("renders stat tiles with tabular values and tone-aware detail", () => {
    render(
      <StatTile
        detail="2 need review"
        label="Today's jobs"
        tone="danger"
        value="12"
      />,
    );

    expect(screen.getByText("Today's jobs")).toHaveClass("uppercase");
    expect(screen.getByText("12")).toHaveClass("tabular-nums");
    expect(screen.getByText("2 need review")).toHaveClass(
      "text-status-alert-danger-fg",
    );
  });

  it("renders deterministic avatar initials without app-specific logic", () => {
    render(<Avatar name="Dana Reyes" />);

    expect(screen.getByText("DR")).toHaveAttribute("aria-label", "Dana Reyes");
    expect(screen.getByText("DR")).toHaveClass("bg-primitive-sky-600");
  });
});
