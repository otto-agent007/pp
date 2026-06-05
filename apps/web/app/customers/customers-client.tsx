"use client";

import {
  buildCustomerLedger,
  filterCustomers,
  getCustomerAccountFollowUpStatus,
  getCustomerLedgerSummary,
  type CustomerAccountFollowUpStatus,
  validateCustomerInput,
  type CustomerLedgerEntry,
} from "@pest-patrol/domain";
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  StatusPill,
  buttonClassName,
  formControlClassName,
  formLabelClassName,
  formTextareaClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import type {
  Customer,
  CustomerInput,
  CustomerLocationInput,
  CustomerStatus,
  Invoice,
  Job,
  PropertyType,
} from "@pest-patrol/types";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import {
  useArchiveCustomer,
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../../hooks/useCustomers";
import { useInvoices } from "../../hooks/usePayments";
import { adminWorkspaceClassName } from "../admin-workspace";
import { CustomerPortalLinks } from "./customer-portal-links";

const emptyLocation: CustomerLocationInput = {
  address: "",
  nickname: "",
  service_notes: "",
  is_primary: true,
};

const emptyForm: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  property_type: "residential",
  service_notes: "",
  locations: [{ ...emptyLocation }],
};

const createSuccessMessage =
  "Customer saved. Schedule the first job next; share portal links when closeout and billing are ready.";
const updateSuccessMessage =
  "Customer updated. Schedule the first job next; share portal links when closeout and billing are ready.";

type LedgerTabId = "all" | "services" | "invoices" | "open" | "review";

const fieldClassName = formControlClassName;
const labelClassName = formLabelClassName;

const ledgerTabs: Array<{ id: LedgerTabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "services", label: "Services" },
  { id: "invoices", label: "Invoices" },
  { id: "open", label: "Open" },
  { id: "review", label: "Review" },
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "None yet";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function customerBillingHref(customerId: string) {
  return `/payments?customer_id=${encodeURIComponent(customerId)}`;
}

function customerReviewHref(customerId: string) {
  return `/payments?customer_id=${encodeURIComponent(customerId)}&filter=review`;
}

function ledgerEntryHref(entry: CustomerLedgerEntry) {
  if (entry.invoice_id) {
    return `/payments?invoice_id=${encodeURIComponent(entry.invoice_id)}`;
  }

  if (entry.type === "completed_service" && entry.job_id) {
    return `/closeouts?job_id=${encodeURIComponent(entry.job_id)}`;
  }

  if (entry.type === "scheduled_service" && entry.job_id) {
    return `/jobs?job_id=${encodeURIComponent(entry.job_id)}`;
  }

  return null;
}

function ledgerEntryActionLabel(entry: CustomerLedgerEntry) {
  if (entry.type === "scheduled_service") {
    return "View job";
  }

  if (entry.type === "completed_service") {
    return "View closeout";
  }

  if (entry.type === "paid_invoice") {
    return "View receipt";
  }

  if (
    entry.type === "needs_review_payment" ||
    entry.type === "partial_payment"
  ) {
    return "Review payment";
  }

  if (entry.type === "void_invoice") {
    return "View invoice";
  }

  return "Open invoice";
}

function ledgerEntryTone(entry: CustomerLedgerEntry): StatusPillTone {
  if (entry.type === "completed_service" || entry.type === "paid_invoice") {
    return "success";
  }

  if (
    entry.type === "partial_payment" ||
    entry.type === "needs_review_payment"
  ) {
    return "warning";
  }

  if (entry.type === "draft_invoice" || entry.type === "void_invoice") {
    return "neutral";
  }

  return "info";
}

function isServiceEntry(entry: CustomerLedgerEntry) {
  return (
    entry.type === "completed_service" || entry.type === "scheduled_service"
  );
}

function isOpenLedgerEntry(entry: CustomerLedgerEntry) {
  // Review-needed invoices still carry an open receivable, so they appear in both Open and Review.
  return (
    entry.type === "sent_invoice" ||
    entry.type === "partial_payment" ||
    entry.type === "needs_review_payment"
  );
}

