"use client";

import {
  filterCustomerPortalInvoices,
  filterCustomerPortalCloseouts,
  getCustomerPortalInvoiceStatusLabel,
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
    <p className="rounded-md border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
      {children}
    </p>
  );
}

function PortalMediaTile({ media }: { media: CustomerPortalMedia }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3">
      {media.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.description ?? media.media_type}
          className="h-48 w-full rounded-md bg-gray-100 object-cover"
          src={media.signed_url}
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-md bg-gray-100 px-4 text-center text-sm text-gray-500">
          Preview unavailable
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-neutralDark">
        {media.description ?? "Job media"}
      </p>
      <p className="mt-1 text-xs text-gray-500">
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
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold text-neutralDark">
          {submission.template?.name ?? "Service form"}
        </h3>
        <p className="text-xs font-medium text-gray-500">
          {formatDateTime(submission.submitted_at)}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.length > 0
          ? fields.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {formatValue(submission.form_data[field.id])}
                </dd>
              </div>
            ))
          : Object.entries(submission.form_data).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {key}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
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
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-neutralDark">
              Invoice {invoice.id.slice(0, 8)}
            </h2>
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
              {getCustomerPortalInvoiceStatusLabel(invoice.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            {invoice.job?.location?.nickname ??
              invoice.job?.location?.address ??
              "Service invoice"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Service date {formatDateTime(invoice.job?.scheduled_start)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Due {formatDateTime(invoice.due_date)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl font-bold text-neutralDark">
            {formatMoney(invoice.total_cents, invoice.currency)}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-600">
            Balance {formatMoney(invoice.balance_cents, invoice.currency)}
          </p>
          {invoice.payment_url ? (
            <a
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-900"
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
        <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          {invoice.line_items.map((item) => (
            <div key={item.id}>
              <dt className="text-sm font-semibold text-gray-800">
                {item.description}
              </dt>
              <dd className="mt-1 text-sm text-gray-600">
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
        <EmptyState>Unable to load invoices</EmptyState>
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

function CloseoutCard({ closeout }: { closeout: CustomerPortalCloseout }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Completed service
          </p>
          <h2 className="mt-1 text-2xl font-bold text-neutralDark">
            {closeout.job.location?.nickname ?? closeout.job.location?.address ?? "Service visit"}
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            {closeout.job.location?.address ?? "Service location unavailable"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatDateTime(closeout.job.scheduled_start)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-lg font-bold text-neutralDark">
              {closeout.form_submissions.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Forms
            </p>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-lg font-bold text-neutralDark">
              {closeout.photos.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Photos
            </p>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-lg font-bold text-neutralDark">
              {closeout.signatures.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Signatures
            </p>
          </div>
        </div>
      </div>

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
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Completed service visits, invoices, forms, photos, and signatures.
          </p>
        </div>
        <input
          aria-label="Search service visits"
          className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary md:w-80"
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

      {portal.isLoading ? (
        <EmptyState>Loading completed service visits</EmptyState>
      ) : portal.error ? (
        <EmptyState>Unable to load service visits</EmptyState>
      ) : visibleCloseouts.length === 0 ? (
        <EmptyState>No completed service visits found</EmptyState>
      ) : (
        <section className="flex flex-col gap-5">
          {visibleCloseouts.map((closeout) => (
            <CloseoutCard key={closeout.job.id} closeout={closeout} />
          ))}
        </section>
      )}
    </main>
  );
}
