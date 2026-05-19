"use client";

import {
  buildHomeCommandCenterState,
  type HomeCommandCenterSeverity,
} from "@pest-patrol/domain";
import {
  Card,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import Link from "next/link";

import { useCustomerPortalProviderStatus } from "../hooks/useCustomerPortalAccess";
import { useCustomers } from "../hooks/useCustomers";
import { useJobs } from "../hooks/useJobs";
import { useChemicalInventory } from "../hooks/useInventory";
import { useInvoices } from "../hooks/usePayments";
import { useTechnicians } from "../hooks/useTechnicians";
import { DemoSeedControls } from "./demo-seed-controls";

const severityTones: Record<HomeCommandCenterSeverity, StatusPillTone> = {
  good: "success",
  neutral: "neutral",
  urgent: "danger",
  warning: "warning",
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
    <main className="min-h-screen bg-theme-background-canvas text-theme-text-primary">
      <section className="bg-theme-background-inverse text-theme-text-inverse">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Eyebrow tone="inverse">Pest Patrol OS</Eyebrow>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Field command center
              </h1>
              <p className="mt-3 text-sm font-bold uppercase text-primitive-sky-100">
                Live operations snapshot
              </p>
              <p className="mt-1 max-w-2xl text-sm text-primitive-sky-100 sm:text-base">
                Dispatch, demo readiness, billing, and field workflow handoff.
              </p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-96">
              <Link
                className={buttonClassName({ fullWidth: true, size: "lg" })}
                href={state.nextAction.href}
              >
                {state.nextAction.label}
              </Link>
              <Link
                className={buttonClassName({
                  fullWidth: true,
                  size: "lg",
                  variant: "inverse",
                })}
                href="/dispatch"
              >
                Open dispatch
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.kpis.map((kpi) => (
              <StatTile
                detail={kpi.detail}
                key={kpi.id}
                label={kpi.label}
                tone={severityTones[kpi.severity]}
                value={kpi.value}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.35fr_.9fr] lg:px-8">
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Eyebrow tone="accent">Live dispatch</Eyebrow>
              <h2 className="mt-1 text-xl font-bold">Today&apos;s schedule</h2>
            </div>
            <StatusPill tone="warning">
              {loading ? "Refreshing live snapshot" : state.portalProviderLabel}
            </StatusPill>
          </div>

          <div className="mt-4 divide-y divide-primitive-slate-100">
            {state.schedule.length > 0 ? (
              state.schedule.map((job) => {
                return (
                  <Link
                    className="grid gap-3 py-3 transition hover:bg-theme-background-subtle sm:grid-cols-[5rem_1fr_auto]"
                    href={job.href}
                    key={job.id}
                  >
                    <p className="text-sm font-bold">{job.timeLabel}</p>
                    <div>
                      <p className="font-bold">{job.serviceLabel}</p>
                      <p className="text-sm text-theme-text-secondary">{job.customerName}</p>
                    </div>
                    <StatusPill tone={severityTones[job.statusSeverity]}>
                      {job.statusLabel}
                    </StatusPill>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
                No jobs scheduled for today yet. Seed the demo story or create a
                job to populate the dispatch list.
              </div>
            )}
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <Eyebrow tone="accent">Command brief</Eyebrow>
            <h2 className="mt-1 text-xl font-bold">Next best action</h2>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {state.nextAction.summary}
            </p>
            <div className="mt-4 grid gap-2">
              {state.alerts.map((alert) => {
                const tone = severityTones[alert.severity];

                return (
                  <div
                    className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
                    key={alert.id}
                  >
                    <StatusPill tone={tone}>{alert.label}</StatusPill>
                    <p className="mt-1 text-sm text-theme-text-secondary">{alert.detail}</p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <Eyebrow tone="danger">Launch gates</Eyebrow>
            <h2 className="mt-1 text-xl font-bold">Smoke readiness</h2>
            <div className="mt-4 divide-y divide-primitive-slate-100">
              {state.launchReadiness.map((item) => {
                return (
                  <Link
                    className="block py-3 transition hover:bg-theme-background-subtle"
                    href={item.href}
                    key={item.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-primitive-navy-950">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-theme-text-secondary">
                          {item.summary}
                        </p>
                      </div>
                      <StatusPill tone={severityTones[item.severity]}>
                        {item.stateLabel}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-theme-text-muted">
                      {item.action}
                    </p>
                    {item.command ? (
                      <p className="mt-2 rounded-md bg-primitive-slate-100 px-2 py-1 font-mono text-xs text-theme-text-secondary">
                        {item.command}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </Card>
          <DemoSeedControls />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow tone="danger">Demo readiness</Eyebrow>
              <h2 className="mt-1 text-xl font-bold">Guided demo smoke</h2>
            </div>
            <p className="max-w-xl text-sm text-theme-text-secondary">
              Route links and evidence prompts are operator aids only. They do
              not store checklist state or require production customer data.
            </p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {state.smokeChecklist.map((item, index) => (
              <Link
                className="flex min-h-64 flex-col gap-4 rounded-md border border-theme-border-subtle bg-theme-background-subtle p-4 transition hover:border-primitive-sky-500 hover:bg-theme-background-surface hover:shadow-sm"
                href={item.href}
                key={item.id}
              >
                <div>
                  <p className="text-xs font-bold uppercase text-theme-text-muted">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-bold text-primitive-navy-950">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase text-primitive-sky-500">
                    {item.routeLabel}
                  </p>
                </div>
                <div className="flex flex-1 flex-col justify-end gap-3 text-sm">
                  <p className="text-theme-text-secondary">{item.action}</p>
                  <p className="font-semibold text-theme-text-secondary">
                    Success: {item.successSignal}
                  </p>
                  <p className="text-xs font-semibold text-theme-text-muted">
                    {item.evidencePrompt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
