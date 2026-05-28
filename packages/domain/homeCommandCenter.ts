import type {
  CustomerPortalProviderStatus,
  CustomerStatus,
  InvoiceStatus,
  JobStatus,
  TechnicianStatus,
} from "@pest-patrol/types";

import { getDemoWorkflowSteps } from "./demoReadiness";
import {
  formatJobScheduleTime,
  getJobScheduleDateKey,
  getJobScheduleTime,
} from "./jobs";
import { getProviderReadinessCopy } from "./providerReadiness";

export type HomeCommandCenterSeverity =
  | "good"
  | "neutral"
  | "urgent"
  | "warning";

export type HomeCommandCenterKpiId =
  | "completed"
  | "open-invoices"
  | "technicians"
  | "todays-jobs";

export interface HomeCommandCenterKpi {
  detail: string;
  id: HomeCommandCenterKpiId;
  label: string;
  severity: HomeCommandCenterSeverity;
  value: string;
}

export interface HomeCommandCenterScheduleItem {
  customerName: string;
  href: string;
  id: string;
  serviceLabel: string;
  statusLabel: string;
  statusSeverity: HomeCommandCenterSeverity;
  timeLabel: string;
}

export interface HomeCommandCenterAlert {
  detail: string;
  id: "low-inventory" | "portal-provider" | "seed-demo";
  label: string;
  severity: HomeCommandCenterSeverity;
}

export interface HomeCommandCenterNextAction {
  href: string;
  label: string;
  summary: string;
}

export interface HomeSmokeChecklistItem {
  action: string;
  evidencePrompt: string;
  href: string;
  id: "closeout" | "customer" | "dispatch" | "follow-up" | "job";
  label: string;
  routeLabel: string;
  successSignal: string;
}

export type HomeLaunchReadinessId =
  | "compliance-setup"
  | "local-smoke"
  | "preview-smoke"
  | "provider-mode";

export interface HomeLaunchReadinessItem {
  action: string;
  command?: string;
  href: string;
  id: HomeLaunchReadinessId;
  label: string;
  severity: HomeCommandCenterSeverity;
  stateLabel: string;
  summary: string;
}

export interface HomeCommandCenterState {
  alerts: HomeCommandCenterAlert[];
  kpis: HomeCommandCenterKpi[];
  launchReadiness: HomeLaunchReadinessItem[];
  nextAction: HomeCommandCenterNextAction;
  portalProviderLabel: string;
  schedule: HomeCommandCenterScheduleItem[];
  smokeChecklist: HomeSmokeChecklistItem[];
}

export interface HomeCommandCenterInput {
  customers?: Array<{ status?: CustomerStatus | null }>;
  inventory?: Array<{
    current_stock: number;
    name: string;
    reorder_level?: number | null;
  }>;
  invoices?: Array<{ status: InvoiceStatus; total_cents: number }>;
  jobs?: Array<{
    customerName?: string | null;
    id: string;
    scheduled_start: string;
    serviceLabel?: string | null;
    status: JobStatus;
  }>;
  now?: Date;
  portalProviderStatus?: CustomerPortalProviderStatus | null;
  technicians?: Array<{ status?: TechnicianStatus | null }>;
}

const ACTIVE_JOB_STATUSES = new Set<JobStatus>([
  "scheduled",
  "en_route",
  "in_progress",
]);

const OPEN_INVOICE_STATUSES = new Set<InvoiceStatus>(["draft", "sent"]);

const STATUS_LABELS: Record<JobStatus, string> = {
  canceled: "Canceled",
  completed: "Completed",
  en_route: "En route",
  in_progress: "In progress",
  scheduled: "Scheduled",
};

const STATUS_SEVERITIES: Record<JobStatus, HomeCommandCenterSeverity> = {
  canceled: "urgent",
  completed: "good",
  en_route: "warning",
  in_progress: "warning",
  scheduled: "neutral",
};

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function buildSmokeChecklist(): HomeSmokeChecklistItem[] {
  return getDemoWorkflowSteps().map((step) => ({
    action: step.action,
    evidencePrompt:
      "Record the route, action taken, and visible success signal without adding provider secrets or production customer data.",
    href: step.href,
    id: step.id,
    label: step.label,
    routeLabel: step.routeLabel,
    successSignal: step.successSignal,
  }));
}

