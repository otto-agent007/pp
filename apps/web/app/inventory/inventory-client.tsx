"use client";

import {
  buildComplianceAdvisory,
  filterChemicalInventory,
  getInventorySummary,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
} from "@pest-patrol/domain";
import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLogInput,
  InventoryStatus,
  InventoryUnit,
  Job,
} from "@pest-patrol/types";
import { FormEvent, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import {
  useArchiveChemicalInventory,
  useChemicalInventory,
  useChemicalLogs,
  useCreateChemicalInventory,
  useCreateChemicalLog,
  useUpdateChemicalInventory,
} from "../../hooks/useInventory";

type InventoryStatusFilter = InventoryStatus | "all";

const emptyInventoryForm: ChemicalInventoryInput = {
  name: "",
  epa_number: "",
  current_stock: 0,
  unit: "oz",
  reorder_level: null,
};

const emptyLogForm: ChemicalLogInput = {
  job_id: "",
  chemical_id: "",
  amount_used: 0,
  notes: "",
};

const emptyInventoryItems: ChemicalInventoryItem[] = [];

function itemToInput(item: ChemicalInventoryItem): ChemicalInventoryInput {
  return {
    name: item.name,
    epa_number: item.epa_number ?? "",
    current_stock: item.current_stock,
    unit: item.unit,
    reorder_level: item.reorder_level,
  };
}

function jobLabel(job: Job) {
  const customer = job.customer?.name ?? "Unknown customer";
  const location = job.location?.address ?? "No location";
  const scheduled = new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(job.scheduled_start));

  return `${scheduled} - ${customer} - ${location}`;
}

