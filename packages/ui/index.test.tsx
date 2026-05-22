import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Avatar,
  Button,
  Card,
  CountTile,
  Eyebrow,
  SearchableSelect,
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
    expect(screen.getByText("Today's jobs").closest(".rounded-lg")).toHaveClass(
      "border-status-alert-danger-border",
      "bg-status-alert-danger-bg",
    );
    expect(screen.getByText("12")).toHaveClass("tabular-nums");
    expect(screen.getByText("2 need review")).toHaveClass(
      "text-status-alert-danger-fg",
    );
  });

  it("renders interactive count tiles with pressed, disabled, and tone states", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <CountTile
        active
        count={4}
        disabled
        label="Needs review"
        onClick={handleClick}
        tone="warning"
      />,
    );

    const tile = screen.getByRole("button", { name: /Needs review 4/i });

    expect(tile).toHaveAttribute("aria-pressed", "true");
    expect(tile).toBeDisabled();
    expect(tile).toHaveClass(
      "border-status-alert-warning-border",
      "bg-status-alert-warning-bg",
    );

    await user.click(tile);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders deterministic avatar initials without app-specific logic", () => {
    render(<Avatar name="Dana Reyes" />);

    expect(screen.getByText("DR")).toHaveAttribute("aria-label", "Dana Reyes");
    expect(screen.getByText("DR")).toHaveClass("bg-primitive-sky-600");
  });

  it("filters searchable select options by typed labels and keywords", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SearchableSelect
        ariaLabel="Route job"
        emptyMessage="No jobs found"
        label="Job"
        onChange={handleChange}
        options={[
          { label: "Select job", value: "" },
          {
            keywords: ["Rivera Cafe", "Harbor Drive"],
            label: "5/6/26, 9:00 AM - Rivera Cafe - 100 Harbor Dr",
            value: "job-1",
          },
          {
            keywords: ["Apex Homes", "Pine Street"],
            label: "5/6/26, 1:00 PM - Apex Homes - 10 Pine Street",
            value: "job-2",
          },
        ]}
        value=""
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Route job" }));
    await user.type(screen.getByRole("combobox", { name: "Route job" }), "pine");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith("job-2");
  });

  it("supports empty options, no-match copy, disabled options, and small sizing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SearchableSelect
        ariaLabel="Technician"
        emptyMessage="No technicians found"
        label="Technician"
        onChange={handleChange}
        options={[
          { label: "Unassigned", value: "" },
          { disabled: true, label: "Inactive Tech", value: "tech-inactive" },
          { label: "Testnician", value: "tech-1" },
        ]}
        size="sm"
        value=""
      />,
    );

    const input = screen.getByRole("combobox", { name: "Technician" });

    expect(input).toHaveClass("min-h-9", "text-xs");

    await user.click(input);
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Inactive Tech" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await user.clear(input);
    await user.type(input, "missing");
    expect(screen.getByText("No technicians found")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "test");
    await user.click(screen.getByRole("option", { name: "Testnician" }));

    expect(handleChange).toHaveBeenCalledWith("tech-1");
  });
});
