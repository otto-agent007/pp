export interface ProductionSmokeChecklistItem {
  id:
    | "auth"
    | "billing"
    | "closeout-review"
    | "customer-location"
    | "job"
    | "mobile-captures"
    | "portal"
    | "scheduler"
    | "technician";
  label: string;
  route: string;
  success_criteria: string;
}

export interface RemainingProductionReadinessAction {
  id: "leaked-password-protection";
  label: string;
  location: string;
  action: string;
}

const productionSmokeChecklist: ProductionSmokeChecklistItem[] = [
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
];

const remainingProductionReadinessActions: RemainingProductionReadinessAction[] = [
  {
    id: "leaked-password-protection",
    label: "Leaked password protection",
    location: "Supabase Auth dashboard",
    action: "Enable leaked password protection in Supabase Auth settings.",
  },
];

export function getProductionSmokeChecklist() {
  return productionSmokeChecklist;
}

export function getRemainingProductionReadinessActions() {
  return remainingProductionReadinessActions;
}