function filterLedgerEntries(entries: CustomerLedgerEntry[], tab: LedgerTabId) {
  if (tab === "services") {
    return entries.filter(isServiceEntry);
  }

  if (tab === "invoices") {
    return entries.filter((entry) => Boolean(entry.invoice_id));
  }

  if (tab === "open") {
    return entries.filter(isOpenLedgerEntry);
  }

  if (tab === "review") {
    return entries.filter((entry) => entry.review);
  }

  return entries;
}

function accountFollowUpTone(
  status: CustomerAccountFollowUpStatus,
): StatusPillTone {
  if (!status.needsAttention) {
    return "success";
  }

  return status.id === "review_payment" || status.id === "open_balance"
    ? "warning"
    : "info";
}

function accountFollowUpHref(
  status: CustomerAccountFollowUpStatus,
  customerId: string,
) {
  if (status.id === "schedule_service") {
    return "/jobs";
  }

  if (status.id === "review_payment") {
    return customerReviewHref(customerId);
  }

  if (status.id === "ready_to_invoice" || status.id === "open_balance") {
    return customerBillingHref(customerId);
  }

  return null;
}

function accountFollowUpActionLabel(status: CustomerAccountFollowUpStatus) {
  if (status.id === "schedule_service") {
    return "Schedule job";
  }

  if (status.id === "review_payment") {
    return "Review payment";
  }

  if (status.id === "ready_to_invoice") {
    return "Create invoice";
  }

  if (status.id === "open_balance") {
    return "Open billing";
  }

  return null;
}

function customerToInput(customer: Customer): CustomerInput {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    property_type: customer.property_type,
    service_notes: customer.service_notes ?? "",
    locations: customer.locations?.map((location) => ({
      id: location.id,
      address: location.address,
      nickname: location.nickname ?? "",
      service_notes: location.service_notes ?? "",
      is_primary: location.is_primary,
    })) ?? [{ ...emptyLocation }],
  };
}

function emptyCustomerForm(): CustomerInput {
  return {
    ...emptyForm,
    locations: [{ ...emptyLocation }],
  };
}

function getPrimaryLocation(customer: Customer) {
  return (
    customer.locations?.find((location) => location.is_primary) ??
    customer.locations?.[0] ??
    null
  );
}

function customerContactLabel(customer: Customer) {
  return [customer.phone, customer.email].filter(Boolean).join(" | ");
}

function locationCountLabel(customer: Customer) {
  const count = customer.locations?.length ?? 0;

  return `${count} location${count === 1 ? "" : "s"}`;
}

function getCustomerFollowUpStatus(
  customer: Customer,
  invoices: Invoice[],
  jobs: Job[],
) {
  const entries = buildCustomerLedger({ customer, invoices, jobs });
  const summary = getCustomerLedgerSummary(entries);

  return getCustomerAccountFollowUpStatus(summary);
}

function CustomerFollowUpPill({
  customer,
  invoices,
  jobs,
}: {
  customer: Customer;
  invoices: Invoice[];
  jobs: Job[];
}) {
  const followUpStatus = useMemo(
    () => getCustomerFollowUpStatus(customer, invoices, jobs),
    [customer, invoices, jobs],
  );

  return (
    <StatusPill dot={false} tone={accountFollowUpTone(followUpStatus)}>
      {followUpStatus.label}
    </StatusPill>
  );
}

