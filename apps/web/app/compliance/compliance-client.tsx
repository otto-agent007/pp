"use client";

import {
  buildChemicalProductBinder,
  buildComplianceAdvisory,
  buildComplianceNeedsReviewQueue,
  complianceSourceAnchors,
  evaluateComplianceAdvisory,
  filterChemicalProductBinderItems,
  filterComplianceReviewItems,
  getChemicalProductBinderSummary,
  getComplianceKnowledgeBaseReadiness,
  getComplianceMultiUnitAuditSummary,
  getComplianceNeedsReviewSummary,
  getComplianceSchemaUnavailableReadiness,
} from "@pest-patrol/domain";
import type {
  ChemicalProductBinderFilter,
  ChemicalProductBinderItem,
  ComplianceReviewItem,
  ComplianceReviewItemCategory,
  ComplianceReviewItemFilter,
  ComplianceReviewItemSeverity,
} from "@pest-patrol/domain";
import type {
  ChemicalInventoryItem,
  ChemicalLog,
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSetupReadiness,
  ComplianceSource,
  ComplianceWorkflow,
  Job,
} from "@pest-patrol/types";
import {
  Button,
  Eyebrow,
  StatTile,
  StatusPill,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { FormEvent, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import { useChemicalInventory, useChemicalLogs } from "../../hooks/useInventory";
import {
  type ComplianceAdvisoryResponse,
  useComplianceAdvisoryAudits,
  useComplianceChunks,
  useComplianceDocuments,
  useComplianceSources,
  useCreateComplianceAdvisory,
  isComplianceSchemaUnavailableError,
} from "../../hooks/useCompliance";
import { adminWorkspaceClassName } from "../admin-workspace";

const workflowOptions: Array<{ label: string; value: ComplianceWorkflow }> = [
  { label: "Chemical EPA/DPR", value: "chemical_application" },
  { label: "Recurring routes", value: "recurring_route" },
  { label: "WDO / Branch 3", value: "wdo_branch3" },
  { label: "Multi-unit audits", value: "multi_unit_audit" },
];

const reviewFilterOptions: Array<{
  filter: ComplianceReviewItemFilter;
  label: string;
}> = [
  { filter: "all", label: "All" },
  { filter: "critical", label: "Critical" },
  { filter: "chemical", label: "Chemical" },
  { filter: "wdo", label: "WDO" },
  { filter: "source", label: "Sources" },
  { filter: "advisory", label: "Advisory" },
];

const binderFilterOptions: Array<{
  filter: ChemicalProductBinderFilter;
  label: string;
}> = [
  { filter: "all", label: "All" },
  { filter: "needs_review", label: "Needs review" },
  { filter: "missing_epa", label: "Missing EPA #" },
  { filter: "license_review", label: "License review" },
  { filter: "low_stock", label: "Low stock" },
];

const emptySources: ComplianceSource[] = [];
const emptyDocuments: ComplianceDocument[] = [];
const emptyChunks: ComplianceChunk[] = [];
const emptyAudits: ComplianceAdvisoryAudit[] = [];
const emptyJobs: Job[] = [];
const emptyLogs: ChemicalLog[] = [];
const emptyInventory: ChemicalInventoryItem[] = [];

type ComplianceRuntime = ComplianceAdvisoryResponse["runtime"];

function formatWorkflow(value: ComplianceWorkflow) {
  return (
    workflowOptions.find((workflow) => workflow.value === value)?.label ?? value
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  return value ? formatDate(value) : "Not retrieved";
}

function statusTone(status: ComplianceAdvisory["status"]) {
  if (status === "advisory_ready") {
    return "border-status-alert-success-border bg-status-alert-success-bg text-status-alert-success-fg";
  }

  if (status === "rag_disabled") {
    return "border-status-alert-warning-border bg-status-alert-warning-bg text-status-alert-warning-fg";
  }

  return "border-status-alert-danger-border bg-status-alert-danger-bg text-status-alert-danger-fg";
}

function evaluationTone(
  status: ReturnType<typeof evaluateComplianceAdvisory>["status"],
) {
  if (status === "ready") {
    return "border-status-alert-success-border bg-status-alert-success-bg text-status-alert-success-fg";
  }

  if (status === "operator_review_required") {
    return "border-status-alert-warning-border bg-status-alert-warning-bg text-status-alert-warning-fg";
  }

  return "border-status-alert-danger-border bg-status-alert-danger-bg text-status-alert-danger-fg";
}

function readinessTone(status: string): StatusPillTone {
  if (status === "ready" || status === "advisory_ready") {
    return "success";
  }

  if (status === "rag_disabled" || status === "operator_review_required") {
    return "warning";
  }

  if (status.includes("missing") || status.includes("not_configured")) {
    return "danger";
  }

  return "warning";
}

function reviewSeverityTone(
  severity: ComplianceReviewItemSeverity,
): StatusPillTone {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

function reviewCategoryLabel(category: ComplianceReviewItemCategory) {
  if (category === "chemical") return "Chemical";
  if (category === "wdo") return "WDO";
  if (category === "source") return "Sources";
  return "Advisory";
}

function binderStatusTone(status: ChemicalProductBinderItem["status"]) {
  if (status === "critical_review") return "danger";
  if (status === "review_recommended") return "warning";
  return "success";
}

function binderStatusLabel(status: ChemicalProductBinderItem["status"]) {
  if (status === "critical_review") return "critical review";
  if (status === "review_recommended") return "review recommended";
  return "clear";
}

function formatStock(item: ChemicalProductBinderItem) {
  if (item.currentStock === null) return "Stock not tracked";

  return `${item.currentStock} ${item.unit ?? ""}`.trim();
}

function runtimeCopy(runtime: ComplianceRuntime) {
  if (runtime.available) {
    return "Runtime: OpenAI retrieval available.";
  }

  return `Runtime: RAG disabled - ${
    runtime.reason ?? `${runtime.requiredEnvName} is not configured`
  }.`;
}

function advisoryErrorCopy(caught: unknown) {
  const message =
    caught instanceof Error
      ? caught.message
      : "Unable to create compliance advisory";

  if (
    /supabase|schema|relation|service-role|service role|OPENAI_API_KEY/i.test(
      message,
    )
  ) {
    return "Compliance advisory runtime is unavailable. Check setup readiness and try again after approved admin configuration is available.";
  }

  return message;
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
      {children}
    </p>
  );
}

function ReviewItemCard({ item }: { item: ComplianceReviewItem }) {
  return (
    <article
      className={`rounded-md border p-4 text-sm shadow-sm ${statusSurfaceClassName(
        reviewSeverityTone(item.severity),
      )}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-theme-text-primary">{item.title}</p>
          <p className="mt-1 text-theme-text-secondary">{item.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill dot={false} tone={reviewSeverityTone(item.severity)}>
            {item.severity}
          </StatusPill>
          <StatusPill dot={false} tone="neutral">
            {reviewCategoryLabel(item.category)}
          </StatusPill>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-theme-text-muted">
        <span>{formatWorkflow(item.workflow)}</span>
        {item.customerName ? <span>{item.customerName}</span> : null}
        {item.jobId ? <span>Job {item.jobId}</span> : null}
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
          Missing evidence
        </p>
        <ul className="mt-2 grid gap-1 text-theme-text-secondary sm:grid-cols-2">
          {item.missingEvidence.map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-theme-text-secondary">{item.nextAction}</p>
      {item.jobHref ? (
        <a
          className="mt-3 inline-flex text-sm font-semibold text-theme-action-primary hover:underline"
          href={item.jobHref}
        >
          Open linked job
        </a>
      ) : null}
    </article>
  );
}

function ChemicalProductBinderCard({
  item,
}: {
  item: ChemicalProductBinderItem;
}) {
  return (
    <article
      className={`rounded-md border p-4 text-sm shadow-sm ${statusSurfaceClassName(
        binderStatusTone(item.status),
      )}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-theme-text-primary">
            {item.productName}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill dot={false} tone={binderStatusTone(item.status)}>
              {binderStatusLabel(item.status)}
            </StatusPill>
            <StatusPill dot={false} tone={item.lowStock ? "warning" : "info"}>
              {item.sourceReadinessLabel}
            </StatusPill>
          </div>
        </div>
        <a
          className="inline-flex min-h-9 items-center text-sm font-semibold text-theme-action-primary hover:underline"
          href={`/inventory?chemical_id=${encodeURIComponent(item.chemicalId)}`}
        >
          Open product
        </a>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            EPA number
          </p>
          {item.epaRegistrationNumber ? (
            <p className="mt-1 font-semibold text-theme-text-primary">
              {item.epaRegistrationNumber}
            </p>
          ) : (
            <StatusPill className="mt-1" dot={false} tone="warning">
              Missing EPA #
            </StatusPill>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Current stock
          </p>
          <p className="mt-1 font-semibold text-theme-text-primary">
            {formatStock(item)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Recent usage
          </p>
          <p className="mt-1 font-semibold text-theme-text-primary">
            {item.recentUsageCount} log
            {item.recentUsageCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
          Missing evidence
        </p>
        {item.missingLabels.length === 0 ? (
          <p className="mt-2 text-theme-text-secondary">
            No missing evidence labels for this product.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.missingLabels.map((label) => (
              <StatusPill key={label} dot={false} tone="warning">
                {label}
              </StatusPill>
            ))}
            {item.unknownLicenseReviewCount > 0 ? (
              <StatusPill dot={false} tone="warning">
                operator review required
              </StatusPill>
            ) : null}
          </div>
        )}
      </div>

      <p className="mt-4 text-theme-text-secondary">{item.nextStep}</p>

      {item.recentLogs.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Recent logs
          </p>
          <ul className="mt-2 grid gap-2">
            {item.recentLogs.map((log) => (
              <li
                className="rounded-md border border-theme-border-default bg-theme-background-surface px-3 py-2"
                key={log.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-theme-text-primary">
                    {log.amountUsed} {log.unit ?? item.unit ?? ""}
                  </span>
                  <span className="text-xs text-theme-text-muted">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-theme-text-secondary">
                  {log.customerName ?? "Customer not attached"} -{" "}
                  {log.targetSiteLabel ?? "Target site missing"}
                </p>
                {log.jobHref ? (
                  <a
                    className="mt-2 inline-flex text-xs font-semibold text-theme-action-primary hover:underline"
                    href={log.jobHref}
                  >
                    Open linked job
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function ComplianceClient() {
  const sourcesQuery = useComplianceSources();
  const documentsQuery = useComplianceDocuments();
  const chunksQuery = useComplianceChunks();
  const auditsQuery = useComplianceAdvisoryAudits();
  const jobsQuery = useJobs();
  const inventoryQuery = useChemicalInventory();
  const logsQuery = useChemicalLogs();
  const createAdvisory = useCreateComplianceAdvisory();
  const [workflow, setWorkflow] = useState<ComplianceWorkflow>(
    "chemical_application",
  );
  const [reviewFilter, setReviewFilter] =
    useState<ComplianceReviewItemFilter>("all");
  const [binderFilter, setBinderFilter] =
    useState<ChemicalProductBinderFilter>("all");
  const [prompt, setPrompt] = useState(
    "Review this workflow for missing California structural pest compliance evidence.",
  );
  const [advisory, setAdvisory] = useState<ComplianceAdvisory | null>(null);
  const [advisoryRuntime, setAdvisoryRuntime] =
    useState<ComplianceRuntime | null>(null);
  const [advisorySetup, setAdvisorySetup] =
    useState<ComplianceSetupReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schemaUnavailableFromQuery = [
    sourcesQuery.error,
    documentsQuery.error,
    chunksQuery.error,
    auditsQuery.error,
  ].some(isComplianceSchemaUnavailableError);
  const setupReadiness =
    schemaUnavailableFromQuery || advisorySetup?.status === "schema_unavailable"
      ? advisorySetup?.status === "schema_unavailable"
        ? advisorySetup
        : getComplianceSchemaUnavailableReadiness()
      : null;
  const sources = sourcesQuery.data ?? emptySources;
  const documents = documentsQuery.data ?? emptyDocuments;
  const chunks = chunksQuery.data ?? emptyChunks;
  const audits = auditsQuery.data ?? emptyAudits;
  const jobs = jobsQuery.data ?? emptyJobs;
  const inventory = inventoryQuery.data ?? emptyInventory;
  const logs = logsQuery.data ?? emptyLogs;
  const reviewedSources = sources.filter(
    (source) => source.review_status === "reviewed",
  );
  const reviewQueue = useMemo(
    () =>
      buildComplianceNeedsReviewQueue({
        audits,
        chemicalLogs: logs,
        chunks,
        documents,
        jobs,
        sources,
      }),
    [audits, chunks, documents, jobs, logs, sources],
  );
  const reviewSummary = useMemo(
    () => getComplianceNeedsReviewSummary(reviewQueue),
    [reviewQueue],
  );
  const filteredReviewItems = useMemo(
    () => filterComplianceReviewItems(reviewQueue, reviewFilter),
    [reviewFilter, reviewQueue],
  );
  const knowledgeBaseReadiness = useMemo(
    () =>
      getComplianceKnowledgeBaseReadiness({
        chunks,
        documents,
        sources,
      }),
    [chunks, documents, sources],
  );
  const chemicalProductBinder = useMemo(
    () =>
      buildChemicalProductBinder({
        chemicalLogs: logs,
        chunks,
        documents,
        inventory,
        sources,
      }),
    [chunks, documents, inventory, logs, sources],
  );
  const chemicalProductBinderSummary = useMemo(
    () => getChemicalProductBinderSummary(chemicalProductBinder),
    [chemicalProductBinder],
  );
  const filteredBinderItems = useMemo(
    () => filterChemicalProductBinderItems(chemicalProductBinder, binderFilter),
    [binderFilter, chemicalProductBinder],
  );
  const chemicalReadiness = useMemo(
    () =>
      buildComplianceAdvisory({
        chemicalLog: logs[0] ?? null,
        chunks: chunks.slice(0, 2),
        workflow: "chemical_application",
      }),
    [chunks, logs],
  );
  const recurringReadiness = useMemo(
    () =>
      buildComplianceAdvisory({
        chunks: chunks.filter(
          (chunk) => chunk.source?.workflow === "recurring_route",
        ),
        job: jobs.find((job) => job.status === "completed") ?? jobs[0] ?? null,
        workflow: "recurring_route",
      }),
    [chunks, jobs],
  );
  const multiUnitSummary = useMemo(
    () => getComplianceMultiUnitAuditSummary([], []),
    [],
  );
  const advisoryEvaluation = useMemo(
    () => (advisory ? evaluateComplianceAdvisory(advisory) : null),
    [advisory],
  );

  async function submitAdvisory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await createAdvisory.mutateAsync({
        prompt,
        workflow,
      });

      setAdvisory(result.advisory);
      setAdvisoryRuntime(result.runtime);
      setAdvisorySetup(result.setup ?? null);
    } catch (caught) {
      setAdvisoryRuntime(null);
      setError(advisoryErrorCopy(caught));
    }
  }

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>California compliance</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            Compliance Command Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-theme-text-secondary">
            Deterministic operator review queue for chemical-use records, WDO
            Branch 3 evidence, source readiness, and advisory audit follow-up.
          </p>
        </div>
      </header>

      {setupReadiness ? (
        <section
          className={`rounded-lg border p-4 text-sm text-status-alert-warning-fgStrong shadow-sm ${statusSurfaceClassName(
            "warning",
          )}`}
        >
          <h2 className="text-base font-semibold text-status-alert-warning-fgStrong">
            Compliance setup required
          </h2>
          <p className="mt-1">{setupReadiness.reason}</p>
          <p className="mt-2 text-status-alert-warning-fg">
            Source-backed advisories stay disabled until the operator-approved
            migration is applied; no raw Supabase error details are shown here.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <Eyebrow tone="accent">Command center snapshot</Eyebrow>
        <div className="grid gap-3 md:grid-cols-5">
          <StatTile
            label="Open review items"
            tone={reviewSummary.openItems > 0 ? "warning" : "success"}
            value={reviewSummary.openItems}
          />
          <StatTile
            label="Critical items"
            tone={reviewSummary.criticalItems > 0 ? "danger" : "success"}
            value={reviewSummary.criticalItems}
          />
          <StatTile
            label="Chemical review items"
            tone={reviewSummary.chemicalItems > 0 ? "warning" : "success"}
            value={reviewSummary.chemicalItems}
          />
          <StatTile
            label="WDO / Branch 3 items"
            tone={reviewSummary.wdoItems > 0 ? "warning" : "success"}
            value={reviewSummary.wdoItems}
          />
          <StatTile
            label="Source readiness items"
            tone={reviewSummary.sourceItems > 0 ? "warning" : "success"}
            value={reviewSummary.sourceItems}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow tone="accent">Compliance workspace</Eyebrow>
        <div className="grid gap-3 md:grid-cols-4">
          <StatTile label="Reviewed sources" value={reviewedSources.length} />
          <StatTile label="Documents" value={documents.length} />
          <StatTile label="Chunks" value={chunks.length} />
          <StatTile label="Advisory audits" value={audits.length} />
        </div>
      </section>

      <section className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme-text-primary">
              Source readiness
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Reviewed sources are the only source lane intended for cited
              advisories; draft and archived material stays visible for review.
            </p>
          </div>
          <StatusPill tone="success">
            Ready workflows: {knowledgeBaseReadiness.readyWorkflowCount}
          </StatusPill>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {knowledgeBaseReadiness.workflows.map((item) => (
            <article
              className={`rounded-md border p-3 text-sm ${statusSurfaceClassName(
                readinessTone(item.status),
              )}`}
              key={item.workflow}
            >
              <p className="font-semibold text-theme-text-primary">
                {formatWorkflow(item.workflow)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-theme-text-muted">
                <StatusPill tone={readinessTone(item.status)}>
                  {item.status.replace(/_/g, " ")}
                </StatusPill>
              </p>
              <p className="mt-2 text-theme-text-secondary">
                {item.reviewedSources} reviewed, {item.draftSources} draft
              </p>
              <p className="mt-1 text-theme-text-secondary">
                {item.documents} documents, {item.chunks} chunks
              </p>
              <p className="mt-1 text-xs text-theme-text-muted">
                {formatOptionalDate(item.lastRetrievedAt)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Eyebrow tone="accent">Chemical records</Eyebrow>
            <h2 className="mt-1 text-lg font-semibold text-theme-text-primary">
              Chemical Product Binder
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-theme-text-secondary">
              Product-level binder for EPA/DPR details, recent use evidence,
              source readiness, and office review recommended follow-up.
            </p>
          </div>
          <StatusPill
            dot={false}
            tone={
              chemicalProductBinderSummary.productsWithReviewItems > 0
                ? "warning"
                : "success"
            }
          >
            {chemicalProductBinderSummary.productsWithReviewItems} products
            needing review
          </StatusPill>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <StatTile
            label="Products tracked"
            value={chemicalProductBinderSummary.totalProducts}
          />
          <StatTile
            label="Products needing review"
            tone={
              chemicalProductBinderSummary.productsWithReviewItems > 0
                ? "warning"
                : "success"
            }
            value={chemicalProductBinderSummary.productsWithReviewItems}
          />
          <StatTile
            label="Logs missing evidence"
            tone={
              chemicalProductBinderSummary.logsMissingAmountUnit +
                chemicalProductBinderSummary.logsMissingTargetSite >
              0
                ? "warning"
                : "success"
            }
            value={
              chemicalProductBinderSummary.logsMissingAmountUnit +
              chemicalProductBinderSummary.logsMissingTargetSite
            }
          />
          <StatTile
            label="License/supervision reviews"
            tone={
              chemicalProductBinderSummary.logsNeedingLicenseReview > 0
                ? "warning"
                : "success"
            }
            value={chemicalProductBinderSummary.logsNeedingLicenseReview}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {binderFilterOptions.map((option) => {
            const active = binderFilter === option.filter;

            return (
              <button
                aria-pressed={active}
                className={`min-h-9 rounded-md border px-3 text-sm font-semibold transition ${
                  active
                    ? "border-theme-action-primary bg-theme-background-subtle text-theme-action-primary"
                    : "border-theme-border-default bg-theme-background-surface text-theme-text-secondary hover:bg-theme-background-subtle"
                }`}
                key={option.filter}
                onClick={() => setBinderFilter(option.filter)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {filteredBinderItems.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState>No chemical products match this filter</EmptyState>
            </div>
          ) : (
            filteredBinderItems.map((item) => (
              <ChemicalProductBinderCard item={item} key={item.chemicalId} />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow tone="accent">Advisory readiness</Eyebrow>
        <div className="grid gap-4 lg:grid-cols-4">
          <article
            className={`rounded-lg border p-4 shadow-sm ${statusSurfaceClassName(
              readinessTone(chemicalReadiness.status),
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Chemical review
            </p>
            <StatusPill
              className="mt-2"
              dot={false}
              tone={readinessTone(chemicalReadiness.status)}
            >
              {chemicalReadiness.status === "advisory_ready"
                ? "Citations available"
                : "Needs reviewed citations"}
            </StatusPill>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {
                chemicalReadiness.required_fields.filter(
                  (field) => field.status === "missing",
                ).length
              }{" "}
              missing fields from {logs.length} chemical logs.
            </p>
          </article>
          <article
            className={`rounded-lg border p-4 shadow-sm ${statusSurfaceClassName(
              readinessTone(recurringReadiness.status),
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Recurring routes
            </p>
            <StatusPill
              className="mt-2"
              dot={false}
              tone={readinessTone(recurringReadiness.status)}
            >
              {recurringReadiness.status === "advisory_ready"
                ? "Ready"
                : "Needs cited route rules"}
            </StatusPill>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {jobs.filter((job) => job.status === "completed").length}{" "}
              completed jobs.{" "}
              {recurringReadiness.status === "advisory_ready"
                ? "Ready for cited prompt review."
                : "Awaiting cited route rules."}
            </p>
          </article>
          <article
            className={`rounded-lg border p-4 shadow-sm ${statusSurfaceClassName(
              "info",
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              WDO / Branch 3
            </p>
            <StatusPill className="mt-2" dot={false} tone="info">
              SPCB source lane
            </StatusPill>
            <p className="mt-2 text-sm text-theme-text-secondary">
              Inspection reports and damaged-member evidence stay advisory until
              reviewed source chunks are ingested.
            </p>
          </article>
          <article
            className={`rounded-lg border p-4 shadow-sm ${statusSurfaceClassName(
              multiUnitSummary.totalUnits === 0
                ? "info"
                : setupReadiness
                  ? "warning"
                  : "success",
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Multi-unit audits
            </p>
            <StatusPill
              className="mt-2"
              dot={false}
              tone={
                multiUnitSummary.totalUnits === 0
                  ? "info"
                  : setupReadiness
                    ? "warning"
                    : "success"
              }
            >
              {multiUnitSummary.totalUnits} units modeled
            </StatusPill>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {multiUnitSummary.totalUnits === 0
                ? "Not live yet - unit roster and per-unit treatment hooks are deferred."
                : setupReadiness
                  ? "Schema setup is pending for unit roster and per-unit treatment evidence."
                  : "Schema is ready for unit roster and per-unit treatment evidence."}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-theme-text-primary">
              Needs review
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-theme-text-secondary">
              Operator review required for records with missing evidence,
              source readiness gaps, or recent advisory audit follow-up.
            </p>
          </div>
          <StatusPill
            dot={false}
            tone={reviewSummary.criticalItems > 0 ? "danger" : "warning"}
          >
            {reviewSummary.openItems} open
          </StatusPill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {reviewFilterOptions.map((option) => {
            const active = reviewFilter === option.filter;

            return (
              <button
                aria-pressed={active}
                className={`min-h-9 rounded-md border px-3 text-sm font-semibold transition ${
                  active
                    ? "border-theme-action-primary bg-theme-background-subtle text-theme-action-primary"
                    : "border-theme-border-default bg-theme-background-surface text-theme-text-secondary hover:bg-theme-background-subtle"
                }`}
                key={option.filter}
                onClick={() => setReviewFilter(option.filter)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredReviewItems.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState>No review items match this filter</EmptyState>
            </div>
          ) : (
            filteredReviewItems.map((item) => (
              <ReviewItemCard item={item} key={item.id} />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
          onSubmit={submitAdvisory}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-theme-text-primary">
                Create advisory
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Uses server-side retrieval only. If no key or reviewed source is
                available, the response stays explicit about that blocker.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Workflow
              <select
                aria-label="Advisory workflow"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setWorkflow(event.target.value as ComplianceWorkflow)
                }
                value={workflow}
              >
                {workflowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Review prompt
              <textarea
                className="min-h-28 rounded-md border border-theme-border-default bg-theme-background-surface px-3 py-2 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) => setPrompt(event.target.value)}
                value={prompt}
              />
            </label>
            {error ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                {error}
              </p>
            ) : null}
            <Button
              disabled={createAdvisory.isPending || Boolean(setupReadiness)}
              type="submit"
            >
              {setupReadiness
                ? "Setup required"
                : createAdvisory.isPending
                  ? "Reviewing"
                  : "Run advisory"}
            </Button>
          </div>
        </form>

        <aside className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            Source anchors
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {complianceSourceAnchors.map((anchor) => (
              <a
                className="rounded-md border border-theme-border-subtle p-3 text-sm hover:bg-theme-background-subtle"
                href={anchor.url}
                key={anchor.url}
                rel="noreferrer"
                target="_blank"
              >
                <span className="block font-semibold text-theme-text-primary">
                  {anchor.title}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-wide text-theme-text-muted">
                  {anchor.authority} | {formatWorkflow(anchor.workflow)}
                </span>
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            Latest advisory
          </h2>
          {!advisory ? (
            <EmptyState>No advisory has been run in this session</EmptyState>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <p
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusTone(advisory.status)}`}
              >
                {advisory.status.replace(/_/g, " ")}
              </p>
              <p className="text-sm text-theme-text-secondary">
                {advisory.summary}
              </p>
              {advisoryEvaluation ? (
                <div className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3 text-sm">
                  <h3 className="font-semibold text-theme-text-primary">Evaluation</h3>
                  <p
                    className={`mt-2 w-fit rounded-md border px-2 py-1 text-xs font-semibold ${evaluationTone(
                      advisoryEvaluation.status,
                    )}`}
                  >
                    {advisoryEvaluation.label}
                  </p>
                  <p className="mt-2 text-theme-text-secondary">
                    {advisoryEvaluation.summary}
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {advisoryEvaluation.checks.map((check) => (
                      <li
                        className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-2"
                        key={check.id}
                      >
                        <span className="font-semibold text-theme-text-primary">
                          {check.label}
                        </span>
                        <span className="ml-2 text-xs uppercase tracking-wide text-theme-text-muted">
                          {check.state}
                        </span>
                        <p className="mt-1 text-theme-text-secondary">
                          {check.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {advisoryRuntime ? (
                <p className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3 text-sm text-theme-text-secondary">
                  {runtimeCopy(advisoryRuntime)}
                </p>
              ) : null}
              {advisory.review_task ? (
                <p className="rounded-md border border-status-alert-warning-border bg-status-alert-warning-bg p-3 text-sm text-status-alert-warning-fg">
                  {advisory.review_task}
                </p>
              ) : null}
              <div>
                <h3 className="text-sm font-semibold text-theme-text-primary">
                  Required evidence
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {advisory.required_fields.map((field) => (
                    <li
                      className="rounded-md border border-theme-border-subtle p-3 text-sm"
                      key={field.field}
                    >
                      <span className="font-semibold text-theme-text-primary">
                        {field.label}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-wide text-theme-text-muted">
                        {field.status}
                      </span>
                      <p className="mt-1 text-theme-text-secondary">
                        {field.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              {advisory.findings.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-theme-text-primary">
                    Findings
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {advisory.findings.map((finding) => (
                      <li
                        className="rounded-md border border-theme-border-subtle p-3 text-sm"
                        key={`${finding.title}-${finding.message}`}
                      >
                        <span className="font-semibold text-theme-text-primary">
                          {finding.title}
                        </span>
                        <span className="ml-2 text-xs uppercase tracking-wide text-theme-text-muted">
                          {finding.severity}
                        </span>
                        <p className="mt-1 text-theme-text-secondary">
                          {finding.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {advisory.citations.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-theme-text-primary">
                    Citations
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {advisory.citations.map((citation) => (
                      <li
                        className="rounded-md border border-theme-border-subtle p-3 text-sm"
                        key={citation.chunk_id}
                      >
                        <a
                          className="font-semibold text-theme-action-primary hover:underline"
                          href={citation.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {citation.source_title}
                        </a>
                        <p className="mt-1 text-theme-text-secondary">
                          {citation.excerpt}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </article>

        <aside className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-theme-text-primary">
            Audit trail
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {auditsQuery.isLoading ? (
              <EmptyState>Loading advisory audits</EmptyState>
            ) : auditsQuery.error ? (
              <EmptyState>
                Advisory audits unavailable; setup or retry required.
              </EmptyState>
            ) : audits.length === 0 ? (
              <EmptyState>No advisory audits recorded</EmptyState>
            ) : (
              audits.slice(0, 6).map((audit) => (
                <article
                  className="rounded-md border border-theme-border-subtle p-3 text-sm"
                  key={audit.id}
                >
                  <p className="font-semibold text-theme-text-primary">
                    {formatWorkflow(audit.workflow)}
                  </p>
                  <p className="mt-1 text-theme-text-secondary">
                    {audit.status.replace(/_/g, " ")} |{" "}
                    {formatDate(audit.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-theme-text-muted">
                    {audit.citation_chunk_ids.length} cited chunks
                  </p>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
