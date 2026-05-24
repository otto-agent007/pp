import Link from "next/link";

const workflowLinks = [
  {
    detail: "Coordinate inspection dates, service notes, and field assignment.",
    href: "/jobs",
    label: "Review jobs",
    metric: "Schedule",
  },
  {
    detail: "Confirm buyer, seller, agent, and site contact readiness.",
    href: "/customers",
    label: "Open customers",
    metric: "Contacts",
  },
  {
    detail: "Review Branch 3 proof, findings, photos, signatures, and billing handoff.",
    href: "/closeouts",
    label: "Check closeouts",
    metric: "Proof",
  },
  {
    detail: "Track invoices, reconciliation, and manual payment follow-up.",
    href: "/payments",
    label: "Review payments",
    metric: "Billing",
  },
] as const;

export default function EscrowRePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Real estate handoff
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Escrow/RE</h1>
        </div>
        <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface px-4 py-3 text-sm font-bold text-theme-text-secondary shadow-sm">
          WDO, escrow, billing, and customer handoff
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workflowLinks.map((workflow) => (
          <article
            className="flex min-h-56 flex-col justify-between rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            key={workflow.href}
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-theme-text-muted">
                {workflow.metric}
              </p>
              <h2 className="mt-3 text-xl font-bold text-theme-text-primary">
                {workflow.label}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-theme-text-secondary">
                {workflow.detail}
              </p>
            </div>
            <Link
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-theme-action-primary px-4 text-sm font-bold text-theme-text-inverse transition hover:bg-theme-action-primaryStrong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2"
              href={workflow.href}
            >
              {workflow.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 md:grid-cols-3">
          {["Inspection", "Findings", "Invoice"].map((item) => (
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
                Ready for review
              </p>
            </article>
          ))}
        </div>

        <aside className="rounded-lg border border-status-alert-info-border bg-status-alert-info-bg p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-status-alert-info-fgStrong">
            Provider-free
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-status-alert-info-fg">
            Uses existing admin workflows only. No provider setup, schema
            changes, seed/reset writes, or payment configuration.
          </p>
        </aside>
      </section>
    </main>
  );
}