export function InventoryClient() {
  const inventoryQuery = useChemicalInventory();
  const logsQuery = useChemicalLogs();
  const jobsQuery = useJobs();
  const createInventory = useCreateChemicalInventory();
  const updateInventory = useUpdateChemicalInventory();
  const archiveInventory = useArchiveChemicalInventory();
  const createLog = useCreateChemicalLog();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InventoryStatusFilter>("active");
  const [editingItem, setEditingItem] = useState<ChemicalInventoryItem | null>(null);
  const [inventoryForm, setInventoryForm] =
    useState<ChemicalInventoryInput>(emptyInventoryForm);
  const [logForm, setLogForm] = useState<ChemicalLogInput>(emptyLogForm);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const inventoryItems = inventoryQuery.data ?? emptyInventoryItems;
  const activeInventory = useMemo(
    () => inventoryItems.filter((item) => item.status === "active"),
    [inventoryItems],
  );
  const visibleInventory = useMemo(
    () => filterChemicalInventory(inventoryItems, search, status),
    [inventoryItems, search, status],
  );
  const summary = useMemo(() => getInventorySummary(inventoryItems), [inventoryItems]);
  const chemicalCompliancePreview = useMemo(
    () =>
      buildComplianceAdvisory({
        chemicalLog: logsQuery.data?.[0] ?? null,
        chunks: [],
        workflow: "chemical_application",
      }),
    [logsQuery.data],
  );
  const isSavingInventory = createInventory.isPending || updateInventory.isPending;

  function resetInventoryForm() {
    setEditingItem(null);
    setInventoryForm(emptyInventoryForm);
    setInventoryError(null);
  }

  function editInventoryItem(item: ChemicalInventoryItem) {
    setEditingItem(item);
    setInventoryForm(itemToInput(item));
    setInventoryError(null);
  }

  async function submitInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInventoryError(null);

    try {
      const input = validateChemicalInventoryInput(inventoryForm);

      if (editingItem) {
        await updateInventory.mutateAsync({ id: editingItem.id, input });
      } else {
        await createInventory.mutateAsync(input);
      }

      resetInventoryForm();
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : "Unable to save chemical");
    }
  }

  async function submitLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogError(null);

    try {
      const input = validateChemicalLogInput(logForm);
      await createLog.mutateAsync(input);
      setLogForm(emptyLogForm);
    } catch (error) {
      setLogError(error instanceof Error ? error.message : "Unable to log chemical use");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Inventory</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search inventory"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Inventory status"
            className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setStatus(event.target.value as InventoryStatusFilter)}
            value={status}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Active
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">{summary.activeCount}</p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Low stock
          </p>
          <p className="mt-2 text-2xl font-bold text-status-alert-danger-fg">{summary.lowStockCount}</p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Archived
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.archivedCount}
          </p>
        </div>
        <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Stock units
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {summary.totalStock}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-status-alert-warning-border bg-status-alert-warning-bg p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-status-alert-warning-fg">
              EPA/DPR compliance review
            </p>
            <p className="mt-1 text-sm text-status-alert-warning-fgStrong">
              Chemical logs now feed the California Compliance RAG lane. V1 keeps
              this advisory-only and flags missing evidence before closeout.
            </p>
          </div>
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-status-alert-warning-border bg-theme-background-surface px-3 text-sm font-semibold text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg"
            href="/compliance"
          >
            Open compliance
          </a>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {chemicalCompliancePreview.required_fields
            .filter((field) => field.status !== "present")
            .slice(0, 3)
            .map((field) => (
              <div
                className="rounded-md border border-status-alert-warning-border bg-theme-background-surface/80 p-3 text-sm"
                key={field.field}
              >
                <p className="font-semibold text-neutralDark">{field.label}</p>
                <p className="mt-1 text-status-alert-warning-fgStrong">{field.reason}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {inventoryQuery.isLoading ? (
            <p className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 text-sm text-theme-text-secondary">
              Loading inventory
            </p>
          ) : visibleInventory.length === 0 ? (
            <p className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 text-sm text-theme-text-secondary">
              No inventory found
            </p>
          ) : (
            visibleInventory.map((item) => {
              const isLowStock =
                item.status === "active" &&
                item.reorder_level !== null &&
                item.current_stock <= item.reorder_level;

              return (
                <article
                  className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
                  key={item.id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-neutralDark">
                          {item.name}
                        </h2>
                        {isLowStock ? (
                          <span className="rounded-md bg-status-alert-danger-bg px-2 py-1 text-xs font-medium text-status-alert-danger-fg">
                            Low stock
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {item.current_stock} {item.unit}
                        {item.reorder_level !== null
                          ? ` | Reorder at ${item.reorder_level} ${item.unit}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {item.epa_number ? `EPA ${item.epa_number}` : "No EPA number"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="min-h-10 rounded-md border border-theme-border-default px-3 text-sm font-medium text-neutralDark hover:bg-theme-background-subtle"
                        onClick={() => editInventoryItem(item)}
                        type="button"
                      >
                        Edit
                      </button>
                      {item.status === "active" ? (
                        <button
                          className="min-h-10 rounded-md border border-status-alert-danger-border px-3 text-sm font-medium text-status-alert-danger-fg hover:bg-status-alert-danger-bg"
                          disabled={archiveInventory.isPending}
                          onClick={() => archiveInventory.mutate(item.id)}
                          type="button"
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-6">
          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitInventory}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutralDark">
                {editingItem ? "Edit chemical" : "Add chemical"}
              </h2>
              {editingItem ? (
                <button
                  className="min-h-10 rounded-md border border-theme-border-default px-3 text-sm font-medium text-neutralDark hover:bg-theme-background-subtle"
                  onClick={resetInventoryForm}
                  type="button"
                >
                  New
                </button>
              ) : null}
            </div>

            {inventoryError ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                {inventoryError}
              </p>
            ) : null}

            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Name
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, name: event.target.value }))
                }
                value={inventoryForm.name}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              EPA number
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                onChange={(event) =>
                  setInventoryForm((current) => ({
                    ...current,
                    epa_number: event.target.value,
                  }))
                }
                value={inventoryForm.epa_number ?? ""}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                Stock
                <input
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                  min="0"
                  onChange={(event) =>
                    setInventoryForm((current) => ({
                      ...current,
                      current_stock: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={inventoryForm.current_stock}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                Unit
                <select
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                  onChange={(event) =>
                    setInventoryForm((current) => ({
                      ...current,
                      unit: event.target.value as InventoryUnit,
                    }))
                  }
                  value={inventoryForm.unit}
                >
                  <option value="oz">oz</option>
                  <option value="gal">gal</option>
                  <option value="lb">lb</option>
                  <option value="each">each</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                Reorder
                <input
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                  min="0"
                  onChange={(event) =>
                    setInventoryForm((current) => ({
                      ...current,
                      reorder_level:
                        event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={inventoryForm.reorder_level ?? ""}
                />
              </label>
            </div>

            <button
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-theme-text-inverse hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingInventory}
              type="submit"
            >
              Save chemical
            </button>
          </form>

          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitLog}
          >
            <h2 className="text-xl font-semibold text-neutralDark">Log usage</h2>
            {logError ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                {logError}
              </p>
            ) : null}

            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Job
              <select
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                onChange={(event) =>
                  setLogForm((current) => ({ ...current, job_id: event.target.value }))
                }
                value={logForm.job_id}
              >
                <option value="">Select job</option>
                {(jobsQuery.data ?? []).map((job) => (
                  <option key={job.id} value={job.id}>
                    {jobLabel(job)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Chemical
              <select
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                onChange={(event) =>
                  setLogForm((current) => ({
                    ...current,
                    chemical_id: event.target.value,
                  }))
                }
                value={logForm.chemical_id}
              >
                <option value="">Select chemical</option>
                {activeInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.current_stock} {item.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Amount used
              <input
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-primary"
                min="0"
                onChange={(event) =>
                  setLogForm((current) => ({
                    ...current,
                    amount_used: Number(event.target.value),
                  }))
                }
                type="number"
                value={logForm.amount_used}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Notes
              <textarea
                className="min-h-24 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-primary"
                onChange={(event) =>
                  setLogForm((current) => ({ ...current, notes: event.target.value }))
                }
                value={logForm.notes ?? ""}
              />
            </label>
            <button
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-theme-text-inverse hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createLog.isPending}
              type="submit"
            >
              Log chemical use
            </button>
          </form>

          <section className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-neutralDark">Recent usage</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(logsQuery.data ?? []).slice(0, 5).map((log) => (
                <article className="text-sm text-theme-text-secondary" key={log.id}>
                  <p className="font-medium text-neutralDark">
                    {log.chemical?.name ?? "Unknown chemical"}
                  </p>
                  <p>
                    {log.amount_used} {log.chemical?.unit ?? "units"} on{" "}
                    {log.job?.customer?.name ?? "unknown job"}
                  </p>
                </article>
              ))}
              {(logsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-theme-text-muted">No chemical use logged</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
