"use client";

import {
  buildBillingPortalNextActions,
  buildBillingQueue,
  buildInvoiceInputFromJob,
  filterInvoices,
  getBillingQueueCounts,
  getInvoiceJobIds,
  getInvoiceReconciliation,
  getInvoiceReconciliationSummary,
  getInvoiceSummary,
  type InvoiceReconciliationStatus,
  type InvoiceStatusFilter,
} from "@pest-patrol/domain";
import type { Invoice, Job } from "@pest-patrol/types";
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

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
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
    <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3">
      <p className="text-sm font-semibold text-neutralDark">Customer handoff</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <a
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-blue-100"
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
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoices"
            value={search}
          />
          <select
            aria-label="Invoice status"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
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
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
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

      <section className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-neutralDark">From closeouts</p>
          <p className="mt-1 text-gray-600">
            {billingQueueCounts.ready} ready to bill ·{" "}
            {billingQueueCounts.needsCaptures} need captures
          </p>
        </div>
        <a className="font-semibold text-primary hover:underline" href="/closeouts">
          View queue
        </a>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Setup
        </p>
        <h2 className="mt-1 text-xl font-semibold text-neutralDark">
          Stripe test-mode readiness
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          Payment links need server-only STRIPE_SECRET_KEY. Stripe webhooks need
          STRIPE_WEBHOOK_SECRET.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Stripe can stay unset for customer, job, closeout, and portal demos.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Invoices and manual paid status still work for non-payment demos
          without Stripe.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Draft
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.draftCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sent
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.sentCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Open
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {formatMoney(summary.openCents)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Paid
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">
            {formatMoney(summary.paidCents)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Needs review
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {reconciliationSummary.needsReviewCount}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
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
              const latestPaidAt = formatPaymentDate(reconciliation.latestPaidAt);
              const invoiceJob =
                invoice.job ?? jobs.find((job) => job.id === invoice.job_id) ?? null;

              return (
                <article
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                  key={invoice.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-neutralDark">
                          {invoiceTitle(invoice)}
                        </h2>
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold uppercase text-gray-700">
                          {invoice.status}
                        </span>
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold uppercase text-primary">
                          {reconciliation.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        {invoice.job?.location?.address ?? "No location"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Due {formatDate(invoice.due_date)}
                      </p>
                      {reconciliation.reviewLabel ? (
                        <p className="mt-2 text-sm font-semibold text-red-700">
                          {reconciliation.reviewLabel}
                        </p>
                      ) : null}
                      {latestPaidAt ? (
                        <p className="mt-2 text-sm text-gray-600">
                          Latest payment {latestPaidAt}
                        </p>
                      ) : null}
                      {invoice.notes ? (
                        <p className="mt-2 text-sm text-gray-600">{invoice.notes}</p>
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
                      <div className="text-right text-xs font-medium text-gray-500">
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
                            className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                            disabled={createPaymentLink.isPending}
                            onClick={() => createPaymentLink.mutate(invoice)}
                            type="button"
                          >
                            Create link
                          </button>
                        ) : null}
                        {invoice.status !== "paid" && invoice.status !== "void" ? (
                          <button
                            className="min-h-10 rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                            disabled={markPaid.isPending}
                            onClick={() => markPaid.mutate(invoice.id)}
                            type="button"
                          >
                            Mark paid
                          </button>
                        ) : null}
                        {invoice.status !== "void" && invoice.status !== "paid" ? (
                          <button
                            className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                            disabled={voidInvoice.isPending}
                            onClick={() => voidInvoice.mutate(invoice.id)}
                            type="button"
                          >
                            Void
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={submitInvoice}
        >
          <h2 className="text-xl font-semibold text-neutralDark">Create invoice</h2>
          {closeoutHandoffJob ? (
            <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              From closeout: {closeoutHandoffJob.customer?.name ?? "Unknown customer"} @{" "}
              {closeoutHandoffJob.location?.address ?? "No location"}
            </p>
          ) : null}
          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Completed job
            <select
              aria-label="Completed job"
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
              onChange={(event) => {
                setCloseoutHandoffJobId("");
                setForm((current) => ({ ...current, job_id: event.target.value }));
              }}
              value={form.job_id || selectedJob?.id || ""}
            >
              <option value="">Select job</option>
              {completedJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {jobLabel(job)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Amount
            <input
              aria-label="Invoice amount"
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
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
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
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
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
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
              className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              value={form.notes}
            />
          </label>
          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
