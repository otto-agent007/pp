import Link from "next/link";

import { adminWorkspaceClassName } from "../admin-workspace";

const workflowLinks = [
  {
    detail: "Schedule WDO inspections and keep field assignment moving.",
    href: "/jobs",
    label: "Review jobs",
  },
  {
    detail: "Confirm buyer, seller, agent, and site-contact records.",
    href: "/customers",
    label: "Open customers",
  },
  {
    detail: "Check Branch 3 proof, photos, signatures, and findings.",
    href: "/closeouts",
    label: "Check closeouts",
  },
  {
    detail: "Review invoice status and escrow payment follow-up.",
    href: "/payments",
    label: "Review payments",
  },
] as const;

export default function EscrowRePage() {
  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
            Real estate handoff
          </p>
          <h1 className="text-3xl font-bold text-theme-text-primary">Escrow/RE</h1>
        </div>
        <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface px-4 py-3 text-sm font-bold text-theme-text-secondary shadow-sm">
          WDO packets through existing workflows
        </div>
      </header>

      <section className="rounded-lg border border-dashed border-theme-border-subtle bg-theme-background-surface p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-muted">
            WDO / escrow view
          </p>
          <h2 className="mt-2 text-2xl font-bold text-theme-text-primary">
            Escrow packets are assembled from jobs, closeouts, customers, and
            payments.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-theme-text-secondary">
            Use this filtered workspace as the WDO handoff starting point while
            the dedicated escrow queue is still being shaped.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {workflowLinks.map((workflow) => (
            <Link
              className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-4 text-left transition hover:border-theme-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2"
              href={workflow.href}
              key={workflow.href}
            >
              <span className="text-sm font-bold text-theme-text-primary">
                {workflow.label}
              </span>
              <span className="mt-1 block text-sm leading-6 text-theme-text-secondary">
                {workflow.detail}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {["Inspection details", "Findings proof", "Invoice handoff"].map(
          (item) => (
            <article
              className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
              key={item}
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-theme-text-muted">
                Escrow packet
              </p>
              <p className="mt-3 text-lg font-bold text-theme-text-primary">
                {item}
              </p>
              <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                Continue in the linked workflow
              </p>
            </article>
          ),
        )}
      </section>

      <section className="rounded-lg border border-status-alert-info-border bg-status-alert-info-bg p-5 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-status-alert-info-fgStrong">
          Empty state
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-status-alert-info-fg">
          Dedicated WDO filtering will live here once escrow records have their
          own queue. For this demo, use the existing job, customer, closeout, and
          payment workspaces above.
        </p>
      </section>
    </main>
  );
}