function buildPortalProviderLabel(
  status: CustomerPortalProviderStatus | null | undefined,
) {
  if (!status) {
    return "Portal provider checking";
  }

  return getProviderReadinessCopy("portal", status).label;
}

function buildLaunchReadiness(
  portalProviderStatus: CustomerPortalProviderStatus | null | undefined,
): HomeLaunchReadinessItem[] {
  const webhookReady =
    portalProviderStatus?.provider === "webhook" &&
    portalProviderStatus.webhook_configured &&
    portalProviderStatus.webhook_secret_configured;
  const providerCopy = getProviderReadinessCopy("portal", portalProviderStatus);

  return [
    {
      action:
        "Load the approved local Supabase values in the operator shell, then rerun the read-only preflight before seed/reset or browser smoke.",
      command: "corepack pnpm demo:smoke -- --target local",
      href: "/",
      id: "local-smoke",
      label: "Local smoke preflight",
      severity: "warning",
      stateLabel: "Blocked on approved local env",
      summary:
        "Seed/reset and Browser smoke stay gated until local preflight is ready.",
    },
    {
      action:
        "Use the latest Ready preview URL only after preview Supabase values, protected-preview access, and an admin/dispatcher sign-in path are approved.",
      command:
        "corepack pnpm demo:smoke -- --target preview --base-url <ready-preview-url>",
      href: "/dispatch",
      id: "preview-smoke",
      label: "Protected preview smoke",
      severity: "warning",
      stateLabel: "Blocked on operator access",
      summary:
        "Preview seed/reset and authenticated smoke stop at missing access.",
    },
    {
      action:
        "Run the no-write source preflight first; apply schema and ingest sources only against an approved local target.",
      command: "corepack pnpm compliance:ingest -- --dry-run --no-embed",
      href: "/compliance",
      id: "compliance-setup",
      label: "Compliance source setup",
      severity: "neutral",
      stateLabel: "Dry-run first",
      summary:
        "Source-backed advisories require explicit migration and ingestion approval.",
    },
    webhookReady
      ? {
          action: providerCopy.action,
          href: "/customers",
          id: "provider-mode",
          label: "Portal delivery mode",
          severity: "good",
          stateLabel: providerCopy.stateLabel,
          summary: providerCopy.summary,
        }
      : {
          action: providerCopy.action,
          href: "/customers",
          id: "provider-mode",
          label: "Portal delivery mode",
          severity: "good",
          stateLabel: providerCopy.stateLabel,
          summary: providerCopy.summary,
        },
  ];
}