function CustomerListRow({
  customer,
  invoices,
  isSelected,
  jobs,
  onSelect,
}: {
  customer: Customer;
  invoices: Invoice[];
  isSelected: boolean;
  jobs: Job[];
  onSelect: () => void;
}) {
  const primaryLocation = getPrimaryLocation(customer);

  return (
    <button
      aria-label={`Select ${customer.name}`}
      aria-pressed={isSelected}
      className={`w-full rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2 ${
        isSelected
          ? "border-theme-action-primary bg-status-alert-info-bg shadow-sm"
          : "border-theme-border-subtle bg-theme-background-surface hover:bg-theme-background-subtle"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words text-base font-bold text-theme-text-primary">
              {customer.name}
            </span>
            <StatusPill dot={false} tone="neutral">
              {customer.property_type}
            </StatusPill>
          </div>
          <p className="mt-1 truncate text-sm text-theme-text-secondary">
            {customerContactLabel(customer) || "No contact saved"}
          </p>
          <p className="mt-1 truncate text-sm text-theme-text-secondary">
            {primaryLocation?.address ?? "No location saved"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {customer.status === "active" ? (
            <CustomerFollowUpPill
              customer={customer}
              invoices={invoices}
              jobs={jobs}
            />
          ) : (
            <StatusPill dot={false} tone="neutral">
              Archived
            </StatusPill>
          )}
          <span className="text-xs font-semibold text-theme-text-muted">
            {locationCountLabel(customer)}
          </span>
        </div>
      </div>
    </button>
  );
}

function CustomerAccountStatusCard({
  customer,
  status,
}: {
  customer: Customer;
  status: CustomerAccountFollowUpStatus;
}) {
  const href = accountFollowUpHref(status, customer.id);
  const actionLabel = accountFollowUpActionLabel(status);
  const tone = accountFollowUpTone(status);

  return (
    <Card
      aria-label={`Account follow-up for ${customer.name}`}
      className="mt-5 shadow-none"
      padding="sm"
      statusTone={tone}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Eyebrow tone="muted">Account follow-up</Eyebrow>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <StatusPill tone={tone}>{status.label}</StatusPill>
            <p className="text-sm text-theme-text-secondary">
              {status.summary}
            </p>
          </div>
        </div>
        {href && actionLabel ? (
          <Link
            className={buttonClassName({ size: "sm", variant: "text" })}
            href={href}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function CustomerLedgerSummary({
  customer,
  invoices,
  jobs,
}: {
  customer: Customer;
  invoices: Invoice[];
  jobs: Job[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<LedgerTabId>("all");
  const entries = useMemo(
    () => buildCustomerLedger({ customer, invoices, jobs }),
    [customer, invoices, jobs],
  );
  const summary = useMemo(() => getCustomerLedgerSummary(entries), [entries]);
  const recentEntries = entries.slice(0, 4);
  const visibleEntries = expanded
    ? filterLedgerEntries(entries, activeTab)
    : recentEntries;
  const tabCounts = useMemo(
    () =>
      ledgerTabs.reduce<Record<LedgerTabId, number>>(
        (counts, tab) => ({
          ...counts,
          [tab.id]: filterLedgerEntries(entries, tab.id).length,
        }),
        { all: 0, invoices: 0, open: 0, review: 0, services: 0 },
      ),
    [entries],
  );
  const activeTabLabel =
    ledgerTabs.find((tab) => tab.id === activeTab)?.label.toLowerCase() ??
    "ledger";
  const showExpandButton = entries.length > recentEntries.length;
  const ledgerTone: StatusPillTone =
    summary.reviewCount > 0 || summary.openBalanceCents > 0
      ? "warning"
      : summary.paidCents > 0
        ? "success"
        : "neutral";

  return (
    <Card className="mt-5 shadow-none" padding="md" statusTone={ledgerTone}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow tone="accent">Account ledger</Eyebrow>
          <p className="mt-1 text-sm text-theme-text-secondary">
            Latest service {formatDate(summary.latestServiceAt)}
          </p>
        </div>
        <Link
          className={buttonClassName({ size: "sm", variant: "text" })}
          href={customerBillingHref(customer.id)}
        >
          Open billing
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Open balance
          </dt>
          <dd className="mt-1 text-base font-bold text-theme-text-primary">
            {formatMoney(summary.openBalanceCents)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Paid total
          </dt>
          <dd className="mt-1 text-base font-bold text-theme-text-primary">
            {formatMoney(summary.paidCents)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Latest invoice
          </dt>
          <dd className="mt-1 text-base font-bold text-theme-text-primary">
            {formatDate(summary.latestInvoiceAt)}
          </dd>
        </div>
      </dl>

      {summary.reviewCount > 0 ? (
        <Card className="mt-3 shadow-none" padding="sm" statusTone="warning">
          <div className="flex flex-col gap-2 text-sm font-medium text-status-alert-warning-fg sm:flex-row sm:items-center sm:justify-between">
            <p>
              {summary.reviewCount} payment
              {summary.reviewCount === 1 ? "" : "s"} need
              {summary.reviewCount === 1 ? "s" : ""} review.
            </p>
            <Link
              className={buttonClassName({
                className:
                  "border-status-alert-warning-border text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg",
                size: "sm",
                variant: "ghost",
              })}
              href={customerReviewHref(customer.id)}
            >
              Review →
            </Link>
          </div>
        </Card>
      ) : null}

      {expanded ? (
        <div
          aria-label="Ledger filters"
          className="mt-4 flex flex-wrap gap-1.5"
          role="tablist"
        >
          {ledgerTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const badgeClass =
              tab.id === "review" && tabCounts.review > 0 && !isActive
                ? "bg-status-alert-warning-bg text-status-alert-warning-fg"
                : isActive
                  ? "bg-theme-background-surface/30 text-theme-text-inverse"
                  : "bg-primitive-slate-100 text-theme-text-muted";

            return (
              <button
                aria-selected={isActive}
                className={buttonClassName({
                  className: isActive
                    ? "rounded-full"
                    : "rounded-full border-transparent",
                  size: "sm",
                  variant: isActive ? "primary" : "text",
                })}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
                <span
                  className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${badgeClass}`}
                >
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-theme-text-secondary">
          No service or billing activity yet. Schedule a job, then create an
          invoice before sharing the portal.
        </p>
      ) : visibleEntries.length === 0 ? (
        <p className="py-4 text-center text-sm text-theme-text-muted">
          No {activeTabLabel} entries for this customer.
        </p>
      ) : (
        <ol
          className={`mt-4 divide-y divide-theme-border-subtle ${
            expanded && entries.length > 10
              ? "max-h-[480px] overflow-y-auto pr-2"
              : ""
          }`}
        >
          {visibleEntries.map((entry) => (
            <CustomerLedgerEntryRow entry={entry} key={entry.id} />
          ))}
        </ol>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {showExpandButton ? (
          <Button
            onClick={() => {
              setExpanded((current) => !current);
              setActiveTab("all");
            }}
            size="sm"
            variant="ghost"
          >
            {expanded ? "Hide activity ↑" : "Show all activity"}
          </Button>
        ) : (
          <span />
        )}
        <Link
          className={buttonClassName({ size: "sm", variant: "text" })}
          href={customerBillingHref(customer.id)}
        >
          Open billing
        </Link>
      </div>
    </Card>
  );
}

