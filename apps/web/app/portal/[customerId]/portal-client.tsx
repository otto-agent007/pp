"use client";

import {
  buildCustomerPortalTimeline,
  filterCustomerPortalInvoices,
  filterCustomerPortalCloseouts,
  formatJobScheduleDateTime,
  getCustomerPortalInvoiceStatusLabel,
  getCustomerPortalProofHandoff,
  getCustomerPortalServiceSummary,
  getCustomerPortalUpgradeSummary,
  type CustomerPortalTimelineItem,
} from "@pest-patrol/domain";
import type {
  CustomerPortalCloseout,
  CustomerPortalFormSubmission,
  CustomerPortalInvoice,
  CustomerPortalMedia,
  FormValue,
} from "@pest-patrol/types";
import {
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { useEffect, useMemo, useState } from "react";

import {
  useCustomerPortalBilling,
  useCustomerPortalCloseouts,
  useCustomerPortalUpgradeIntent,
} from "../../../hooks/useCustomerPortal";
import { useActiveBrandSkin } from "../../brand";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatValue(value: FormValue) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (value === null || value === "") {
    return "Not answered";
  }

  return String(value);
}

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(cents / 100);
}

function invoiceStatusTone(status: string): StatusPillTone {
  if (status === "paid") {
    return "success";
  }

  if (status === "void") {
    return "neutral";
  }

  if (status === "draft") {
    return "warning";
  }

  return "info";
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-surface p-4 text-sm text-theme-text-secondary">
      {children}
    </p>
  );
}

function GeneralPestUpgradeCard({
  customerId,
  companyName,
}: {
  companyName: string;
  customerId: string;
}) {
  const upgradeSummary = getCustomerPortalUpgradeSummary();
  const upgradeIntent = useCustomerPortalUpgradeIntent(customerId);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const upgradeCardSummary =
    "Ask us to review recurring service needs for this property. We will confirm service type, pricing, and start date before any routine service is scheduled or billed.";
  const upgradeCardTitle = `Ask ${companyName} about routine service`;

  async function requestUpgrade() {
    const result = await upgradeIntent
      .mutateAsync({ plan_id: upgradeSummary.plan_id })
      .catch(() => null);

    if (!result) {
      return;
    }

    setConfirmation(
      result.status === "already_requested"
        ? "Request already sent today. Our office will follow up before anything recurring is scheduled or billed."
        : upgradeSummary.confirmation_label,
    );
  }

  return (
    <section className="rounded-lg border border-status-alert-info-border bg-status-alert-info-bg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Eyebrow>Upgrade</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-theme-text-primary">
              {upgradeCardTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-theme-text-secondary">
              {upgradeCardSummary}
            </p>
          {confirmation ? (
            <p className="mt-2 text-sm font-semibold text-status-alert-success-fg">
              {confirmation}
            </p>
          ) : null}
          {upgradeIntent.error ? (
            <p className="mt-2 text-sm font-semibold text-status-alert-danger-fg">
              Unable to send request. Please contact the office.
            </p>
          ) : null}
        </div>
        <button
          className={buttonClassName({ variant: "primary" })}
          disabled={upgradeIntent.isPending || Boolean(confirmation)}
          onClick={() => void requestUpgrade()}
          type="button"
        >
          {upgradeIntent.isPending
            ? "Sending request..."
            : upgradeSummary.action_label}
        </button>
      </div>
    </section>
  );
}

const emptyCloseouts: CustomerPortalCloseout[] = [];
const emptyInvoices: CustomerPortalInvoice[] = [];

function accessErrorMessage(error: Error | null, fallback: string) {
  if (!error) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (message.includes("required") || message.includes("missing")) {
    return "This portal link is missing. Contact your pest control provider for a new link.";
  }

  if (
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("token")
  ) {
    return "This portal link is invalid or expired. Contact your pest control provider for a new link.";
  }

  return fallback;
}

function printPortalRecord() {
  window.print();
}

function PrintRecordButton({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <button
      className={buttonClassName({ className, variant: "ghost" })}
      onClick={printPortalRecord}
      type="button"
    >
      {children}
    </button>
  );
}

function PortalMediaTile({ media }: { media: CustomerPortalMedia }) {
  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-3">
      {media.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.description ?? media.media_type}
          className="h-48 w-full rounded-md bg-theme-background-subtle object-cover"
          src={media.signed_url}
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-md bg-theme-background-subtle px-4 text-center text-sm text-theme-text-muted">
          Preview unavailable
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-theme-text-primary">
        {media.description ?? "Job media"}
      </p>
      <p className="mt-1 text-xs text-theme-text-muted">
        Captured {formatDateTime(media.captured_at)}
      </p>
    </article>
  );
}