export function buildHomeCommandCenterState(
  input: HomeCommandCenterInput = {},
): HomeCommandCenterState {
  const now = input.now ?? new Date();
  const today = dateKey(now);
  const jobs = input.jobs ?? [];
  const todaysJobs = jobs.filter(
    (job) => getJobScheduleDateKey(job.scheduled_start) === today,
  );
  const activeToday = todaysJobs.filter((job) =>
    ACTIVE_JOB_STATUSES.has(job.status),
  );
  const completedToday = todaysJobs.filter((job) => job.status === "completed");
  const technicians = input.technicians ?? [];
  const activeTechnicians = technicians.filter(
    (technician) => technician.status === "active",
  );
  const invoices = input.invoices ?? [];
  const openInvoices = invoices.filter((invoice) =>
    OPEN_INVOICE_STATUSES.has(invoice.status),
  );
  const openInvoiceTotal = openInvoices.reduce(
    (total, invoice) => total + invoice.total_cents,
    0,
  );
  const lowInventory = (input.inventory ?? []).find(
    (item) =>
      item.reorder_level !== null &&
      item.reorder_level !== undefined &&
      item.current_stock <= item.reorder_level,
  );

  const kpis: HomeCommandCenterKpi[] = [
    {
      detail:
        activeToday.length > 0
          ? `${activeToday.length} active today`
          : "No active jobs today",
      id: "todays-jobs",
      label: "Today's jobs",
      severity: activeToday.length > 0 ? "good" : "neutral",
      value: String(todaysJobs.length),
    },
    {
      detail:
        activeTechnicians.length > 0
          ? `${activeTechnicians.length} active`
          : "No active technicians",
      id: "technicians",
      label: "Technicians",
      severity: activeTechnicians.length > 0 ? "good" : "warning",
      value: String(technicians.length),
    },
    {
      detail: "Today",
      id: "completed",
      label: "Completed",
      severity: completedToday.length > 0 ? "good" : "neutral",
      value: String(completedToday.length),
    },
    {
      detail:
        openInvoices.length > 0
          ? plural(openInvoices.length, "unpaid")
          : "No unpaid invoices",
      id: "open-invoices",
      label: "Open invoices",
      severity: openInvoices.length > 0 ? "urgent" : "good",
      value: formatCurrency(openInvoiceTotal),
    },
  ];

  const schedule = todaysJobs
    .slice()
    .sort(
      (left, right) =>
        getJobScheduleTime(left.scheduled_start) -
        getJobScheduleTime(right.scheduled_start),
    )
    .slice(0, 5)
    .map<HomeCommandCenterScheduleItem>((job) => ({
      customerName: job.customerName?.trim() || "Unassigned customer",
      href: `/jobs/${job.id}`,
      id: job.id,
      serviceLabel: job.serviceLabel?.trim() || "Service visit",
      statusLabel: STATUS_LABELS[job.status],
      statusSeverity: STATUS_SEVERITIES[job.status],
      timeLabel: formatJobScheduleTime(job.scheduled_start),
    }));

  const alerts: HomeCommandCenterAlert[] = [];

  if (lowInventory) {
    alerts.push({
      detail: `${lowInventory.name} is at ${lowInventory.current_stock} with reorder at ${lowInventory.reorder_level}.`,
      id: "low-inventory",
      label: "Low inventory",
      severity: "warning",
    });
  }

  if (!input.portalProviderStatus) {
    alerts.push({
      detail:
        "Portal delivery status is still loading from the existing provider boundary.",
      id: "portal-provider",
      label: "Portal status",
      severity: "neutral",
    });
  }

  if (
    (input.customers ?? []).length === 0 &&
    jobs.length === 0 &&
    technicians.length === 0 &&
    invoices.length === 0
  ) {
    alerts.push({
      detail:
        "Run or reset the local demo story before presenting the workflow.",
      id: "seed-demo",
      label: "Seed demo story",
      severity: "neutral",
    });
  }

  let nextAction: HomeCommandCenterNextAction = {
    href: "/",
    label: "Seed demo story",
    summary: "Use local demo data controls before running the guided smoke.",
  };

  if (openInvoices.length > 0) {
    nextAction = {
      href: "/payments",
      label: `Review ${plural(openInvoices.length, "open invoice")}`,
      summary: "Send or reconcile open customer billing before handoff.",
    };
  } else if (lowInventory) {
    nextAction = {
      href: "/inventory",
      label: "Restock low inventory",
      summary:
        "Check reorder levels before sending technicians into the field.",
    };
  } else if (activeToday.length > 0) {
    nextAction = {
      href: "/dispatch",
      label: "Review active dispatch",
      summary: "Confirm routes and technician handoff before the next stop.",
    };
  } else if (schedule.length > 0) {
    nextAction = {
      href: "/closeouts",
      label: "Review completed work",
      summary: "Check closeouts and billing readiness for completed jobs.",
    };
  }

  return {
    alerts,
    kpis,
    launchReadiness: buildLaunchReadiness(input.portalProviderStatus),
    nextAction,
    portalProviderLabel: buildPortalProviderLabel(input.portalProviderStatus),
    schedule,
    smokeChecklist: buildSmokeChecklist(),
  };
}