function CustomerAccountFollowUp({
  customer,
  invoices,
  jobs,
}: {
  customer: Customer;
  invoices: Invoice[];
  jobs: Job[];
}) {
  const entries = useMemo(
    () => buildCustomerLedger({ customer, invoices, jobs }),
    [customer, invoices, jobs],
  );
  const summary = useMemo(() => getCustomerLedgerSummary(entries), [entries]);
  const followUpStatus = useMemo(
    () => getCustomerAccountFollowUpStatus(summary),
    [summary],
  );

  return (
    <>
      <CustomerAccountStatusCard customer={customer} status={followUpStatus} />
      <CustomerPortalLinks
        accountSummary={summary}
        customerContact={{
          email: customer.email,
          phone: customer.phone,
        }}
        customerId={customer.id}
      />
      <CustomerLedgerSummary
        customer={customer}
        invoices={invoices}
        jobs={jobs}
      />
    </>
  );
}

function CustomerLedgerEntryRow({ entry }: { entry: CustomerLedgerEntry }) {
  const href = ledgerEntryHref(entry);
  const amountText =
    entry.amount_cents !== null
      ? formatMoney(entry.amount_cents)
      : entry.invoice_id
        ? "—"
        : null;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold ${
            entry.review
              ? "text-status-alert-warning-fg"
              : "text-theme-text-primary"
          }`}
        >
          <StatusPill tone={ledgerEntryTone(entry)}>{entry.label}</StatusPill>
        </p>
        <p className="mt-1 text-xs text-theme-text-secondary">{entry.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 text-left sm:items-end sm:text-right">
        <p className="text-xs font-medium text-theme-text-muted">
          {formatDate(entry.date)}
        </p>
        {amountText ? (
          <p
            className={`text-xs font-semibold ${
              entry.type === "void_invoice"
                ? "text-theme-text-muted/70 line-through"
                : "text-theme-text-primary"
            }`}
          >
            {amountText}
          </p>
        ) : null}
        {entry.balance_cents !== null && entry.balance_cents > 0 ? (
          <StatusPill dot={false} tone="warning">
            Balance {formatMoney(entry.balance_cents)}
          </StatusPill>
        ) : null}
        {href ? (
          <Link
            className={buttonClassName({ size: "sm", variant: "text" })}
            href={href}
          >
            {ledgerEntryActionLabel(entry)}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function CustomersClient({
  requestedCustomerId = null,
}: {
  requestedCustomerId?: string | null;
} = {}) {
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const invoicesQuery = useInvoices();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const archiveCustomer = useArchiveCustomer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [appliedRequestedCustomerId, setAppliedRequestedCustomerId] = useState<
    string | null
  >(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerInput>(emptyCustomerForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [archiveConfirmationId, setArchiveConfirmationId] = useState<
    string | null
  >(null);

  const visibleCustomers = useMemo(
    () => filterCustomers(customersQuery.data ?? [], search, status),
    [customersQuery.data, search, status],
  );
  const invoices = invoicesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const selectedCustomer = useMemo(() => {
    if (visibleCustomers.length === 0) {
      return null;
    }

    return (
      visibleCustomers.find((customer) => customer.id === selectedCustomerId) ??
      (requestedCustomerId
        ? visibleCustomers.find((customer) => customer.id === requestedCustomerId)
        : null) ??
      visibleCustomers[0] ??
      null
    );
  }, [requestedCustomerId, selectedCustomerId, visibleCustomers]);

  useEffect(() => {
    if (visibleCustomers.length === 0) {
      if (selectedCustomerId !== null) {
        setSelectedCustomerId(null);
      }

      return;
    }

    if (
      requestedCustomerId &&
      requestedCustomerId !== appliedRequestedCustomerId
    ) {
      const requestedCustomer = visibleCustomers.find(
        (customer) => customer.id === requestedCustomerId,
      );

      if (requestedCustomer) {
        setAppliedRequestedCustomerId(requestedCustomerId);
        setSelectedCustomerId(requestedCustomerId);
        return;
      }
    }

    if (!requestedCustomerId && appliedRequestedCustomerId) {
      setAppliedRequestedCustomerId(null);
    }

    if (
      !selectedCustomerId ||
      !visibleCustomers.some((customer) => customer.id === selectedCustomerId)
    ) {
      setSelectedCustomerId(visibleCustomers[0]?.id ?? null);
    }
  }, [
    appliedRequestedCustomerId,
    requestedCustomerId,
    selectedCustomerId,
    visibleCustomers,
  ]);

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  function resetForm() {
    setEditingCustomer(null);
    setForm(emptyCustomerForm());
    setFormError(null);
    setIsFormOpen(false);
  }

  function startNewCustomer() {
    setEditingCustomer(null);
    setForm(emptyCustomerForm());
    setFormError(null);
    setSaveMessage(null);
    setArchiveConfirmationId(null);
    setIsFormOpen(true);
  }

  function editCustomer(customer: Customer) {
    setEditingCustomer(customer);
    setForm(customerToInput(customer));
    setFormError(null);
    setSaveMessage(null);
    setArchiveConfirmationId(null);
    setIsFormOpen(true);
  }

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setEditingCustomer(null);
    setForm(emptyCustomerForm());
    setFormError(null);
    setSaveMessage(null);
    setArchiveConfirmationId(null);
    setIsFormOpen(false);
  }

  function updateLocation(
    index: number,
    update: Partial<CustomerLocationInput>,
  ) {
    setForm((current) => ({
      ...current,
      locations: current.locations.map((location, locationIndex) => {
        if (locationIndex !== index) {
          return update.is_primary
            ? { ...location, is_primary: false }
            : location;
        }

        return { ...location, ...update };
      }),
    }));
  }

  function removeLocation(index: number) {
    setForm((current) => {
      const remaining = current.locations.filter(
        (_, locationIndex) => locationIndex !== index,
      );

      return {
        ...current,
        locations: remaining.map((location, locationIndex) => ({
          ...location,
          is_primary: remaining.some((item) => item.is_primary)
            ? location.is_primary
            : locationIndex === 0,
        })),
      };
    });
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaveMessage(null);

    try {
      const input = validateCustomerInput(form);
      const isEditing = Boolean(editingCustomer);
      const editingCustomerId = editingCustomer?.id ?? null;
      let savedCustomer: Customer | null = null;

      if (editingCustomer) {
        savedCustomer = await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          input,
        });
      } else {
        savedCustomer = await createCustomer.mutateAsync(input);
      }

      resetForm();
      setSelectedCustomerId(savedCustomer?.id ?? editingCustomerId);
      setSaveMessage(isEditing ? updateSuccessMessage : createSuccessMessage);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save customer",
      );
    }
  }

  function confirmArchive(customerId: string) {
    setArchiveConfirmationId(null);
    if (editingCustomer?.id === customerId) {
      resetForm();
    }
    archiveCustomer.mutate(customerId);
  }

  const customerForm = isFormOpen ? (
    <Card className="h-fit" padding="none">
      <form
        className="flex h-fit flex-col gap-4 p-5"
        onSubmit={submitCustomer}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            {editingCustomer ? "Edit customer" : "Create customer"}
          </h2>
          <Button onClick={resetForm} variant="ghost">
            {editingCustomer ? "Cancel edit" : "Cancel"}
          </Button>
        </div>

        <details
          className="group rounded-md border border-theme-border-subtle bg-theme-background-subtle"
          open
        >
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-theme-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            Customer setup notes
          </summary>
          <div className="hidden border-t border-theme-border-subtle p-3 group-open:block">
            <p className="text-sm text-theme-text-secondary">
              Save the customer with one active service location, then schedule
              the first job.
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Use portal links after closeout and billing are ready.
            </p>
            <Link
              className={buttonClassName({
                className:
                  "mt-3 border-theme-border-subtle text-theme-text-secondary hover:bg-theme-background-subtle",
                size: "sm",
                variant: "ghost",
              })}
              href="/jobs"
            >
              Schedule job
            </Link>
          </div>
        </details>

        <label className={labelClassName}>
          Name
          <input
            className={fieldClassName}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            value={form.name}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClassName}>
            Phone
            <input
              className={fieldClassName}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              value={form.phone ?? ""}
            />
          </label>
          <label className={labelClassName}>
            Email
            <input
              className={fieldClassName}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              type="email"
              value={form.email ?? ""}
            />
          </label>
        </div>

        <label className={labelClassName}>
          Property type
          <select
            className={fieldClassName}
            onChange={(event) =>
              setForm({
                ...form,
                property_type: event.target.value as PropertyType,
              })
            }
            value={form.property_type}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className={labelClassName}>
          Service notes
          <textarea
            className={formTextareaClassName}
            onChange={(event) =>
              setForm({ ...form, service_notes: event.target.value })
            }
            value={form.service_notes ?? ""}
          />
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-theme-text-primary">
              Locations
            </h3>
            <Button
              onClick={() =>
                setForm({
                  ...form,
                  locations: [
                    ...form.locations,
                    {
                      ...emptyLocation,
                      is_primary: form.locations.length === 0,
                    },
                  ],
                })
              }
              size="sm"
              variant="ghost"
            >
              Add
            </Button>
          </div>

          {form.locations.map((location, index) => (
            <Card
              className="flex flex-col gap-3 shadow-none"
              key={location.id ?? index}
              padding="sm"
              tone="subtle"
            >
              <label className={labelClassName}>
                Address
                <input
                  className={fieldClassName}
                  onChange={(event) =>
                    updateLocation(index, { address: event.target.value })
                  }
                  value={location.address}
                />
              </label>
              <label className={labelClassName}>
                Nickname
                <input
                  className={fieldClassName}
                  onChange={(event) =>
                    updateLocation(index, { nickname: event.target.value })
                  }
                  value={location.nickname ?? ""}
                />
              </label>
              <label className={labelClassName}>
                Location notes
                <textarea
                  className={`${formTextareaClassName} min-h-20`}
                  onChange={(event) =>
                    updateLocation(index, {
                      service_notes: event.target.value,
                    })
                  }
                  value={location.service_notes ?? ""}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-theme-text-primary">
                  <input
                    checked={Boolean(location.is_primary)}
                    onChange={(event) =>
                      updateLocation(index, {
                        is_primary: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  Primary
                </label>
                <Button
                  onClick={() => removeLocation(index)}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {formError ? (
          <p className="text-sm text-status-alert-danger-fg">{formError}</p>
        ) : null}

        <Button disabled={isSaving} fullWidth size="lg" type="submit">
          {isSaving ? "Saving" : "Save customer"}
        </Button>
      </form>
    </Card>
  ) : null;

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="accent">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            Customers
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search customers"
            className={fieldClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Customer status"
            className={fieldClassName}
            onChange={(event) =>
              setStatus(event.target.value as CustomerStatus)
            }
            value={status}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Button onClick={startNewCustomer}>New customer</Button>
        </div>
      </header>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(26rem,1.1fr)]">
        <section
          aria-label="Customer list"
          className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow tone="accent">Customer list</Eyebrow>
              <h2 className="mt-1 text-2xl font-bold text-theme-text-primary">
                Account index
              </h2>
            </div>
            <StatusPill dot={false} tone="neutral">
              {visibleCustomers.length} {status}
            </StatusPill>
          </div>

          {customersQuery.isLoading ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              Loading customers
            </Card>
          ) : visibleCustomers.length === 0 ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              No customers found
            </Card>
          ) : (
            <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1 xl:max-h-[calc(100vh-12rem)]">
              {visibleCustomers.map((customer) => (
                <CustomerListRow
                  customer={customer}
                  invoices={invoices}
                  isSelected={selectedCustomer?.id === customer.id}
                  jobs={jobs}
                  key={customer.id}
                  onSelect={() => selectCustomer(customer.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section
          aria-label="Customer workspace"
          className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1"
        >
          {selectedCustomer ? (
            <>
              <Card padding="lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <Avatar name={selectedCustomer.name} size="lg" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-theme-text-primary">
                          {selectedCustomer.name}
                        </h2>
                        <StatusPill dot={false} tone="neutral">
                          {selectedCustomer.property_type}
                        </StatusPill>
                        {selectedCustomer.status === "archived" ? (
                          <StatusPill dot={false} tone="neutral">
                            Archived
                          </StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {customerContactLabel(selectedCustomer) ||
                          "No contact saved"}
                      </p>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {locationCountLabel(selectedCustomer)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      onClick={() => editCustomer(selectedCustomer)}
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    {selectedCustomer.status === "active" ? (
                      <Button
                        disabled={archiveCustomer.isPending}
                        onClick={() =>
                          setArchiveConfirmationId(selectedCustomer.id)
                        }
                        variant="danger"
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(selectedCustomer.locations ?? []).map((location) => (
                    <div
                      className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
                      key={location.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-theme-text-primary">
                          {location.nickname || "Service location"}
                        </p>
                        {location.is_primary ? (
                          <StatusPill dot={false} tone="info">
                            Primary
                          </StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {location.address}
                      </p>
                      {location.service_notes ? (
                        <p className="mt-1 text-xs text-theme-text-muted">
                          {location.service_notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {saveMessage ? (
                  <Card
                    className="mt-4 text-sm font-medium text-status-alert-success-fg shadow-none"
                    padding="sm"
                    role="status"
                    statusTone="success"
                  >
                    {saveMessage}
                  </Card>
                ) : null}

                {archiveConfirmationId === selectedCustomer.id ? (
                  <div
                    aria-label={`Confirm archive for ${selectedCustomer.name}`}
                    className="mt-4 rounded-md border border-status-alert-warning-border bg-status-alert-warning-bg p-3 text-sm"
                    role="group"
                  >
                    <p className="font-semibold text-status-alert-warning-fg">
                      Archive this customer?
                    </p>
                    <p className="mt-1 text-status-alert-warning-fg">
                      Archiving removes the customer from active scheduling and
                      portal-link handoff. Existing jobs, invoices, and service
                      history stay available for review.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        onClick={() => setArchiveConfirmationId(null)}
                        size="sm"
                        variant="ghost"
                      >
                        Cancel archive
                      </Button>
                      <Button
                        disabled={archiveCustomer.isPending}
                        onClick={() => confirmArchive(selectedCustomer.id)}
                        size="sm"
                        variant="danger"
                      >
                        Confirm archive
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>

              {customerForm}

              {selectedCustomer.status === "active" ? (
                <CustomerAccountFollowUp
                  customer={selectedCustomer}
                  invoices={invoices}
                  jobs={jobs}
                />
              ) : (
                <Card className="text-sm text-theme-text-secondary" padding="lg">
                  Archived customers keep contact and location details here.
                  Reactivate or create a new account before sharing portal
                  links, scheduling jobs, or building a billing ledger.
                </Card>
              )}
            </>
          ) : (
            <>
              <Card className="text-sm text-theme-text-secondary" padding="lg">
                Select a customer from the list to review account details, or
                create a new customer when the current filters have no matches.
              </Card>
              {customerForm}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
