"use client";

import {
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_ADMIN_PASSWORD,
  DEMO_SEED_CONFIRMATION,
} from "@pest-patrol/domain";

import {
  useDemoSeedStatus,
  useRunDemoSeedAction,
} from "../hooks/useDemoSeed";

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Demo data action failed";
}

export function DemoSeedControls() {
  const statusQuery = useDemoSeedStatus();
  const actionMutation = useRunDemoSeedAction();
  const status = statusQuery.data?.status;
  const summary = statusQuery.data?.summary;
  const available = Boolean(status?.available) && !actionMutation.isPending;
  const target = status?.target ?? "local";
  const lastAction = actionMutation.data?.action;

  function run(action: "seed" | "reset") {
    actionMutation.mutate({
      action,
      confirm: DEMO_SEED_CONFIRMATION,
      target,
    });
  }

  return (
    <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
          Demo data
        </p>
        <h3 className="text-base font-semibold text-neutralDark">
          Demo data
        </h3>
        <p className="text-sm text-theme-text-secondary">
          {status?.environment_label ?? "Checking demo seed status"}
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-theme-text-secondary sm:grid-cols-3">
        <span className="rounded-md bg-theme-background-subtle px-3 py-2 font-semibold">
          {summary ? plural(summary.customers, "customer") : "Customers"}
        </span>
        <span className="rounded-md bg-theme-background-subtle px-3 py-2 font-semibold">
          {summary ? plural(summary.jobs, "job") : "Jobs"}
        </span>
        <span className="rounded-md bg-theme-background-subtle px-3 py-2 font-semibold">
          {summary ? plural(summary.technicians, "technician") : "Technicians"}
        </span>
      </div>

      {summary ? (
        <>
          <p className="mt-3 text-sm font-semibold text-neutralDark">
            Demo login: {DEMO_SEED_ADMIN_EMAIL} / {DEMO_SEED_ADMIN_PASSWORD}
          </p>
          <p className="mt-2 text-sm text-theme-text-secondary">
            Also includes {plural(summary.locations, "location")},{" "}
            {plural(summary.inventory_items, "inventory item")},{" "}
            {plural(summary.invoices, "invoice")}, and{" "}
            {plural(summary.payments, "payment")}.
          </p>
        </>
      ) : null}

      {statusQuery.isLoading ? (
        <p className="mt-3 text-sm text-theme-text-secondary">Checking availability...</p>
      ) : null}
      {status?.reason ? (
        <p className="mt-3 text-sm font-semibold text-status-alert-warning-fg">
          {status.reason}
        </p>
      ) : null}
      {statusQuery.error ? (
        <p className="mt-3 text-sm font-semibold text-status-alert-danger-fg">
          {errorMessage(statusQuery.error)}
        </p>
      ) : null}
      {actionMutation.error ? (
        <p className="mt-3 text-sm font-semibold text-status-alert-danger-fg">
          {errorMessage(actionMutation.error)}
        </p>
      ) : null}
      {lastAction ? (
        <p className="mt-3 text-sm font-semibold text-status-alert-success-fg">
          {lastAction === "seed" ? "Demo story seeded." : "Demo data reset."}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-theme-text-inverse disabled:cursor-not-allowed disabled:bg-theme-border-default"
          disabled={!available}
          onClick={() => run("seed")}
          type="button"
        >
          {actionMutation.isPending ? "Working..." : "Seed demo story"}
        </button>
        <button
          className="rounded-md border border-theme-border-default px-4 py-2 text-sm font-semibold text-neutralDark disabled:cursor-not-allowed disabled:text-theme-text-muted/70"
          disabled={!available}
          onClick={() => run("reset")}
          type="button"
        >
          Reset demo data
        </button>
        <button
          className="rounded-md border border-theme-border-default px-4 py-2 text-sm font-semibold text-neutralDark"
          onClick={() => void statusQuery.refetch()}
          type="button"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
