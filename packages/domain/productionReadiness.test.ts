import { describe, expect, it } from "vitest";

import { getProductionSmokeChecklist } from "./productionReadiness";

describe("production readiness domain", () => {
  it("returns the manual production smoke checklist in workflow order", () => {
    expect(getProductionSmokeChecklist()).toEqual([
      {
        id: "auth",
        label: "Admin sign-in",
        route: "/",
        success_criteria: "Admin can sign in and load the protected admin shell.",
      },
      {
        id: "customer-location",
        label: "Create customer and location",
        route: "/customers",
        success_criteria: "Active customer saves with at least one active location.",
      },
      {
        id: "job",
        label: "Create job",
        route: "/jobs",
        success_criteria: "Scheduled job saves against the new customer and location.",
      },
      {
        id: "portal",
        label: "Generate portal access",
        route: "/customers",
        success_criteria: "Portal link opens token-protected customer closeout data.",
      },
      {
        id: "scheduler",
        label: "Run scheduler",
        route: "/automation",
        success_criteria: "Manual scheduler run records a successful run history row.",
      },
      {
        id: "billing",
        label: "Check billing path",
        route: "/payments",
        success_criteria: "Invoice or payment setup state is visible without secret exposure.",
      },
    ]);
  });
});
