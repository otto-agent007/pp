"use client";

import {
  buildCustomerPortalTimeline,
  filterCustomerPortalInvoices,
  filterCustomerPortalCloseouts,
  getCustomerPortalInvoiceStatusLabel,
  getCustomerPortalProofHandoff,
  getCustomerPortalServiceSummary,
  type CustomerPortalTimelineItem,
} from "@pest-patrol/domain";
import type {
  CustomerPortalCloseout,
  CustomerPortalFormSubmission,
  CustomerPortalInvoice,
  CustomerPortalMedia,
  FormValue,
} from "@pest-patrol/types";
import { useMemo, useState } from "react";

import {
  useCustomerPortalBilling,
  useCustomerPortalCloseouts,
} from "../../../hooks/useCustomerPortal";

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

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-surface p-4 text-sm text-theme-text-secondary">
      {children}
    </p>
  );
}

function accessErrorMessage(error: Error | null, fallback: string) {
  return error?.message ?? fallback;
}

function PortalMediaTile({ media }: { media: CustomerPortalMedia }) {
  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-3">
      {media.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.description ?? media.media_type}
          className="h-48 w-full rounded-md bg-primitive-slate-100 object-cover"
          src={media.signed_url}
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-md bg-primitive-slate-100 px-4 text-center text-sm text-theme-text-muted">
          Preview unavailable
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-neutralDark">
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
        <h3 className="text-base font-semibold text-neutralDark">
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
  return (
    <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-neutralDark">
              Invoice {invoice.id.slice(0, 8)}
            </h2>
            <span className="rounded-md bg-primitive-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
              {getCustomerPortalInvoiceStatusLabel(invoice.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {invoice.job?.location?.nickname ??
              invoice.job?.location?.address ??
              "Service invoice"}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Service date {formatDateTime(invoice.job?.scheduled_start)}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Due {formatDateTime(invoice.due_date)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl font-bold text-neutralDark">
            {formatMoney(invoice.total_cents, invoice.currency)}
          </p>
          <p className="mt-1 text-sm font-medium text-theme-text-secondary">
            Balance {formatMoney(invoice.balance_cents, invoice.currency)}
          </p>
          {invoice.payment_url ? (
            <a
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-theme-text-inverse shadow-sm hover:bg-primitive-sky-600"
              href={invoice.payment_url}
              rel="noreferrer"
              target="_blank"
            >
              Pay invoice
            </a>
          ) : null}
        </div>
      </div>
      {invoice.line_items.length > 0 ? (
        <dl className="mt-4 grid gap-3 border-t border-primitive-slate-100 pt-4 sm:grid-cols-2">
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
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Billing
        </p>
        <h2 className="mt-1 text-2xl font-bold text-neutralDark">Invoices</h2>
      </div>
      {isLoading ? (
        <EmptyState>Loading invoices</EmptyState>
      ) : error ? (
        <EmptyState>{accessErrorMessage(error, "Unable to load invoices")}</EmptyState>
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

  return balance ? `Invoice ${item.invoice_status} | ${balance}` : `Invoice ${status}`;
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
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Account timeline
        </p>
        <h2 className="mt-1 text-2xl font-bold text-neutralDark">
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
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {item.type === "service" ? "Service completed" : "Invoice activity"}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-neutralDark">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-theme-text-secondary">
                    {formatDateTime(item.date)}
                  </p>
                  <p className="mt-2 text-sm text-theme-text-secondary">
                    {item.captures_label}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-neutralDark">
                    {timelineStatusLabel(item)}
                  </p>
                  {item.payment_url ? (
                    <a
                      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-theme-text-inverse hover:bg-primitive-sky-600"
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
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Completed service
          </p>
          <h2 className="mt-1 text-2xl font-bold text-neutralDark">
            {closeout.job.location?.nickname ?? closeout.job.location?.address ?? "Service visit"}
          </h2>
          <p className="mt-2 text-sm text-theme-text-secondary">
            {closeout.job.location?.address ?? "Service location unavailable"}
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            {summary.serviceDateLabel}
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-theme-text-secondary sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-theme-text-primary">Location</dt>
              <dd>{summary.locationLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-theme-text-primary">Captures</dt>
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
            <p className="text-lg font-bold text-neutralDark">
              {closeout.form_submissions.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Forms
            </p>
          </div>
          <div className="rounded-md bg-theme-background-subtle p-3">
            <p className="text-lg font-bold text-neutralDark">
              {closeout.photos.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Photos
            </p>
          </div>
          <div className="rounded-md bg-theme-background-subtle p-3">
            <p className="text-lg font-bold text-neutralDark">
              {closeout.signatures.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Signatures
            </p>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-md border border-status-alert-success-border bg-status-alert-success-bg p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutralDark">
              Proof of service
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">{proof.summary_label}</p>
            <p className="mt-1 text-xs font-medium text-theme-text-secondary">
              {proof.privacy_label}
            </p>
            <p className="mt-2 text-sm font-semibold text-theme-text-primary">
              {proof.next_step_label}
            </p>
          </div>
          <span className="rounded-md bg-theme-background-surface px-2 py-1 text-xs font-semibold uppercase text-status-alert-success-fg">
            {proof.completion_label}
          </span>
        </div>
        <dl className="mt-3 grid gap-2 text-sm text-theme-text-secondary sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-theme-text-primary">Service date</dt>
            <dd>{proof.service_date_label}</dd>
          </div>
          <div>
            <dt className="font-semibold text-theme-text-primary">Location</dt>
            <dd>{proof.location_label}</dd>
          </div>
          <div>
            <dt className="font-semibold text-theme-text-primary">Customer proof</dt>
            <dd>
              {proof.capture_counts.forms} forms, {proof.capture_counts.photos} photos,{" "}
              {proof.capture_counts.signatures} signatures
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-neutralDark">Service forms</h3>
        {closeout.form_submissions.length === 0 ? (
          <EmptyState>No service forms are available for this visit.</EmptyState>
        ) : (
          closeout.form_submissions.map((submission) => (
            <PortalFormCard key={submission.id} submission={submission} />
          ))
        )}
      </section>

      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-neutralDark">Photos</h3>
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
        <h3 className="text-lg font-semibold text-neutralDark">Signatures</h3>
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
  accessToken,
  customerId,
}: {
  accessToken: string;
  customerId: string;
}) {
  const [search, setSearch] = useState("");
  const portal = useCustomerPortalCloseouts(customerId, accessToken);
  const billing = useCustomerPortalBilling(customerId, accessToken);
  const visibleCloseouts = useMemo(
    () => filterCustomerPortalCloseouts(portal.closeouts, search),
    [portal.closeouts, search],
  );
  const timelineItems = useMemo(
    () => buildCustomerPortalTimeline(visibleCloseouts, billing.invoices),
    [billing.invoices, visibleCloseouts],
  );
  const customerName =
    visibleCloseouts[0]?.job.customer?.name ??
    portal.closeouts[0]?.job.customer?.name ??
    "Customer portal";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Customer portal
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">{customerName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-theme-text-secondary">
            Completed service visits, invoices, forms, photos, and signatures.
          </p>
        </div>
        <input
          aria-label="Search service visits"
          className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary md:w-80"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search visits"
          value={search}
        />
      </header>

      <BillingSection
        error={billing.error}
        invoices={billing.invoices}
        isLoading={billing.isLoading}
        search={search}
      />

      <PortalTimeline
        isLoading={portal.isLoading || billing.isLoading}
        items={timelineItems}
      />

      {portal.isLoading ? (
        <EmptyState>Loading completed service visits</EmptyState>
      ) : portal.error ? (
        <EmptyState>
          {accessErrorMessage(portal.error, "Unable to load service visits")}
        </EmptyState>
      ) : visibleCloseouts.length === 0 ? (
        <EmptyState>No completed service visits found</EmptyState>
      ) : (
        <section className="flex flex-col gap-5">
          {visibleCloseouts.map((closeout) => (
            <CloseoutCard
              closeout={closeout}
              invoices={billing.invoices}
              key={closeout.job.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}
