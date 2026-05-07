import { describe, expect, it } from "vitest";

import { getDemoWorkflowSteps } from "./demoReadiness";

describe("demo readiness domain", () => {
  it("returns the ordered customer-to-closeout demo workflow", () => {
    expect(getDemoWorkflowSteps()).toEqual([
      {
        href: "/customers",
        id: "customer",
        label: "Create customer and location",
        summary: "Add the property, contact, and first service location.",
      },
      {
        href: "/jobs",
        id: "job",
        label: "Schedule a job",
        summary: "Connect the customer to an active location and start time.",
      },
      {
        href: "/dispatch",
        id: "dispatch",
        label: "Review dispatch",
        summary: "Confirm the scheduled job appears on the operations board.",
      },
      {
        href: "/closeouts",
        id: "closeout",
        label: "Review closeout",
        summary: "Check field captures after the technician completes work.",
      },
      {
        href: "/payments",
        id: "follow-up",
        label: "Finish billing and portal follow-up",
        summary: "Generate billing or share the customer portal when ready.",
      },
    ]);
  });
});
