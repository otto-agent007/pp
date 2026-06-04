"use client";

import {
  buildWdoEscrowClearanceQueue,
  formatJobScheduleDateTime,
  getWdoEscrowClearanceSummary,
  isWdoEscrowLikeJob,
  type WdoEscrowClearanceQueueItem,
  type WdoEscrowReadinessStatus,
} from "@pest-patrol/domain";
import type { Invoice, Job, TechnicianLicense } from "@pest-patrol/types";
import {
  Button,
  Card,
  CountTile,
  Eyebrow,
  StatTile,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
import { useComplianceReviewItems } from "../../hooks/useComplianceReviewItems";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";
import { useTechnicianLicenses } from "../../hooks/useTechnicians";
import { adminWorkspaceClassName } from "../admin-workspace";

type QueueFilter = WdoEscrowReadinessStatus | "all";

const emptyInvoices: Invoice[] = [];
const emptyJobs: Job[] = [];
const emptyTechnicianLicenses: TechnicianLicense[] = [];
const filterLabels: Record<QueueFilter, string> = {
  all: "All",
  needs_billing_review: "Needs billing review",
  needs_evidence: "Needs evidence",
  needs_operator_review: "Needs operator review",
  ready_for_draft: "Ready for draft",
  released: "Released",
};

function toneForStatus(status: WdoEscrowReadinessStatus): StatusPillTone {
  if (status === "ready_for_draft" || status === "released") return "success";
  if (status === "needs_operator_review") return "danger";
  if (status === "needs_billing_review") return "info";
  return "warning";
}

function EmptyState({
  children,
  description,
}: {
  children: string;
  description?: string;
}) {
  return (
    <Card
      className="border-dashed border-theme-border-default bg-theme-background-subtle text-sm text-theme-text-secondary shadow-none"
      padding="md"
    >
      <p>{children}</p>
      {description ? <p className="mt-2">{description}</p> : null}
    </Card>
  );
}

function SummaryTiles({
  activeFilter,
  onFilter,
  summary,
}: {
  activeFilter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  summary: ReturnType<typeof getWdoEscrowClearanceSummary>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <CountTile
        active={activeFilter === "all"}
        count={summary.totalWdoJobs}
        label="WDO jobs found"
        onClick={() => onFilter("all")}
      />
      <CountTile
        active={activeFilter === "ready_for_draft"}
        count={summary.readyForDraft}
        label="Ready for draft"
        onClick={() => onFilter("ready_for_draft")}
        tone={summary.readyForDraft > 0 ? "success" : "neutral"}
      />
      <CountTile
        active={activeFilter === "needs_evidence"}
        count={summary.needsEvidence}
        label="Needs evidence"
        onClick={() => onFilter("needs_evidence")}
        tone={summary.needsEvidence > 0 ? "warning" : "neutral"}
      />
      <CountTile
        active={activeFilter === "needs_operator_review"}
        count={summary.needsOperatorReview}
        label="Needs operator review"
        onClick={() => onFilter("needs_operator_review")}
        tone={summary.needsOperatorReview > 0 ? "danger" : "neutral"}
      />
      <CountTile
        active={activeFilter === "needs_billing_review"}
        count={summary.needsBillingReview}
        label="Needs billing review"
        onClick={() => onFilter("needs_billing_review")}
        tone={summary.needsBillingReview > 0 ? "info" : "neutral"}
      />
    </section>
  );
}

function FilterChips({
  activeFilter,
  onFilter,
}: {
  activeFilter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
}) {
  const filters: QueueFilter[] = [
    "all",
    "ready_for_draft",
    "needs_evidence",
    "needs_operator_review",
    "needs_billing_review",
  ];

  return (
    <section
      aria-label="WDO readiness filters"
      className="flex flex-wrap gap-2"
    >
      {filters.map((filter) => (
        <Button
          aria-pressed={activeFilter === filter}
          key={filter}
          onClick={() => onFilter(filter)}
          size="sm"
          variant={activeFilter === filter ? "primary" : "ghost"}
        >
          {filterLabels[filter]}
        </Button>
      ))}
    </section>
  );
}

function QueueCard({
  isSelected,
  item,
  onSelect,
}: {
  isSelected: boolean;
  item: WdoEscrowClearanceQueueItem;
  onSelect: () => void;
}) {
  return (
    <article
      className={`rounded-lg border bg-theme-background-surface p-4 shadow-sm transition ${
        isSelected
          ? "border-theme-action-primary"
          : "border-theme-border-subtle"
      }`}
    >
      <button
        className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-theme-text-primary">
              {item.customerLabel}
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {item.locationLabel}
            </p>
            <p className="mt-2 text-xs font-semibold text-theme-text-muted">
              {formatJobScheduleDateTime(item.job.scheduled_start)}
            </p>
            <p className="mt-2 text-xs font-bold text-theme-text-secondary">
              {item.serviceLabel}
            </p>
            {item.missingEvidenceLabels.length > 0 ? (
              <p className="mt-2 text-xs font-semibold text-status-alert-warning-fg">
                Missing: {item.missingEvidenceLabels.slice(0, 3).join(", ")}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-theme-text-secondary">
              {item.nextAction}
            </p>
          </div>
          <StatusPill dot={false} tone={toneForStatus(item.status)}>
            {item.statusLabel}
          </StatusPill>
        </div>
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href={item.links.closeout}
        >
          Closeout
        </a>
        <a
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href={item.links.payments}
        >
          Payments
        </a>
        <a
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href={item.links.customer}
        >
          Customer
        </a>
        <a
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href={item.links.compliance}
        >
          Compliance
        </a>
      </div>
    </article>
  );
}

function DetailPanel({ item }: { item: WdoEscrowClearanceQueueItem | null }) {
  if (!item) {
    return (
      <EmptyState description="Select a queue item to review evidence, billing, and document handoff readiness.">
        No WDO job selected
      </EmptyState>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Card padding="md" statusTone={toneForStatus(item.status)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Eyebrow>Readiness detail</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-theme-text-primary">
              {item.customerLabel}
            </h2>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {item.locationLabel}
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {formatJobScheduleDateTime(item.job.scheduled_start)}
            </p>
          </div>
          <StatusPill dot={false} tone={toneForStatus(item.status)}>
            {item.statusLabel}
          </StatusPill>
        </div>
        <p className="mt-4 text-sm font-semibold text-theme-text-primary">
          {item.nextAction}
        </p>
      </Card>

      <Card padding="md">
        <Eyebrow>Readiness checklist</Eyebrow>
        <div className="mt-3 grid gap-2">
          {item.readinessItems.map((readiness) => (
            <div
              className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
              key={readiness.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm font-semibold text-theme-text-primary">
                  {readiness.label}
                </p>
                <StatusPill
                  dot={false}
                  tone={
                    readiness.status === "ready"
                      ? "success"
                      : readiness.status === "future_follow_up"
                        ? "info"
                        : readiness.status === "needs_review"
                          ? "danger"
                          : "warning"
                  }
                >
                  {readiness.status.replaceAll("_", " ")}
                </StatusPill>
              </div>
              <p className="mt-2 text-sm text-theme-text-secondary">
                {readiness.detail}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md">
        <Eyebrow>Proof, billing, and documents</Eyebrow>
        <dl className="mt-3 grid gap-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Proof/photos/forms summary
            </dt>
            <dd className="mt-1 text-sm text-theme-text-secondary">
              {item.missingEvidenceLabels.length > 0
                ? `Needs evidence: ${item.missingEvidenceLabels.join(", ")}.`
                : "Required WDO evidence is ready for draft review."}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Compliance guardrail
            </dt>
            <dd className="mt-1 text-sm text-theme-text-secondary">
              {item.complianceGuardrail
                ? `${item.complianceGuardrail.label}: ${item.complianceGuardrail.summary}`
                : "No linked internal guardrail is blocking this draft review."}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Invoice/payment state
            </dt>
            <dd className="mt-1 text-sm text-theme-text-secondary">
              {item.invoiceLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
              Document handoff note
            </dt>
            <dd className="mt-1 text-sm text-theme-text-secondary">
              {item.documentHandoffNote}
            </dd>
          </div>
        </dl>
        <div
          className={`mt-4 rounded-md border p-3 ${statusSurfaceClassName(
            "warning",
          )}`}
        >
          <p className="text-sm font-semibold text-theme-text-primary">
            Final release requires authorized human review.
          </p>
          <p className="mt-1 text-sm text-theme-text-secondary">
            This workspace prepares draft clearance readiness only and does not
            issue final clearance certificates.
          </p>
        </div>
        <Button className="mt-4" disabled>
          Generate draft certificate
        </Button>
      </Card>
    </section>
  );
}

export function EscrowReClient() {
  const searchParams = useSearchParams();
  const jobsQuery = useJobs();
  const invoicesQuery = useInvoices();
  const jobs = jobsQuery.data ?? emptyJobs;
  const invoices = invoicesQuery.data ?? emptyInvoices;
  const complianceReview = useComplianceReviewItems({ jobs });
  const technicianLicensesQuery = useTechnicianLicenses();
  const technicianLicenses =
    technicianLicensesQuery.data ?? emptyTechnicianLicenses;
  const wdoJobIds = useMemo(
    () => jobs.filter(isWdoEscrowLikeJob).map((job) => job.id),
    [jobs],
  );
  const summariesQuery = useCloseoutCaptureSummaries(wdoJobIds);
  const guardrailByJobId = complianceReview.guardrailByJobId(wdoJobIds);
  const queue = useMemo(
    () =>
      buildWdoEscrowClearanceQueue({
        closeoutSummaries: summariesQuery.data ?? [],
        complianceGuardrails: guardrailByJobId,
        invoices,
        jobs,
        technicianLicenses,
      }),
    [guardrailByJobId, invoices, jobs, summariesQuery.data, technicianLicenses],
  );
  const summary = useMemo(() => getWdoEscrowClearanceSummary(queue), [queue]);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const visibleQueue = useMemo(
    () =>
      filter === "all" ? queue : queue.filter((item) => item.status === filter),
    [filter, queue],
  );
  const selectedItem =
    visibleQueue.find((item) => item.job.id === selectedJobId) ??
    queue.find((item) => item.job.id === selectedJobId) ??
    visibleQueue[0] ??
    queue[0] ??
    null;
  const isLoading =
    jobsQuery.isLoading ||
    invoicesQuery.isLoading ||
    summariesQuery.isLoading ||
    complianceReview.isLoading ||
    technicianLicensesQuery.isLoading;
  const hasError =
    jobsQuery.error ||
    invoicesQuery.error ||
    summariesQuery.error ||
    complianceReview.isError ||
    (technicianLicensesQuery.schemaUnavailable
      ? null
      : technicianLicensesQuery.error);

  useEffect(() => {
    const jobId = searchParams.get("job_id");

    if (jobId && queue.some((item) => item.job.id === jobId)) {
      setSelectedJobId(jobId);
      return;
    }

    if (!selectedJobId && queue[0]) {
      setSelectedJobId(queue[0].job.id);
    }
  }, [queue, searchParams, selectedJobId]);

  function selectFilter(nextFilter: QueueFilter) {
    setFilter(nextFilter);
    const nextItem =
      nextFilter === "all"
        ? queue[0]
        : queue.find((item) => item.status === nextFilter);

    setSelectedJobId(nextItem?.job.id ?? null);
  }

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow tone="accent">Real estate handoff</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">
            WDO / Escrow Clearance
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-theme-text-secondary">
            Review termite/WDO jobs, escrow inspections, field proof, billing
            state, and document handoff readiness before draft clearance.
          </p>
        </div>
        <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface px-4 py-3 text-sm font-bold text-theme-text-secondary shadow-sm">
          Final release requires authorized human review.
        </div>
      </header>

      <SummaryTiles
        activeFilter={filter}
        onFilter={selectFilter}
        summary={summary}
      />
      <FilterChips activeFilter={filter} onFilter={selectFilter} />

      {complianceReview.setupWarning || technicianLicensesQuery.setupWarning ? (
        <section
          className={`rounded-md border p-4 text-sm ${statusSurfaceClassName(
            "info",
          )}`}
        >
          <p className="font-semibold text-theme-text-primary">
            {complianceReview.setupWarning ??
              technicianLicensesQuery.setupWarning}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <aside className="flex flex-col gap-3">
          {isLoading ? (
            <EmptyState>Loading WDO readiness queue</EmptyState>
          ) : hasError ? (
            <EmptyState description="Retry from the browser or refresh the page.">
              Could not load WDO readiness data
            </EmptyState>
          ) : visibleQueue.length === 0 ? (
            <EmptyState description="WDO and escrow jobs appear here when service notes, customer records, or service presets identify termite/WDO work.">
              No WDO readiness items found
            </EmptyState>
          ) : (
            visibleQueue.map((item) => (
              <QueueCard
                isSelected={selectedItem?.job.id === item.job.id}
                item={item}
                key={item.job.id}
                onSelect={() => setSelectedJobId(item.job.id)}
              />
            ))
          )}
        </aside>
        <div className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
          <DetailPanel item={selectedItem} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatTile
          detail="Draft review only"
          label="Document release"
          tone="warning"
          value="Manual"
        />
        <StatTile
          detail="Internal staff guidance"
          label="Customer portal"
          tone="success"
          value="Safe"
        />
        <StatTile
          detail="Provider-free derived queue"
          label="Migration"
          tone="success"
          value="None"
        />
      </section>
    </main>
  );
}
