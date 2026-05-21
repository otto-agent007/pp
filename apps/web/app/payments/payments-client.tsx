"use client";

import {
  buildBillingPortalNextActions,
  buildBillingQueue,
  buildInvoiceInputFromJob,
  filterInvoices,
  getBillingCloseoutHandoffSummary,
  getBillingQueueCounts,
  getInvoiceJobIds,
  getInvoiceReconciliation,
  getInvoiceReconciliationGuidance,
  getInvoiceReconciliationSummary,
  getInvoiceSummary,
  type InvoiceReconciliationStatus,
  type InvoiceStatusFilter,
} from "@pest-patrol/domain";
import type { Invoice, Job } from "@pest-patrol/types";
import {
  SearchableSelect,
  StatusPill,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
import { useJobs } from "../../hooks/useJobs";
import {
  useCreateInvoice,
  useCreateInvoicePaymentLink,
  useInvoices,
  useMarkInvoicePaid,
  useVoidInvoice,
} from "../../hooks/usePayments";

interface InvoiceFormState {
  amount: string;
  description: string;
  due_date: string;
  job_id: string;
  notes: string;
}

const emptyForm: InvoiceFormState = {
  amount: "",
  description: "Pest control service",
  due_date: "",
  job_id: "",
  notes: "",
};
const emptyInvoices: Invoice[] = [];
const emptyJobs: Job[] = [];
type ReconciliationFilter = InvoiceReconciliationStatus | "all";
type InvoiceActionConfirmation = {
  action: "mark_paid" | "void";
  invoiceId: string;
} | null;

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatPaymentDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function jobLabel(job: Job) {
  const customer = job.customer?.name ?? "Unknown customer";
  const address = job.location?.address ?? "No location";
  const scheduled = new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(job.scheduled_start));

  return `${scheduled} - ${customer} - ${address}`;
}

function invoiceTitle(invoice: Invoice) {
  return invoice.customer?.name ?? invoice.job?.customer?.name ?? "Unknown customer";
}

const reconciliationToneByStatus: Record<
  InvoiceReconciliationStatus,
  StatusPillTone
> = {
  awaiting_payment: "info",
  draft: "neutral",
  manual_paid: "warning",
  needs_review: "danger",
  partially_paid: "warning",
  reconciled_paid: "success",
  void: "neutral",
};

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
      {children}
    </p>
  );
}

