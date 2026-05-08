import { describe, expect, it } from "vitest";

import * as productionReadiness from "./productionReadiness";

describe("production readiness domain", () => {
  it("returns the manual production smoke checklist in workflow order", () => {
    expect(productionReadiness.getProductionSmokeChecklist()).toEqual([
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
        id: "technician",
        label: "Invite technician",
        route: "/technicians",
        success_criteria:
          "Technician invite sends and the technician appears by display name.",
      },
      {
        id: "job",
        label: "Create job",
        route: "/jobs",
        success_criteria: "Scheduled job saves against the new customer and location.",
      },
      {
        id: "mobile-captures",
        label: "Queue field captures",
        route: "Expo mobile app",
        success_criteria:
          "Technician queues status, geofence, form, chemical, photo, and signature captures offline-first.",
      },
      {
        id: "closeout-review",
        label: "Review closeout",
        route: "/closeouts",
        success_criteria:
          "Office can review synced field captures and see whether billing is ready.",
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

  it("returns the remaining dashboard-only readiness action", () => {
    const getRemainingProductionReadinessActions = (
      productionReadiness as typeof productionReadiness & {
        getRemainingProductionReadinessActions?: () => unknown;
      }
    ).getRemainingProductionReadinessActions;

    expect(getRemainingProductionReadinessActions).toBeTypeOf("function");
    expect(getRemainingProductionReadinessActions?.()).toEqual([
      {
        id: "leaked-password-protection",
        label: "Leaked password protection",
        location: "Supabase Auth dashboard",
        action: "Enable leaked password protection in Supabase Auth settings.",
      },
    ]);
  });
});
