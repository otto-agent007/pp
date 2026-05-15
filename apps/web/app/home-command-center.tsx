"use client";

import {
  buildHomeCommandCenterState,
  type HomeCommandCenterSeverity,
} from "@pest-patrol/domain";
import Link from "next/link";

import { useCustomerPortalProviderStatus } from "../hooks/useCustomerPortalAccess";
import { useCustomers } from "../hooks/useCustomers";
import { useJobs } from "../hooks/useJobs";
import { useChemicalInventory } from "../hooks/useInventory";
import { useInvoices } from "../hooks/usePayments";
import { useTechnicians } from "../hooks/useTechnicians";
import { DemoSeedControls } from "./demo-seed-controls";

const severityClasses: Record<
  HomeCommandCenterSeverity,
  { bg: string; border: string; dot: string; text: string }
> = {
  good: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-[#16A34A]",
    text: "text-emerald-700",
  },
  neutral: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-[#071A3D]",
    text: "text-slate-700",
  },
  urgent: {
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-[#E11D2E]",
    text: "text-red-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-[#FACC15]",
    text: "text-amber-700",
  },
};

function serviceLabel(notes: string | null | undefined) {
  const trimmed = notes?.trim();

  return trimmed || "Service visit";
}

export function HomeCommandCenter() {
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const techniciansQuery = useTechnicians();
  const inventoryQuery = useChemicalInventory();
  const invoicesQuery = useInvoices();
  const portalProviderQuery = useCustomerPortalProviderStatus();

  const state = buildHomeCommandCenterState({
    customers: customersQuery.data?.map((customer) => ({
      status: customer.status,
    })),
    inventory: inventoryQuery.data?.map((item) => ({
      current_stock: item.current_stock,
      name: item.name,
      reorder_level: item.reorder_level,
    })),
    invoices: invoicesQuery.data?.map((invoice) => ({
      status: invoice.status,
      total_cents: invoice.total_cents,
    })),
    jobs: jobsQuery.data?.map((job) => ({
      customerName: job.customer?.name,
      id: job.id,
      scheduled_start: job.scheduled_start,
      serviceLabel: serviceLabel(job.service_notes),
      status: job.status,
    })),
    portalProviderStatus: portalProviderQuery.data,
    technicians: techniciansQuery.data?.map((technician) => ({
      status: technician.status,
    })),
  });

  const loading =
    customersQuery.isLoading ||
    jobsQuery.isLoading ||
    techniciansQuery.isLoading ||
    inventoryQuery.isLoading ||
    invoicesQuery.isLoading ||
    portalProviderQuery.isLoading;

  return (
    <main className="min-h-screen bg-[#F6F8FB] text-[#071A3D]">
      <section className="bg-[#071A3D] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-[#FACC15]">
                Pest Patrol OS
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Field command center
              </h1>
              <p className="mt-3 text-sm font-bold uppercase text-blue-100">
                Live operations snapshot
              </p>
              <p className="mt-1 max-w-2xl text-sm text-blue-100 sm:text-base">
                Dispatch, demo readiness, billing, and field workflow handoff.
              </p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-96">
              <Link
                className="rounded-md bg-[#0EA5E9] px-4 py-3 font-bold text-white transition hover:bg-sky-400"
                href={state.nextAction.href}
              >
                {state.nextAction.label}
              </Link>
              <Link
                className="rounded-md border border-white/20 px-4 py-3 font-bold text-white transition hover:bg-white/10"
                href="/dispatch"
              >
                Open dispatch
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.kpis.map((kpi) => {
              const severity = severityClasses[kpi.severity];

              return (
                <div
                  className={`rounded-md border bg-white p-4 text-[#071A3D] shadow-sm ${severity.border}`}
                  key={kpi.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {kpi.label}
                    </p>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full ${severity.dot}`}
                    />
                  </div>
                  <p className="mt-3 text-3xl font-bold">{kpi.value}</p>
                  <p className={`mt-1 text-sm font-semibold ${severity.text}`}>
                    {kpi.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.35fr_.9fr] lg:px-8">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-[#0EA5E9]">
                Live dispatch
              </p>
              <h2 className="mt-1 text-xl font-bold">Today&apos;s schedule</h2>
            </div>
            <p className="rounded-md bg-[#FACC15]/20 px-3 py-2 text-xs font-bold text-[#071A3D]">
              {loading ? "Refreshing live snapshot" : state.portalProviderLabel}
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {state.schedule.length > 0 ? (
              state.schedule.map((job) => {
                const severity = severityClasses[job.statusSeverity];

                return (
                  <Link
                    className="grid gap-3 py-3 transition hover:bg-slate-50 sm:grid-cols-[5rem_1fr_auto]"
                    href={job.href}
                    key={job.id}
                  >
                    <p className="text-sm font-bold">{job.timeLabel}</p>
                    <div>
                      <p className="font-bold">{job.serviceLabel}</p>
                      <p className="text-sm text-slate-600">{job.customerName}</p>
                    </div>
                    <span
                      className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${severity.bg} ${severity.text}`}
                    >
                      {job.statusLabel}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No jobs scheduled for today yet. Seed the demo story or create a
                job to populate the dispatch list.
              </div>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-[#0EA5E9]">
              Command brief
            </p>
            <h2 className="mt-1 text-xl font-bold">Next best action</h2>
            <p className="mt-2 text-sm text-slate-600">
              {state.nextAction.summary}
            </p>
            <div className="mt-4 grid gap-2">
              {state.alerts.map((alert) => {
                const severity = severityClasses[alert.severity];

                return (
                  <div
                    className={`rounded-md border p-3 ${severity.bg} ${severity.border}`}
                    key={alert.id}
                  >
                    <p className={`text-sm font-bold ${severity.text}`}>
                      {alert.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{alert.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <DemoSeedControls />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-[#E11D2E]">
                Demo readiness
              </p>
              <h2 className="mt-1 text-xl font-bold">Guided demo smoke</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Route links and evidence prompts are operator aids only. They do
              not store checklist state or require production customer data.
            </p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {state.smokeChecklist.map((item, index) => (
              <Link
                className="flex min-h-64 flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0EA5E9] hover:bg-white hover:shadow-sm"
                href={item.href}
                key={item.id}
              >
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#071A3D]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase text-[#0EA5E9]">
                    {item.routeLabel}
                  </p>
                </div>
                <div className="flex flex-1 flex-col justify-end gap-3 text-sm">
                  <p className="text-slate-700">{item.action}</p>
                  <p className="font-semibold text-slate-700">
                    Success: {item.successSignal}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {item.evidencePrompt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
