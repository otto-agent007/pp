"use client";

import {
  buildComplianceAdvisory,
  buildInventoryCockpitRows,
  filterChemicalInventory,
  getInventorySummary,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
} from "@pest-patrol/domain";
import {
  Button,
  Card,
  Eyebrow,
  SearchableSelect,
  StatTile,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
} from "@pest-patrol/ui";
import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLog,
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
const fieldClassName =
  "min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-normal text-theme-text-primary outline-none transition focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20";
const labelClassName =
  "flex flex-col gap-1 text-sm font-medium text-theme-text-primary";

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

function formatDateMedium(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function groupLogsByChemical(logs: ChemicalLog[]) {
  const logsByChemical = new Map<string, ChemicalLog[]>();

  for (const log of logs) {
    const chemicalLogs = logsByChemical.get(log.chemical_id) ?? [];
    chemicalLogs.push(log);
    logsByChemical.set(log.chemical_id, chemicalLogs);
  }

  for (const chemicalLogs of logsByChemical.values()) {
    chemicalLogs.sort(
      (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
    );
  }

  return logsByChemical;
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
  const [editingItem, setEditingItem] = useState<ChemicalInventoryItem | null>(
    null,
  );
  const [inventoryForm, setInventoryForm] =
    useState<ChemicalInventoryInput>(emptyInventoryForm);
  const [logForm, setLogForm] = useState<ChemicalLogInput>(emptyLogForm);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [expandedChemicalId, setExpandedChemicalId] = useState<string | null>(
    null,
  );
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null,
  );

  const inventoryItems = inventoryQuery.data ?? emptyInventoryItems;
  const canShowChemicalUsage = !logsQuery.isLoading && !logsQuery.error;
  const cockpitRows = useMemo(
    () => buildInventoryCockpitRows(inventoryItems, logsQuery.data ?? []),
    [inventoryItems, logsQuery.data],
  );
  const cockpitRowsById = useMemo(
    () => new Map(cockpitRows.map((row) => [row.id, row])),
    [cockpitRows],
  );
  const selectedCockpitRow = useMemo(() => {
    const selectedRow = selectedInventoryId
      ? cockpitRowsById.get(selectedInventoryId)
      : null;

    return (
      selectedRow ??
      cockpitRows.find((row) => row.stockState === "reorder") ??
      cockpitRows[0] ??
      null
    );
  }, [cockpitRows, cockpitRowsById, selectedInventoryId]);
  const logsByChemical = useMemo(
    () => groupLogsByChemical(logsQuery.data ?? []),
    [logsQuery.data],
  );
  const activeInventory = useMemo(
    () => inventoryItems.filter((item) => item.status === "active"),
    [inventoryItems],
  );
  const jobOptions = useMemo(
    () => [
      { label: "Select job", value: "" },
      ...(jobsQuery.data ?? []).map((job) => ({
        keywords: [
          job.customer?.name,
          job.location?.address,
          job.location?.nickname,
          job.service_notes,
        ].filter((item): item is string => Boolean(item)),
        label: jobLabel(job),
        value: job.id,
      })),
    ],
    [jobsQuery.data],
  );
  const chemicalOptions = useMemo(
    () => [
      { label: "Select chemical", value: "" },
      ...activeInventory.map((item) => ({
        keywords: [item.epa_number].filter((value): value is string =>
          Boolean(value),
        ),
        label: `${item.name} (${item.current_stock} ${item.unit})`,
        value: item.id,
      })),
    ],
    [activeInventory],
  );
  const visibleInventory = useMemo(
    () => filterChemicalInventory(inventoryItems, search, status),
    [inventoryItems, search, status],
  );
  const summary = useMemo(
    () => getInventorySummary(inventoryItems),
    [inventoryItems],
  );
  const lowStockSummaryTone = summary.lowStockCount > 0 ? "danger" : "neutral";
  const lowStockSummaryDetail =
    summary.lowStockCount > 0 ? "Needs reorder review" : "No reorder alerts";
  const lowStockItems = useMemo(
    () =>
      visibleInventory.filter(
        (item) =>
          item.status === "active" &&
          item.reorder_level !== null &&
          item.current_stock <= item.reorder_level,
      ),
    [visibleInventory],
  );
  const chemicalCompliancePreview = useMemo(
    () =>
      buildComplianceAdvisory({
        chemicalLog: logsQuery.data?.[0] ?? null,
        chunks: [],
        workflow: "chemical_application",
      }),
    [logsQuery.data],
  );
  const isSavingInventory =
    createInventory.isPending || updateInventory.isPending;

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
      setInventoryError(
        error instanceof Error ? error.message : "Unable to save chemical",
      );
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
      setLogError(
        error instanceof Error ? error.message : "Unable to log chemical use",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="inverse">Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-neutralDark">Inventory</h1>
          <p className="mt-2 max-w-3xl text-sm text-theme-text-secondary">
            Stock, EPA labels, and field usage in one scan-first operations
            view.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search inventory"
            className={fieldClassName}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Inventory status"
            className={fieldClassName}
            onChange={(event) =>
              setStatus(event.target.value as InventoryStatusFilter)
            }
            value={status}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          detail="Ready to assign"
          label="Active"
          tone="success"
          value={summary.activeCount}
        />
        <StatTile
          detail={lowStockSummaryDetail}
          label="Low stock"
          tone={lowStockSummaryTone}
          value={summary.lowStockCount}
        />
        <StatTile
          detail="Hidden from field use"
          label="Archived"
          tone="neutral"
          value={summary.archivedCount}
        />
        <StatTile
          detail="Across active catalog"
          label="Stock units"
          tone="info"
          value={summary.totalStock}
        />
      </section>

      <Card
        className="shadow-sm"
        padding="md"
        statusTone="warning"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <Eyebrow className="text-status-alert-warning-fg">
              EPA/DPR compliance review
            </Eyebrow>
            <p className="mt-1 text-sm text-status-alert-warning-fgStrong">
              Chemical logs now feed the California Compliance RAG lane. V1
              keeps this advisory-only and flags missing evidence before
              closeout.
            </p>
          </div>
          <a
            className={buttonClassName({
              className:
                "border-status-alert-warning-border text-status-alert-warning-fgStrong hover:bg-status-alert-warning-bg",
              variant: "ghost",
            })}
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
                className={`rounded-md border p-3 text-sm ${statusSurfaceClassName(
                  "warning",
                )}`}
                key={field.field}
              >
                <p className="font-semibold text-neutralDark">{field.label}</p>
                <p className="mt-1 text-status-alert-warning-fgStrong">
                  {field.reason}
                </p>
              </div>
            ))}
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow tone="danger">Low-stock review</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-neutralDark">
              Reorder watchlist
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-theme-text-secondary">
            Keep the field team moving by catching products at or below reorder
            before closeout proof gets blocked.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lowStockItems.length > 0 ? (
            lowStockItems.map((item) => {
              const latestLog = logsByChemical.get(item.id)?.[0] ?? null;

              return (
                <Card
                  className="shadow-none"
                  key={item.id}
                  padding="sm"
                  statusTone="danger"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutralDark">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-status-alert-danger-fg">
                        {item.current_stock} {item.unit} on hand
                        {item.reorder_level !== null
                          ? ` / reorder at ${item.reorder_level}`
                          : ""}
                      </p>
                      {canShowChemicalUsage ? (
                        <p className="mt-1 text-xs font-medium text-theme-text-muted">
                          {latestLog
                            ? `Last used ${formatDateMedium(
                                latestLog.created_at,
                              )} - ${
                                latestLog.job?.customer?.name ?? "unknown job"
                              }`
                            : "No uses logged - inspect for aging stock"}
                        </p>
                      ) : null}
                    </div>
                    <StatusPill tone="danger">Reorder</StatusPill>
                  </div>
                </Card>
              );
            })
          ) : (
            <p
              className={`rounded-md border border-dashed p-4 text-sm text-theme-text-secondary md:col-span-2 xl:col-span-3 ${statusSurfaceClassName(
                "success",
              )}`}
            >
              No products are at reorder level. Keep logging usage after each
              service to preserve this signal.
            </p>
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-3">
          {inventoryQuery.isLoading ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              Loading inventory
            </Card>
          ) : visibleInventory.length === 0 ? (
            <Card className="text-sm text-theme-text-secondary" padding="lg">
              No inventory found
            </Card>
          ) : (
            visibleInventory.map((item) => {
              const isLowStock =
                item.status === "active" &&
                item.reorder_level !== null &&
                item.current_stock <= item.reorder_level;
              const chemicalLogs = logsByChemical.get(item.id) ?? [];
              const isExpanded = expandedChemicalId === item.id;
              const isSelected = selectedCockpitRow?.id === item.id;

              return (
                <Card
                  key={item.id}
                  className={`${
                    isLowStock
                      ? "min-w-0 border-status-alert-danger-border bg-status-alert-danger-bg"
                      : "min-w-0"
                  } ${
                    isSelected
                      ? "ring-2 ring-theme-action-primary/30"
                      : ""
                  }`}
                  padding="lg"
                  role="article"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-lg font-semibold text-neutralDark">
                          {item.name}
                        </h2>
                        {isLowStock ? (
                          <StatusPill tone="danger">Low stock</StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {item.current_stock} {item.unit}
                        {item.reorder_level !== null
                          ? ` | Reorder at ${item.reorder_level} ${item.unit}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {item.epa_number
                          ? `EPA ${item.epa_number}`
                          : "No EPA number"}
                      </p>
                      {canShowChemicalUsage ? (
                        <p
                          className={
                            chemicalLogs.length > 0
                              ? "mt-1 text-sm text-theme-text-secondary"
                              : "mt-1 text-sm text-theme-text-muted"
                          }
                        >
                          {chemicalLogs.length === 0
                            ? "No uses logged yet"
                            : `${chemicalLogs.length} use${
                                chemicalLogs.length === 1 ? "" : "s"
                              } logged`}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        aria-label={`Inspect ${item.name}`}
                        onClick={() => setSelectedInventoryId(item.id)}
                        variant="ghost"
                      >
                        {isSelected ? "Selected" : "Inspect"}
                      </Button>
                      <Button
                        onClick={() => editInventoryItem(item)}
                        variant="ghost"
                      >
                        Edit
                      </Button>
                      {item.status === "active" ? (
                        <Button
                          disabled={archiveInventory.isPending}
                          onClick={() => archiveInventory.mutate(item.id)}
                          variant="danger"
                        >
                          Archive
                        </Button>
                      ) : null}
                      {canShowChemicalUsage && chemicalLogs.length > 0 ? (
                        <Button
                          aria-label={
                            isExpanded
                              ? `Collapse uses for ${item.name}`
                              : `View uses for ${item.name}`
                          }
                          onClick={() =>
                            setExpandedChemicalId(isExpanded ? null : item.id)
                          }
                          variant="ghost"
                        >
                          {isExpanded ? "Collapse" : "View uses"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="mt-4 rounded-md border border-theme-border-subtle bg-theme-background-surface/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                        Recent uses
                      </p>
                      <div className="mt-3 grid gap-2">
                        {chemicalLogs.slice(0, 3).map((log) => (
                          <div
                            className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                            key={log.id}
                          >
                            <p className="font-medium text-theme-text-primary">
                              {log.job?.customer?.name ?? "Unknown customer"}
                            </p>
                            <p className="text-theme-text-secondary">
                              {log.amount_used} {item.unit} -{" "}
                              {formatDateMedium(log.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card
            padding="lg"
            statusTone={selectedCockpitRow?.statusTone ?? "neutral"}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Product cockpit</Eyebrow>
                <h2 className="mt-1 text-xl font-semibold text-neutralDark">
                  {selectedCockpitRow
                    ? `${selectedCockpitRow.item.name} selected`
                    : "Select product"}
                </h2>
              </div>
              {selectedCockpitRow ? (
                <StatusPill tone={selectedCockpitRow.statusTone}>
                  {selectedCockpitRow.nextActionLabel}
                </StatusPill>
              ) : null}
            </div>
            {selectedCockpitRow ? (
              <div className="mt-4 grid gap-3 text-sm text-theme-text-secondary">
                <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface/80 p-3">
                  <p className="font-semibold text-neutralDark">
                    {selectedCockpitRow.item.current_stock}{" "}
                    {selectedCockpitRow.item.unit} on hand
                  </p>
                  <p className="mt-1">
                    {selectedCockpitRow.item.reorder_level !== null
                      ? `Reorder threshold ${selectedCockpitRow.item.reorder_level} ${selectedCockpitRow.item.unit}`
                      : "No reorder threshold set"}
                  </p>
                </div>
                <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface/80 p-3">
                  <p className="font-semibold text-neutralDark">
                    Usage evidence: {selectedCockpitRow.usageCount}
                  </p>
                  <p className="mt-1">
                    {selectedCockpitRow.latestCustomerName
                      ? `Latest evidence: ${selectedCockpitRow.latestCustomerName}`
                      : "No recent usage evidence"}
                  </p>
                </div>
                <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface/80 p-3">
                  <p className="font-semibold text-neutralDark">
                    {selectedCockpitRow.hasEpaNumber
                      ? `EPA ${selectedCockpitRow.item.epa_number}`
                      : "EPA detail missing"}
                  </p>
                  <p className="mt-1">
                    {selectedCockpitRow.hasEpaNumber
                      ? "Compliance-ready for field logs"
                      : "Add EPA detail before relying on closeout proof"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-theme-text-secondary">
                Select a product to review stock, usage, and compliance
                signals.
              </p>
            )}
          </Card>

          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitInventory}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutralDark">
                {editingItem ? "Edit chemical" : "Add chemical"}
              </h2>
              {editingItem ? (
                <Button onClick={resetInventoryForm} variant="ghost">
                  New
                </Button>
              ) : null}
            </div>

            {inventoryError ? (
              <Card
                className="text-sm text-status-alert-danger-fg shadow-none"
                padding="sm"
                role="alert"
                statusTone="danger"
              >
                {inventoryError}
              </Card>
            ) : null}

            <label className={labelClassName}>
              Name
              <input
                className={fieldClassName}
                onChange={(event) =>
                  setInventoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={inventoryForm.name}
              />
            </label>
            <label className={labelClassName}>
              EPA number
              <input
                className={fieldClassName}
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
              <label className={labelClassName}>
                Stock
                <input
                  className={fieldClassName}
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
              <label className={labelClassName}>
                Unit
                <select
                  className={fieldClassName}
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
              <label className={labelClassName}>
                Reorder
                <input
                  className={fieldClassName}
                  min="0"
                  onChange={(event) =>
                    setInventoryForm((current) => ({
                      ...current,
                      reorder_level:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={inventoryForm.reorder_level ?? ""}
                />
              </label>
            </div>

            <Button
              disabled={isSavingInventory}
              fullWidth
              size="lg"
              type="submit"
            >
              Save chemical
            </Button>
          </form>

          <form
            className="flex flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitLog}
          >
            <h2 className="text-xl font-semibold text-neutralDark">
              Log usage
            </h2>
            {logError ? (
              <Card
                className="text-sm text-status-alert-danger-fg shadow-none"
                padding="sm"
                role="alert"
                statusTone="danger"
              >
                {logError}
              </Card>
            ) : null}

            <SearchableSelect
              ariaLabel="Job"
              emptyMessage="No jobs found"
              label="Job"
              onChange={(jobId) =>
                setLogForm((current) => ({
                  ...current,
                  job_id: jobId,
                }))
              }
              options={jobOptions}
              value={logForm.job_id}
            />
            <SearchableSelect
              ariaLabel="Chemical"
              emptyMessage="No active chemicals found"
              label="Chemical"
              onChange={(chemicalId) =>
                setLogForm((current) => ({
                  ...current,
                  chemical_id: chemicalId,
                }))
              }
              options={chemicalOptions}
              value={logForm.chemical_id}
            />
            <label className={labelClassName}>
              Amount used
              <input
                className={fieldClassName}
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
            <label className={labelClassName}>
              Notes
              <textarea
                className={`${fieldClassName} min-h-24 py-2`}
                onChange={(event) =>
                  setLogForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                value={logForm.notes ?? ""}
              />
            </label>
            <Button
              disabled={createLog.isPending}
              fullWidth
              size="lg"
              type="submit"
            >
              Log chemical use
            </Button>
          </form>

          <Card padding="lg">
            <h2 className="text-xl font-semibold text-neutralDark">
              Recent usage
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {(logsQuery.data ?? []).slice(0, 5).map((log) => (
                <article
                  className="text-sm text-theme-text-secondary"
                  key={log.id}
                >
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
                <p className="text-sm text-theme-text-muted">
                  No chemical use logged
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
