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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Demo data
        </p>
        <h3 className="text-base font-semibold text-neutralDark">
          Demo data
        </h3>
        <p className="text-sm text-gray-600">
          {status?.environment_label ?? "Checking demo seed status"}
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
        <span className="rounded-md bg-gray-50 px-3 py-2 font-semibold">
          {summary ? plural(summary.customers, "customer") : "Customers"}
        </span>
        <span className="rounded-md bg-gray-50 px-3 py-2 font-semibold">
          {summary ? plural(summary.jobs, "job") : "Jobs"}
        </span>
        <span className="rounded-md bg-gray-50 px-3 py-2 font-semibold">
          {summary ? plural(summary.technicians, "technician") : "Technicians"}
        </span>
      </div>

      {summary ? (
        <>
          <p className="mt-3 text-sm font-semibold text-neutralDark">
            Demo login: {DEMO_SEED_ADMIN_EMAIL} / {DEMO_SEED_ADMIN_PASSWORD}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Also includes {plural(summary.locations, "location")},{" "}
            {plural(summary.inventory_items, "inventory item")},{" "}
            {plural(summary.invoices, "invoice")}, and{" "}
            {plural(summary.payments, "payment")}.
          </p>
        </>
      ) : null}

      {statusQuery.isLoading ? (
        <p className="mt-3 text-sm text-gray-600">Checking availability...</p>
      ) : null}
      {status?.reason ? (
        <p className="mt-3 text-sm font-semibold text-amber-700">
          {status.reason}
        </p>
      ) : null}
      {statusQuery.error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {errorMessage(statusQuery.error)}
        </p>
      ) : null}
      {actionMutation.error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {errorMessage(actionMutation.error)}
        </p>
      ) : null}
      {lastAction ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">
          {lastAction === "seed" ? "Demo story seeded." : "Demo data reset."}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={!available}
          onClick={() => run("seed")}
          type="button"
        >
          {actionMutation.isPending ? "Working..." : "Seed demo story"}
        </button>
        <button
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-neutralDark disabled:cursor-not-allowed disabled:text-gray-400"
          disabled={!available}
          onClick={() => run("reset")}
          type="button"
        >
          Reset demo data
        </button>
        <button
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-neutralDark"
          onClick={() => void statusQuery.refetch()}
          type="button"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