function PortalFormCard({
  submission,
}: {
  submission: CustomerPortalFormSubmission;
}) {
  const fields = submission.template?.schema.fields ?? [];

  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-theme-text-primary">
          {submission.template?.name ?? "Service form"}
        </h3>
        <p className="text-xs font-medium text-theme-text-muted">
          {formatDateTime(submission.submitted_at)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.length > 0
          ? fields.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-theme-text-primary">
                  {formatValue(submission.form_data[field.id])}
                </dd>
              </div>
            ))
          : Object.entries(submission.form_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  {key}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-theme-text-primary">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
      </dl>
    </article>
  );
}

function BillingCard({ invoice }: { invoice: CustomerPortalInvoice }) {
  const invoiceLabel = invoice.line_items[0]?.description ?? "Service";

  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {invoiceLabel} invoice
            </h2>
            <StatusPill tone={invoiceStatusTone(invoice.status)}>
              {getCustomerPortalInvoiceStatusLabel(invoice.status)}
            </StatusPill>
          </div>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {invoice.job?.location?.nickname ??
              invoice.job?.location?.address ??
              "Service invoice"}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Service date{" "}
            {invoice.job?.scheduled_start
              ? formatJobScheduleDateTime(invoice.job.scheduled_start)
              : "Not available"}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Due {formatDateTime(invoice.due_date)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl font-bold text-theme-text-primary">
            {formatMoney(invoice.total_cents, invoice.currency)}
          </p>
          <p className="mt-1 text-sm font-medium text-theme-text-secondary">
            Balance {formatMoney(invoice.balance_cents, invoice.currency)}
          </p>
          {invoice.payment_url ? (
            <a
              className={buttonClassName({
                className: "mt-3",
                variant: "primary",
              })}
              href={invoice.payment_url}
              rel="noreferrer"
              target="_blank"
            >
              Pay invoice
            </a>
          ) : null}
          <PrintRecordButton className="mt-3">
            Print invoice record
          </PrintRecordButton>
        </div>
      </div>
      {invoice.line_items.length > 0 ? (
        <dl className="mt-4 grid gap-3 border-t border-theme-border-subtle pt-4 sm:grid-cols-2">
          {invoice.line_items.map((item) => (
            <div key={item.id}>
              <dt className="text-sm font-semibold text-theme-text-primary">
                {item.description}
              </dt>
              <dd className="mt-1 text-sm text-theme-text-secondary">
                {item.quantity} x{" "}
                {formatMoney(item.unit_amount_cents, invoice.currency)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

function BillingSection({
  error,
  invoices,
  isLoading,
  search,
}: {
  error: Error | null;
  invoices: CustomerPortalInvoice[];
  isLoading: boolean;
  search: string;
}) {
  const visibleInvoices = useMemo(
    () => filterCustomerPortalInvoices(invoices, search),
    [invoices, search],
  );

  return (
    <section className="flex flex-col gap-3">
      <div>
        <Eyebrow>Billing</Eyebrow>
        <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
          Invoices
        </h2>
      </div>
      {isLoading ? (
        <EmptyState>Loading invoices</EmptyState>
      ) : error ? (
        <EmptyState>
          {accessErrorMessage(error, "Unable to load invoices")}
        </EmptyState>
      ) : visibleInvoices.length === 0 ? (
        <EmptyState>No invoices found</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleInvoices.map((invoice) => (
            <BillingCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </section>
  );
}

function timelineStatusLabel(item: CustomerPortalTimelineItem) {
  if (item.invoice_status === "none") {
    return "No invoice";
  }

  const status = getCustomerPortalInvoiceStatusLabel(item.invoice_status);
  const balance =
    item.balance_cents === null
      ? null
      : `Balance ${formatMoney(item.balance_cents, item.currency)}`;

  return balance ? `Invoice ${status} | ${balance}` : `Invoice ${status}`;
}

function PortalTimeline({
  items,
  isLoading,
}: {
  isLoading: boolean;
  items: CustomerPortalTimelineItem[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <Eyebrow>Account timeline</Eyebrow>
        <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
          Service and billing history
        </h2>
      </div>
      {isLoading ? (
        <EmptyState>Loading account timeline</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>No service or invoice activity found</EmptyState>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article
              className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm"
              key={item.id}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
                    {item.type === "service"
                      ? "Service completed"
                      : "Invoice activity"}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-theme-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-theme-text-secondary">
                    {item.type === "service"
                      ? formatJobScheduleDateTime(item.date)
                      : formatDateTime(item.date)}
                  </p>
                  <p className="mt-2 text-sm text-theme-text-secondary">
                    {item.captures_label}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-theme-text-primary">
                    {timelineStatusLabel(item)}
                  </p>
                  {item.payment_url ? (
                    <a
                      className={buttonClassName({
                        className: "mt-3",
                        variant: "primary",
                      })}
                      href={item.payment_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pay from timeline
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CloseoutCard({
  closeout,
  invoices,
}: {
  closeout: CustomerPortalCloseout;
  invoices: CustomerPortalInvoice[];
}) {
  const summary = getCustomerPortalServiceSummary(closeout, invoices);
  const proof = getCustomerPortalProofHandoff(closeout);

  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Eyebrow>Completed service</Eyebrow>
          <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
            {closeout.job.location?.nickname ??
              closeout.job.location?.address ??
              "Service visit"}
          </h2>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {closeout.job.location?.address ?? "Service location unavailable"}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            {summary.serviceDateLabel}
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-theme-text-secondary sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-theme-text-primary">
                Location
              </dt>
              <dd>{summary.locationLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-theme-text-primary">
                Captures
              </dt>
              <dd>{summary.capturesLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-theme-text-primary">Billing</dt>
              <dd>{summary.invoiceLabel}</dd>
            </div>
          </dl>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-theme-background-subtle p-3">
            <p className="text-lg font-bold text-theme-text-primary">
              {closeout.form_submissions.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Forms
            </p>
          </div>
          <div className="rounded-md bg-theme-background-subtle p-3">
            <p className="text-lg font-bold text-theme-text-primary">
              {closeout.photos.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Photos
            </p>
          </div>
          <div className="rounded-md bg-theme-background-subtle p-3">
            <p className="text-lg font-bold text-theme-text-primary">
              {closeout.signatures.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Signatures
            </p>
          </div>
        </div>
      </div>
      <PrintRecordButton className="mt-4">Print service record</PrintRecordButton>

      <section className="mt-6 rounded-md border border-status-alert-success-border bg-status-alert-success-bg p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-theme-text-primary">
              Proof of service
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {proof.summary_label}
            </p>
            <p className="mt-1 text-xs font-medium text-theme-text-secondary">
              {proof.privacy_label}
            </p>
            <p className="mt-2 text-sm font-semibold text-theme-text-primary">
              {proof.next_step_label}
            </p>
          </div>
          <StatusPill tone="success">{proof.completion_label}</StatusPill>
        </div>
        <dl className="mt-3 grid gap-2 text-sm text-theme-text-secondary sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-theme-text-primary">
              Service date
            </dt>
            <dd>{proof.service_date_label}</dd>
          </div>
          <div>
            <dt className="font-semibold text-theme-text-primary">Location</dt>
            <dd>{proof.location_label}</dd>
          </div>
          <div>
            <dt className="font-semibold text-theme-text-primary">
              Customer proof
            </dt>
            <dd>
              {proof.capture_counts.forms} forms, {proof.capture_counts.photos}{" "}
              photos, {proof.capture_counts.signatures} signatures
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-theme-text-primary">
          Service forms
        </h3>
        {closeout.form_submissions.length === 0 ? (
          <EmptyState>
            No service forms are available for this visit.
          </EmptyState>
        ) : (
          closeout.form_submissions.map((submission) => (
            <PortalFormCard key={submission.id} submission={submission} />
          ))
        )}
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-theme-text-primary">
          Photos
        </h3>
        {closeout.photos.length === 0 ? (
          <EmptyState>No photos are available for this visit.</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {closeout.photos.map((media) => (
              <PortalMediaTile key={media.id} media={media} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-theme-text-primary">
          Signatures
        </h3>
        {closeout.signatures.length === 0 ? (
          <EmptyState>No signatures are available for this visit.</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {closeout.signatures.map((media) => (
              <PortalMediaTile key={media.id} media={media} />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

export function CustomerPortalClient({
  customerId,
}: {
  customerId: string;
}) {
  const brandSkin = useActiveBrandSkin();
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const portal = useCustomerPortalCloseouts(customerId);
  const billing = useCustomerPortalBilling(customerId);
  const portalCloseouts = mounted ? portal.closeouts : emptyCloseouts;
  const billingInvoices = mounted ? billing.invoices : emptyInvoices;
  const portalError = mounted ? portal.error : null;
  const billingError = mounted ? billing.error : null;
  const visibleCloseouts = useMemo(
    () => filterCustomerPortalCloseouts(portalCloseouts, search),
    [portalCloseouts, search],
  );
  const timelineItems = useMemo(
    () => buildCustomerPortalTimeline(visibleCloseouts, billingInvoices),
    [billingInvoices, visibleCloseouts],
  );
  const customerName = mounted
    ? (visibleCloseouts[0]?.job.customer?.name ??
      portalCloseouts[0]?.job.customer?.name ??
      billingInvoices[0]?.job?.customer?.name ??
      null)
    : null;
  const documentTitle = customerName
    ? `${customerName} service history`
    : "Your service history";
  const openBalanceCents = useMemo(
    () =>
      billingInvoices.reduce(
        (total, invoice) => total + invoice.balance_cents,
        0,
      ),
    [billingInvoices],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Customer portal</Eyebrow>
          <p className="text-sm font-semibold text-theme-text-secondary">
            Secure service portal for {brandSkin.portalCompanyName} customers.
          </p>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            {documentTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-theme-text-secondary">
            Customer records for completed services, invoices, forms, photos,
            and signatures.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:w-80">
          <PrintRecordButton>Print or save records</PrintRecordButton>
          <input
            aria-label="Search portal activity"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search activity"
            value={search}
          />
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <Eyebrow tone="accent">Service history</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            detail="Completed visits in this portal"
            label="Services"
            tone="success"
            value={portalCloseouts.length}
          />
          <StatTile
            detail="Customer-safe billing activity"
            label="Invoices"
            value={billingInvoices.length}
          />
          <StatTile
            detail="Due across visible invoices"
            label="Open balance"
            tone={openBalanceCents > 0 ? "warning" : "success"}
            value={formatMoney(openBalanceCents)}
          />
        </div>
      </section>

      <GeneralPestUpgradeCard
        companyName={brandSkin.portalCompanyName}
        customerId={customerId}
      />

      <BillingSection
        error={billingError}
        invoices={billingInvoices}
        isLoading={!mounted || billing.isLoading}
        search={search}
      />

      <PortalTimeline
        isLoading={!mounted || portal.isLoading || billing.isLoading}
        items={timelineItems}
      />

      {!mounted || portal.isLoading ? (
        <EmptyState>Loading completed service visits</EmptyState>
      ) : portalError ? (
        <EmptyState>
          {accessErrorMessage(portalError, "Unable to load service visits")}
        </EmptyState>
      ) : visibleCloseouts.length === 0 ? (
        <EmptyState>No completed service visits found</EmptyState>
      ) : (
        <section className="flex flex-col gap-5">
          {visibleCloseouts.map((closeout) => (
            <CloseoutCard
              closeout={closeout}
              invoices={billingInvoices}
              key={closeout.job.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}
