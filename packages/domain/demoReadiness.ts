export interface DemoWorkflowStep {
  action: string;
  href: string;
  id: "closeout" | "customer" | "dispatch" | "follow-up" | "job";
  label: string;
  routeLabel: string;
  successSignal: string;
  summary: string;
}

export interface MobileTechnicianReadinessInput {
  assignedJobCount: number;
  profileId?: string | null;
}

export interface MobileTechnicianReadinessPanel {
  assignedJobsLabel: string;
  demoNextLabel: string;
  demoNextSummary: string;
  identityLabel: string;
  title: string;
}

const demoWorkflowSteps: DemoWorkflowStep[] = [
  {
    action: "Add the customer, primary contact, and first service address.",
    href: "/customers",
    id: "customer",
    label: "Create customer and location",
    routeLabel: "Customers",
    successSignal: "Customer appears active with at least one active location.",
    summary: "Add the property, contact, and first service location.",
  },
  {
    action:
      "Schedule work for the customer location and assign a technician when available.",
    href: "/jobs",
    id: "job",
    label: "Schedule a job",
    routeLabel: "Jobs",
    successSignal:
      "Scheduled job saves and keeps the selected customer/location pairing.",
    summary: "Connect the customer to an active location and start time.",
  },
  {
    action: "Confirm the scheduled job is visible in the dispatch board.",
    href: "/dispatch",
    id: "dispatch",
    label: "Review dispatch",
    routeLabel: "Dispatch",
    successSignal: "Dispatch shows the job in the expected schedule window.",
    summary: "Confirm the scheduled job appears on the operations board.",
  },
  {
    action: "Open the closeout queue after field work is completed.",
    href: "/closeouts",
    id: "closeout",
    label: "Review closeout",
    routeLabel: "Closeouts",
    successSignal: "Completed jobs can be reviewed with submitted field captures.",
    summary: "Check field captures after the technician completes work.",
  },
  {
    action:
      "Create billing or share portal access once the job is ready for follow-up.",
    href: "/payments",
    id: "follow-up",
    label: "Finish billing and portal follow-up",
    routeLabel: "Payments",
    successSignal:
      "Payments and portal paths load without exposing provider secrets.",
    summary: "Generate billing or share the customer portal when ready.",
  },
];

export function getDemoWorkflowSteps() {
  return demoWorkflowSteps;
}

export function buildMobileTechnicianReadinessPanel(
  input: MobileTechnicianReadinessInput,
): MobileTechnicianReadinessPanel {
  const assignedJobCount = Math.max(0, Math.floor(input.assignedJobCount));
  const jobNoun = assignedJobCount === 1 ? "job" : "jobs";
  const technicianLabel = input.profileId?.trim().slice(0, 15) || "technician";

  return {
    assignedJobsLabel: `${assignedJobCount} ${jobNoun} assigned today`,
    demoNextLabel: "Demo next",
    demoNextSummary:
      "Open the first assigned job, capture treatment notes, then explain queued sync.",
    identityLabel: `Signed in as ${technicianLabel}`,
    title: "Technician ready",
  };
}
