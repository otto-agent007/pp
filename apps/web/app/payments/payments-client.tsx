"use client";

import {
  buildBillingPortalNextActions,
  buildBillingQueue,
  buildInvoiceInputFromJob,
  filterInvoices,
  formatJobScheduleDateTime,
  getBillingCloseoutHandoffSummary,
  getBillingQueueCounts,
  getInvoiceJobIds,
  getInvoiceReconciliation,
  getInvoiceReconciliationGuidance,
  getInvoiceReconciliationSummary,
  getInvoiceSummary,
  getProviderReadinessCopy,
  type InvoiceReconciliationStatus,
  type InvoiceStatusFilter,
} from "@pest-patrol/domain";
import type { Invoice, Job } from "@pest-patrol/types";
import {
  Button,
  Card,
  CountTile,
  Eyebrow,
  SearchableSelect,
  StatTile,
  StatusPill,
  buttonClassName,
  formControlClassName,
  formLabelClassName,
  formTextareaClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
import { useCreateCustomerPortalAccessToken } from "../../hooks/useCustomerPortalAccess";
import { useJobs } from "../../hooks/useJobs";
import {
  useCreateInvoice,
  useCreateInvoicePaymentLink,
  useInvoices,
  useMarkInvoicePaid,
  useVoidInvoice,
} from "../../hooks/usePayments";
import { PortalShareCard } from "../portal-share-card";

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
  const scheduled = formatJobScheduleDateTime(job.scheduled_start, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `${scheduled} - ${customer} - ${address}`;
}

function invoiceTitle(invoice: Invoice) {
  return (
    invoice.customer?.name ?? invoice.job?.customer?.name ?? "Unknown customer"
  );
}

async function copyText(value: string) {
  if (!navigator.clipboard) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(value);
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
  const createPortalLink = useCreateCustomerPortalAccessToken();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  if (!job) {
    return null;
  }
  const handoffJob = job;

  const actions = buildBillingPortalNextActions({
    hasPortalLink: false,
    invoice,
    job,
  }).filter((action) => action.id !== "review_payment");

  if (actions.length === 0) {
    return null;
  }

  async function generatePortalLink() {
    setPortalError(null);
    setPortalCopied(false);

    const grant = await createPortalLink
      .mutateAsync({
        customer_id: handoffJob.customer_id,
        expires_at: null,
      })
      .catch(() => null);

    if (!grant) {
      setPortalError("Couldn't generate a customer portal link.");
      return;
    }

    setPortalUrl(grant.portal_url);
  }

  async function copyPortalLink() {
    if (!portalUrl) {
      return;
    }

    try {
      await copyText(portalUrl);
      setPortalCopied(true);
    } catch {
      setPortalCopied(false);
    }
  }

  return (
    <div
      className={`mt-4 rounded-md border p-3 ${statusSurfaceClassName("info")}`}
    >
      <p className="text-sm font-semibold text-theme-text-primary">
        Customer handoff
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <a
            className="rounded-md bg-theme-background-surface px-3 py-2 text-sm font-semibold text-theme-action-primary hover:bg-primitive-sky-100"
            href={action.href}
            key={action.id}
          >
            {action.label}
          </a>
        ))}
        <Button
          aria-busy={createPortalLink.isPending}
          disabled={createPortalLink.isPending}
          onClick={() => void generatePortalLink()}
          size="sm"
          variant="ghost"
        >
          {createPortalLink.isPending
            ? "Generating portal QR..."
            : "Generate customer portal QR"}
        </Button>
      </div>
      {portalUrl ? (
        <div className="mt-3">
          <PortalShareCard
            copied={portalCopied}
            copyButtonLabel="Copy portal link"
            description="Text this portal link or add the QR code to the invoice handoff."
            onCopy={() => void copyPortalLink()}
            portalUrl={portalUrl}
          />
        </div>
      ) : null}
      {portalError || createPortalLink.error ? (
        <p className="mt-2 text-xs font-semibold text-status-alert-danger-fg">
          {portalError ?? "Couldn't generate a customer portal link."}
        </p>
      ) : null}
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
    () => jobs.filter((job) => job.status === "completed").map((job) => job.id),
    [jobs],
  );
  const summariesQuery = useCloseoutCaptureSummaries(completedJobIds);
  const billingQueue = useMemo(
    () => buildBillingQueue(jobs, invoices, summariesQuery.data ?? []),
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
  const visibleInvoices = useMemo(() => {
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
  }, [highlightedInvoiceId, invoices, reconciliationStatus, search, status]);
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
    completedJobs.find((job) => job.id === form.job_id) ??
    completedJobs[0] ??
    null;
  const closeoutHandoffJob =
    closeoutHandoffJobId && form.job_id === closeoutHandoffJobId
      ? (jobs.find((job) => job.id === closeoutHandoffJobId) ?? null)
      : null;
  const paymentProviderCopy = getProviderReadinessCopy("payment");

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

  function confirmInvoiceAction(
    invoiceId: string,
    action: "mark_paid" | "void",
  ) {
    setActionConfirmation(null);

    if (action === "mark_paid") {
      markPaid.mutate(invoiceId);
      return;
    }

    voidInvoice.mutate(invoiceId);
  }

  function applyPaymentFilter(
    invoiceStatus: InvoiceStatusFilter,
    reconciliation: ReconciliationFilter = "all",
  ) {
    setStatus(invoiceStatus);
    setReconciliationStatus(reconciliation);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="accent">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            Payments
          </h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            aria-label="Search invoices"
            className={formControlClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoices"
            value={search}
          />
          <select
            aria-label="Invoice status"
            className={formControlClassName}
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
            className={formControlClassName}
            onChange={(event) =>
              setReconciliationStatus(
                event.target.value as ReconciliationFilter,
              )
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
          <p className="font-semibold text-theme-text-primary">
            {closeoutHandoff.label}
          </p>
          <p className="mt-1 text-theme-text-secondary">
            {closeoutHandoff.summary}
          </p>
          <p className="mt-1 text-xs font-semibold text-theme-text-muted">
            {closeoutHandoff.nextStep}
          </p>
          <p className="mt-1 text-xs font-medium text-theme-text-muted">
            Use closeouts to confirm proof handoff, GPS evidence, and
            customer-safe portal readiness before invoicing.
          </p>
        </div>
        <a className={buttonClassName({ variant: "ghost" })} href="/closeouts">
          View queue
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <Eyebrow tone="accent">Payment workspace</Eyebrow>
          <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
            Reconciliation snapshot
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            detail="Requires operator review"
            label="Needs review"
            tone={
              reconciliationSummary.needsReviewCount > 0 ? "danger" : "success"
            }
            value={reconciliationSummary.needsReviewCount}
          />
          <StatTile
            detail="Reconciled or manually recorded"
            label="Paid activity"
            tone="success"
            value={formatMoney(reconciliationSummary.paidCents)}
          />
          <StatTile
            detail="Remaining balance before provider receipts"
            label="Open balance"
            tone={
              reconciliationSummary.remainingCents > 0 ? "warning" : "success"
            }
            value={formatMoney(reconciliationSummary.remainingCents)}
          />
        </div>
      </section>

      <details
        className={`group rounded-lg border shadow-sm ${statusSurfaceClassName(
          "warning",
        )}`}
      >
        <summary className="cursor-pointer px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Eyebrow tone="danger">Manual fallback mode</Eyebrow>
              <h2 className="mt-1 text-lg font-semibold text-theme-text-primary">
                Payment provider readiness
              </h2>
            </div>
            <StatusPill tone="warning">
              {paymentProviderCopy.stateLabel}
            </StatusPill>
          </div>
        </summary>
        <div className="hidden border-t border-status-alert-warning-border px-4 py-3 group-open:block">
          <p className="text-sm text-theme-text-secondary">
            {paymentProviderCopy.label}
          </p>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {paymentProviderCopy.summary}
          </p>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {paymentProviderCopy.detail}
          </p>
        </div>
      </details>

      <section className="grid gap-3 sm:grid-cols-5">
        <CountTile
          active={status === "draft" && reconciliationStatus === "all"}
          count={summary.draftCount}
          label="Draft"
          onClick={() => applyPaymentFilter("draft")}
        />
        <CountTile
          active={status === "sent" && reconciliationStatus === "all"}
          count={summary.sentCount}
          label="Sent"
          onClick={() => applyPaymentFilter("sent")}
          tone="info"
        />
        <CountTile
          active={
            status === "sent" && reconciliationStatus === "awaiting_payment"
          }
          count={formatMoney(summary.openCents)}
          label="Open"
          onClick={() => applyPaymentFilter("sent", "awaiting_payment")}
          tone="info"
        />
        <CountTile
          active={status === "paid" && reconciliationStatus === "all"}
          count={formatMoney(summary.paidCents)}
          label="Paid"
          onClick={() => applyPaymentFilter("paid")}
          tone="success"
        />
        <CountTile
          active={status === "all" && reconciliationStatus === "needs_review"}
          count={reconciliationSummary.needsReviewCount}
          label="Needs review"
          onClick={() => applyPaymentFilter("all", "needs_review")}
          tone="danger"
        />
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
              const latestPaidAt = formatPaymentDate(
                reconciliation.latestPaidAt,
              );
              const invoiceJob =
                invoice.job ??
                jobs.find((job) => job.id === invoice.job_id) ??
                null;
              const confirmingAction =
                actionConfirmation?.invoiceId === invoice.id
                  ? actionConfirmation.action
                  : null;
              const confirmationContext = `${invoiceTitle(invoice)} · invoice ${
                invoice.id
              } · ${formatMoney(invoice.total_cents, invoice.currency)}`;

              return (
                <article key={invoice.id}>
                  <Card padding="lg">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-theme-text-primary">
                            {invoiceTitle(invoice)}
                          </h2>
                          <StatusPill
                            tone={
                              invoice.status === "paid" ? "success" : "neutral"
                            }
                          >
                            {invoice.status}
                          </StatusPill>
                          <StatusPill
                            tone={
                              reconciliationToneByStatus[reconciliation.status]
                            }
                          >
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
                          <p className="mt-2 text-sm text-theme-text-secondary">
                            {invoice.notes}
                          </p>
                        ) : null}
                        {invoice.payment_url ? (
                          <a
                            className={buttonClassName({
                              className: "mt-3",
                              size: "sm",
                              variant: "ghost",
                            })}
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
                        <p className="text-right text-2xl font-bold text-theme-text-primary">
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
                            <Button
                              disabled={createPaymentLink.isPending}
                              onClick={() => createPaymentLink.mutate(invoice)}
                              size="sm"
                            >
                              Create link
                            </Button>
                          ) : null}
                          {invoice.status !== "paid" &&
                          invoice.status !== "void" ? (
                            <Button
                              className="border-status-alert-success-border text-status-alert-success-fg hover:bg-status-alert-success-bg"
                              disabled={markPaid.isPending}
                              onClick={() =>
                                setActionConfirmation({
                                  action: "mark_paid",
                                  invoiceId: invoice.id,
                                })
                              }
                              size="sm"
                              variant="ghost"
                            >
                              Mark paid
                            </Button>
                          ) : null}
                          {invoice.status !== "void" &&
                          invoice.status !== "paid" ? (
                            <Button
                              disabled={voidInvoice.isPending}
                              onClick={() =>
                                setActionConfirmation({
                                  action: "void",
                                  invoiceId: invoice.id,
                                })
                              }
                              size="sm"
                              variant="danger"
                            >
                              Void
                            </Button>
                          ) : null}
                        </div>
                        {confirmingAction ? (
                          <div
                            aria-label={
                              confirmingAction === "mark_paid"
                                ? `Confirm mark paid for ${invoiceTitle(invoice)}`
                                : `Confirm void for ${invoiceTitle(invoice)}`
                            }
                            className={`rounded-md border px-3 py-2 text-left ${statusSurfaceClassName(
                              "warning",
                            )}`}
                            role="group"
                          >
                            <p className="text-sm font-semibold text-theme-text-primary">
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
                              <Button
                                aria-label={
                                  confirmingAction === "mark_paid"
                                    ? "Cancel mark paid"
                                    : "Cancel void"
                                }
                                onClick={() => setActionConfirmation(null)}
                                size="sm"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                              <Button
                                className={
                                  confirmingAction === "mark_paid"
                                    ? "bg-status-alert-success-solid hover:bg-status-alert-success-fg"
                                    : undefined
                                }
                                disabled={
                                  confirmingAction === "mark_paid"
                                    ? markPaid.isPending
                                    : voidInvoice.isPending
                                }
                                onClick={() =>
                                  confirmInvoiceAction(
                                    invoice.id,
                                    confirmingAction,
                                  )
                                }
                                size="sm"
                                variant={
                                  confirmingAction === "mark_paid"
                                    ? "primary"
                                    : "danger"
                                }
                              >
                                {confirmingAction === "mark_paid"
                                  ? "Confirm mark paid"
                                  : "Confirm void"}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </article>
              );
            })
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
          onSubmit={submitInvoice}
        >
          <h2 className="text-xl font-semibold text-theme-text-primary">
            Create invoice
          </h2>
          {closeoutHandoffJob ? (
            <p
              className={`rounded-md border p-3 text-sm text-status-alert-info-fg ${statusSurfaceClassName(
                "info",
              )}`}
            >
              From closeout:{" "}
              {closeoutHandoffJob.customer?.name ?? "Unknown customer"} @{" "}
              {closeoutHandoffJob.location?.address ?? "No location"}
            </p>
          ) : null}
          {formError ? (
            <p
              className={`rounded-md border p-3 text-sm text-status-alert-danger-fg ${statusSurfaceClassName(
                "danger",
              )}`}
            >
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
          <p className="-mt-2 text-xs font-semibold text-theme-text-secondary">
            Only completed jobs appear here so invoices start from
            closeout-ready work.
          </p>
          <label className={formLabelClassName}>
            Amount
            <input
              aria-label="Invoice amount"
              className={formControlClassName}
              min="0"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              step="0.01"
              type="number"
              value={form.amount}
            />
          </label>
          <label className={formLabelClassName}>
            Description
            <input
              aria-label="Line item description"
              className={formControlClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={form.description}
            />
          </label>
          <label className={formLabelClassName}>
            Due date
            <input
              aria-label="Due date"
              className={formControlClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  due_date: event.target.value,
                }))
              }
              type="date"
              value={form.due_date}
            />
          </label>
          <label className={formLabelClassName}>
            Notes
            <textarea
              aria-label="Invoice notes"
              className={formTextareaClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              value={form.notes}
            />
          </label>
          <Button disabled={createInvoice.isPending} type="submit">
            Save invoice
          </Button>
        </form>
      </section>
    </main>
  );
}