function InvoiceHandoff({
  invoice,
  job,
}: {
  invoice: Invoice;
  job: Job | null;
}) {
  if (!job) {
    return null;
  }

  const actions = buildBillingPortalNextActions({
    hasPortalLink: false,
    invoice,
    job,
  }).filter((action) => action.id !== "review_payment");

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-status-alert-info-border bg-status-alert-info-bg p-3">
      <p className="text-sm font-semibold text-neutralDark">Customer handoff</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <a
            className="rounded-md bg-theme-background-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-primitive-sky-100"
            href={action.href}
            key={action.id}
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function PaymentsClient() {
  const searchParams = useSearchParams();
  const jobsQuery = useJobs();
  const invoicesQuery = useInvoices();
  const createInvoice = useCreateInvoice();
  const createPaymentLink = useCreateInvoicePaymentLink();
  const markPaid = useMarkInvoicePaid();
  const voidInvoice = useVoidInvoice();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatusFilter>("all");
  const [reconciliationStatus, setReconciliationStatus] =
    useState<ReconciliationFilter>("all");
  const [form, setForm] = useState<InvoiceFormState>(() => ({
    ...emptyForm,
    job_id: searchParams.get("job_id") ?? "",
  }));
  const [closeoutHandoffJobId, setCloseoutHandoffJobId] = useState(
    () => searchParams.get("job_id") ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [actionConfirmation, setActionConfirmation] =
    useState<InvoiceActionConfirmation>(null);
  const highlightedInvoiceId = searchParams.get("invoice_id") ?? "";
  const invoices = invoicesQuery.data ?? emptyInvoices;
  const jobs = jobsQuery.data ?? emptyJobs;
  const completedJobIds = useMemo(
    () =>
      jobs
        .filter((job) => job.status === "completed")
        .map((job) => job.id),
    [jobs],
  );
  const summariesQuery = useCloseoutCaptureSummaries(completedJobIds);
  const billingQueue = useMemo(
    () =>
      buildBillingQueue(
        jobs,
        invoices,
        summariesQuery.data ?? [],
      ),
    [invoices, jobs, summariesQuery.data],
  );
  const billingQueueCounts = useMemo(
    () => getBillingQueueCounts(billingQueue),
    [billingQueue],
  );
  const invoicedJobIds = useMemo(() => getInvoiceJobIds(invoices), [invoices]);
  const completedJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.status === "completed" && !invoicedJobIds.has(job.id),
      ),
    [jobs, invoicedJobIds],
  );
  const completedJobOptions = useMemo(
    () => [
      { label: "Select job", value: "" },
      ...completedJobs.map((job) => ({
        keywords: [
          job.customer?.name,
          job.location?.address,
          job.location?.nickname,
          job.service_notes,
        ].filter((value): value is string => Boolean(value)),
        label: jobLabel(job),
        value: job.id,
      })),
    ],
    [completedJobs],
  );
  const visibleInvoices = useMemo(
    () => {
      const filtered = filterInvoices(invoices, search, status).filter(
        (invoice) =>
          reconciliationStatus === "all" ||
          getInvoiceReconciliation(invoice).status === reconciliationStatus,
      );

      if (!highlightedInvoiceId) {
        return filtered;
      }

      return [...filtered].sort((left, right) => {
        if (left.id === highlightedInvoiceId) {
          return -1;
        }

        if (right.id === highlightedInvoiceId) {
          return 1;
        }

        return 0;
      });
    },
    [highlightedInvoiceId, invoices, reconciliationStatus, search, status],
  );
  const summary = useMemo(() => getInvoiceSummary(invoices), [invoices]);
  const reconciliationSummary = useMemo(
    () => getInvoiceReconciliationSummary(invoices),
    [invoices],
  );
  const closeoutHandoff = useMemo(
    () =>
      getBillingCloseoutHandoffSummary({
        needsCaptures: billingQueueCounts.needsCaptures,
        needsReview: reconciliationSummary.needsReviewCount,
        readyToBill: billingQueueCounts.ready,
      }),
    [
      billingQueueCounts.needsCaptures,
      billingQueueCounts.ready,
      reconciliationSummary.needsReviewCount,
    ],
  );
  const selectedJob =
    completedJobs.find((job) => job.id === form.job_id) ?? completedJobs[0] ?? null;
  const closeoutHandoffJob =
    closeoutHandoffJobId && form.job_id === closeoutHandoffJobId
      ? jobs.find((job) => job.id === closeoutHandoffJobId) ?? null
      : null;

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      if (!selectedJob) {
        throw new Error("Completed job is required");
      }

      const amountCents = Math.round(Number(form.amount) * 100);
      const input = buildInvoiceInputFromJob(
        selectedJob,
        amountCents,
        form.description,
      );

      await createInvoice.mutateAsync({
        ...input,
        due_date: form.due_date || null,
        notes: form.notes || selectedJob.service_notes,
      });
      setForm(emptyForm);
      setCloseoutHandoffJobId("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create invoice",
      );
    }
  }

  function confirmInvoiceAction(invoiceId: string, action: "mark_paid" | "void") {
    setActionConfirmation(null);

    if (action === "mark_paid") {
      markPaid.mutate(invoiceId);
      return;
    }

    voidInvoice.mutate(invoiceId);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Payments</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            aria-label="Search invoices"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoices"
            value={search}
          />
          <select
            aria-label="Invoice status"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) =>
              setStatus(event.target.value as InvoiceStatusFilter)
            }
            value={status}
          >
            <option value="all">All invoices</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
          <select
            aria-label="Reconciliation status"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) =>
              setReconciliationStatus(event.target.value as ReconciliationFilter)
            }
            value={reconciliationStatus}
          >
            <option value="all">All reconciliation</option>
            <option value="needs_review">Needs review</option>
            <option value="partially_paid">Partially paid</option>
            <option value="reconciled_paid">Reconciled paid</option>
            <option value="manual_paid">Manually marked paid</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
          </select>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-md border border-theme-border-subtle bg-theme-background-surface px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-neutralDark">{closeoutHandoff.label}</p>
          <p className="mt-1 text-theme-text-secondary">
            {closeoutHandoff.summary}
          </p>
          <p className="mt-1 text-xs font-semibold text-theme-text-muted">
            {closeoutHandoff.nextStep}
          </p>
          <p className="mt-1 text-xs font-medium text-theme-text-muted">
            Use closeouts to confirm proof handoff, GPS evidence, and customer-safe
            portal readiness before invoicing.
          </p>
        </div>
        <a className="font-semibold text-primary hover:underline" href="/closeouts">
          View queue
        </a>
      </section>

      <section className="rounded-lg border border-status-alert-warning-border bg-status-alert-warning-bg p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Setup
        </p>
        <h2 className="mt-1 text-xl font-semibold text-neutralDark">
          Stripe test-mode readiness
        </h2>
        <p className="mt-2 text-sm text-theme-text-secondary">
          Payment links need server-only STRIPE_SECRET_KEY. Stripe webhooks need
          STRIPE_WEBHOOK_SECRET.
        </p>
        <p className="mt-2 text-sm text-theme-text-secondary">
          Stripe can stay unset for customer, job, closeout, and portal demos.
        </p>
        <p className="mt-2 text-sm text-theme-text-secondary">
          Invoices and manual paid status still work for non-payment demos
          without Stripe.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Draft
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.draftCount}
          </p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Sent
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.sentCount}
          </p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Open
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {formatMoney(summary.openCents)}
          </p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Paid
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">
            {formatMoney(summary.paidCents)}
          </p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Needs review
          </p>
          <p className="mt-2 text-2xl font-bold text-status-alert-danger-fg">
            {reconciliationSummary.needsReviewCount}
          </p>
          <p className="mt-1 text-xs font-medium text-theme-text-muted">
            {reconciliationSummary.needsReviewCount === 1
              ? "1 invoice"
              : `${reconciliationSummary.needsReviewCount} invoices`}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {invoicesQuery.isLoading ? (
            <EmptyState>Loading invoices</EmptyState>
          ) : visibleInvoices.length === 0 ? (
            <EmptyState>No invoices found</EmptyState>
          ) : (
            visibleInvoices.map((invoice) => {
              const reconciliation = getInvoiceReconciliation(invoice);
              const guidance = getInvoiceReconciliationGuidance(invoice);
              const latestPaidAt = formatPaymentDate(reconciliation.latestPaidAt);
              const invoiceJob =
                invoice.job ?? jobs.find((job) => job.id === invoice.job_id) ?? null;
              const confirmingAction =
                actionConfirmation?.invoiceId === invoice.id
                  ? actionConfirmation.action
                  : null;
              const confirmationContext = `${invoiceTitle(invoice)} · invoice ${
                invoice.id
              } · ${formatMoney(invoice.total_cents, invoice.currency)}`;

              return (
                <article
                  className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
                  key={invoice.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-neutralDark">
                          {invoiceTitle(invoice)}
                        </h2>
                        <span className="rounded-md bg-primitive-slate-100 px-2 py-1 text-xs font-semibold uppercase text-theme-text-secondary">
                          {invoice.status}
                        </span>
                        <StatusPill tone={reconciliationToneByStatus[reconciliation.status]}>
                          {reconciliation.label}
                        </StatusPill>
                      </div>
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {invoice.job?.location?.address ?? "No location"}
                      </p>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        Due {formatDate(invoice.due_date)}
                      </p>
                      {reconciliation.reviewLabel ? (
                        <p className="mt-2 text-sm font-semibold text-status-alert-danger-fg">
                          {reconciliation.reviewLabel}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {guidance.summary}
                      </p>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {guidance.nextStep}
                      </p>
                      {latestPaidAt ? (
                        <p className="mt-2 text-sm text-theme-text-secondary">
                          Latest payment {latestPaidAt}
                        </p>
                      ) : null}
                      {invoice.notes ? (
                        <p className="mt-2 text-sm text-theme-text-secondary">{invoice.notes}</p>
                      ) : null}
                      {invoice.payment_url ? (
                        <a
                          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                          href={invoice.payment_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open payment link
                        </a>
                      ) : null}
                      <InvoiceHandoff invoice={invoice} job={invoiceJob} />
                    </div>
                    <div className="flex min-w-52 flex-col gap-3">
                      <p className="text-right text-2xl font-bold text-neutralDark">
                        {formatMoney(invoice.total_cents, invoice.currency)}
                      </p>
                      <div className="text-right text-xs font-medium text-theme-text-muted">
                        <p>
                          Paid{" "}
                          {formatMoney(
                            reconciliation.paidCents,
                            invoice.currency,
                          )}
                        </p>
                        <p>
                          Balance{" "}
                          {formatMoney(
                            reconciliation.balanceCents,
                            invoice.currency,
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {invoice.status === "draft" ? (
                          <button
                            className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-theme-text-inverse hover:bg-primary/90 disabled:opacity-60"
                            disabled={createPaymentLink.isPending}
                            onClick={() => createPaymentLink.mutate(invoice)}
                            type="button"
                          >
                            Create link
                          </button>
                        ) : null}
                        {invoice.status !== "paid" && invoice.status !== "void" ? (
                          <button
                            className="min-h-10 rounded-md border border-status-alert-success-border px-3 text-sm font-semibold text-status-alert-success-fg hover:bg-status-alert-success-bg"
                            disabled={markPaid.isPending}
                            onClick={() =>
                              setActionConfirmation({
                                action: "mark_paid",
                                invoiceId: invoice.id,
                              })
                            }
                            type="button"
                          >
                            Mark paid
                          </button>
                        ) : null}
                        {invoice.status !== "void" && invoice.status !== "paid" ? (
                          <button
                            className="min-h-10 rounded-md border border-status-alert-danger-border px-3 text-sm font-semibold text-status-alert-danger-fg hover:bg-status-alert-danger-bg"
                            disabled={voidInvoice.isPending}
                            onClick={() =>
                              setActionConfirmation({
                                action: "void",
                                invoiceId: invoice.id,
                              })
                            }
                            type="button"
                          >
                            Void
                          </button>
                        ) : null}
                      </div>
                      {confirmingAction ? (
                        <div
                          aria-label={
                            confirmingAction === "mark_paid"
                              ? `Confirm mark paid for ${invoiceTitle(invoice)}`
                              : `Confirm void for ${invoiceTitle(invoice)}`
                          }
                          className="rounded-md border border-status-alert-warning-border bg-status-alert-warning-bg px-3 py-2 text-left"
                          role="group"
                        >
                          <p className="text-sm font-semibold text-neutralDark">
                            {confirmingAction === "mark_paid"
                              ? "Mark this invoice paid?"
                              : "Void this invoice?"}
                          </p>
                          <p className="mt-1 text-xs text-theme-text-secondary">
                            {confirmationContext}
                          </p>
                          <p className="mt-2 text-xs text-theme-text-secondary">
                            {confirmingAction === "mark_paid"
                              ? guidance.markPaidConfirmation
                              : guidance.voidConfirmation}
                          </p>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button
                              aria-label={
                                confirmingAction === "mark_paid"
                                  ? "Cancel mark paid"
                                  : "Cancel void"
                              }
                              className="min-h-8 rounded-md border border-theme-border-default px-3 text-xs font-semibold text-neutralDark hover:bg-theme-background-subtle"
                              onClick={() => setActionConfirmation(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              className={
                                confirmingAction === "mark_paid"
                                  ? "min-h-8 rounded-md bg-status-alert-success-solid px-3 text-xs font-semibold text-theme-text-inverse hover:bg-status-alert-success-fg disabled:opacity-60"
                                  : "min-h-8 rounded-md bg-status-alert-danger-solid px-3 text-xs font-semibold text-theme-text-inverse hover:bg-primitive-red-600 disabled:opacity-60"
                              }
                              disabled={
                                confirmingAction === "mark_paid"
                                  ? markPaid.isPending
                                  : voidInvoice.isPending
                              }
                              onClick={() =>
                                confirmInvoiceAction(invoice.id, confirmingAction)
                              }
                              type="button"
                            >
                              {confirmingAction === "mark_paid"
                                ? "Confirm mark paid"
                                : "Confirm void"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
          onSubmit={submitInvoice}
        >
          <h2 className="text-xl font-semibold text-neutralDark">Create invoice</h2>
          {closeoutHandoffJob ? (
            <p className="rounded-md border border-status-alert-info-border bg-status-alert-info-bg p-3 text-sm text-status-alert-info-fg">
              From closeout: {closeoutHandoffJob.customer?.name ?? "Unknown customer"} @{" "}
              {closeoutHandoffJob.location?.address ?? "No location"}
            </p>
          ) : null}
          {formError ? (
            <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
              {formError}
            </p>
          ) : null}

          <SearchableSelect
            ariaLabel="Completed job"
            emptyMessage="No completed jobs found"
            label="Completed job"
            onChange={(jobId) => {
              setCloseoutHandoffJobId("");
              setForm((current) => ({ ...current, job_id: jobId }));
            }}
            options={completedJobOptions}
            value={form.job_id || selectedJob?.id || ""}
          />
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Amount
            <input
              aria-label="Invoice amount"
              className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
              min="0"
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              step="0.01"
              type="number"
              value={form.amount}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Description
            <input
              aria-label="Line item description"
              className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={form.description}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Due date
            <input
              aria-label="Due date"
              className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
              onChange={(event) =>
                setForm((current) => ({ ...current, due_date: event.target.value }))
              }
              type="date"
              value={form.due_date}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Notes
            <textarea
              aria-label="Invoice notes"
              className="min-h-24 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              value={form.notes}
            />
          </label>
          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-theme-text-inverse hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createInvoice.isPending}
            type="submit"
          >
            Save invoice
          </button>
        </form>
      </section>
    </main>
  );
}
