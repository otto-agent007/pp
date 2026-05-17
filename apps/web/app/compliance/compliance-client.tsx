"use client";

import {
  buildComplianceAdvisory,
  complianceSourceAnchors,
  getComplianceKnowledgeBaseReadiness,
  getComplianceMultiUnitAuditSummary,
  getComplianceSchemaUnavailableReadiness,
} from "@pest-patrol/domain";
import type {
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
import { FormEvent, useMemo, useState } from "react";

import { useJobs } from "../../hooks/useJobs";
import { useChemicalLogs } from "../../hooks/useInventory";
import {
  useComplianceAdvisoryAudits,
  useComplianceChunks,
  useComplianceDocuments,
  useComplianceSources,
  useCreateComplianceAdvisory,
  isComplianceSchemaUnavailableError,
} from "../../hooks/useCompliance";

const workflowOptions: Array<{ label: string; value: ComplianceWorkflow }> = [
  { label: "Chemical EPA/DPR", value: "chemical_application" },
  { label: "Recurring routes", value: "recurring_route" },
  { label: "WDO / Branch 3", value: "wdo_branch3" },
  { label: "Multi-unit audits", value: "multi_unit_audit" },
];

const emptySources: ComplianceSource[] = [];
const emptyDocuments: ComplianceDocument[] = [];
const emptyChunks: ComplianceChunk[] = [];
const emptyAudits: ComplianceAdvisoryAudit[] = [];
const emptyJobs: Job[] = [];
const emptyLogs: ChemicalLog[] = [];

function formatWorkflow(value: ComplianceWorkflow) {
  return workflowOptions.find((workflow) => workflow.value === value)?.label ?? value;
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
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rag_disabled") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
      {children}
    </p>
  );
}

export function ComplianceClient() {
  const sourcesQuery = useComplianceSources();
  const documentsQuery = useComplianceDocuments();
  const chunksQuery = useComplianceChunks();
  const auditsQuery = useComplianceAdvisoryAudits();
  const jobsQuery = useJobs();
  const logsQuery = useChemicalLogs();
  const createAdvisory = useCreateComplianceAdvisory();
  const [workflow, setWorkflow] =
    useState<ComplianceWorkflow>("chemical_application");
  const [prompt, setPrompt] = useState(
    "Review this workflow for missing California structural pest compliance evidence.",
  );
  const [advisory, setAdvisory] = useState<ComplianceAdvisory | null>(null);
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
      ? (advisorySetup?.status === "schema_unavailable"
          ? advisorySetup
          : getComplianceSchemaUnavailableReadiness())
      : null;
  const sources = sourcesQuery.data ?? emptySources;
  const documents = documentsQuery.data ?? emptyDocuments;
  const chunks = chunksQuery.data ?? emptyChunks;
  const audits = auditsQuery.data ?? emptyAudits;
  const jobs = jobsQuery.data ?? emptyJobs;
  const logs = logsQuery.data ?? emptyLogs;
  const reviewedSources = sources.filter(
    (source) => source.review_status === "reviewed",
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

  async function submitAdvisory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await createAdvisory.mutateAsync({
        prompt,
        workflow,
      });

      setAdvisory(result.advisory);
      setAdvisorySetup(result.setup ?? null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create compliance advisory",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            California compliance
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">
            Compliance RAG
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Advisory review for EPA labels, DPR structural-use records, WDO
            Branch 3 evidence, recurring route prompts, and multi-unit audits.
          </p>
        </div>
      </header>

      {setupReadiness ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <h2 className="text-base font-semibold text-amber-950">
            Compliance setup required
          </h2>
          <p className="mt-1">{setupReadiness.reason}</p>
          <p className="mt-2 text-amber-800">
            Source-backed advisories stay disabled until the operator-approved
            migration is applied; no raw Supabase error details are shown here.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reviewed sources
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {reviewedSources.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Documents
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {documents.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Chunks
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {chunks.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Advisory audits
          </p>
          <p className="mt-2 text-2xl font-bold text-neutralDark">
            {audits.length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutralDark">
              Source readiness
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Reviewed sources are the only source lane intended for cited
              advisories; draft and archived material stays visible for review.
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            Ready workflows: {knowledgeBaseReadiness.readyWorkflowCount}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {knowledgeBaseReadiness.workflows.map((item) => (
            <article
              className="rounded-md border border-gray-200 p-3 text-sm"
              key={item.workflow}
            >
              <p className="font-semibold text-neutralDark">
                {formatWorkflow(item.workflow)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                {item.status.replace(/_/g, " ")}
              </p>
              <p className="mt-2 text-gray-700">
                {item.reviewedSources} reviewed, {item.draftSources} draft
              </p>
              <p className="mt-1 text-gray-600">
                {item.documents} documents, {item.chunks} chunks
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatOptionalDate(item.lastRetrievedAt)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Chemical review
          </p>
          <p className="mt-2 text-sm font-semibold text-neutralDark">
            {chemicalReadiness.status === "advisory_ready"
              ? "Citations available"
              : "Needs reviewed citations"}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {chemicalReadiness.required_fields.filter((field) => field.status === "missing").length} missing fields from {logs.length} chemical logs.
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recurring routes
          </p>
          <p className="mt-2 text-sm font-semibold text-neutralDark">
            {jobs.filter((job) => job.status === "completed").length} completed jobs
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {recurringReadiness.status === "advisory_ready"
              ? "Ready for cited prompt review."
              : "Awaiting cited route rules."}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            WDO / Branch 3
          </p>
          <p className="mt-2 text-sm font-semibold text-neutralDark">
            SPCB source lane
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Inspection reports and damaged-member evidence stay advisory until
            reviewed source chunks are ingested.
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Multi-unit audits
          </p>
          <p className="mt-2 text-sm font-semibold text-neutralDark">
            {multiUnitSummary.totalUnits} units modeled
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {setupReadiness
              ? "Schema setup is pending for unit roster and per-unit treatment evidence."
              : "Schema is ready for unit roster and per-unit treatment evidence."}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={submitAdvisory}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutralDark">
                Create advisory
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Uses server-side retrieval only. If no key or reviewed source is
                available, the response stays explicit about that blocker.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Workflow
              <select
                className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary"
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
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Review prompt
              <textarea
                className="min-h-28 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                onChange={(event) => setPrompt(event.target.value)}
                value={prompt}
              />
            </label>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={createAdvisory.isPending || Boolean(setupReadiness)}
              type="submit"
            >
              {setupReadiness
                ? "Setup required"
                : createAdvisory.isPending
                  ? "Reviewing"
                  : "Run advisory"}
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutralDark">
            Source anchors
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {complianceSourceAnchors.map((anchor) => (
              <a
                className="rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50"
                href={anchor.url}
                key={anchor.url}
                rel="noreferrer"
                target="_blank"
              >
                <span className="block font-semibold text-neutralDark">
                  {anchor.title}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-wide text-gray-500">
                  {anchor.authority} | {formatWorkflow(anchor.workflow)}
                </span>
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutralDark">
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
              <p className="text-sm text-gray-700">{advisory.summary}</p>
              {advisory.review_task ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {advisory.review_task}
                </p>
              ) : null}
              <div>
                <h3 className="text-sm font-semibold text-neutralDark">
                  Required evidence
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {advisory.required_fields.map((field) => (
                    <li
                      className="rounded-md border border-gray-200 p-3 text-sm"
                      key={field.field}
                    >
                      <span className="font-semibold text-neutralDark">
                        {field.label}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">
                        {field.status}
                      </span>
                      <p className="mt-1 text-gray-600">{field.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
              {advisory.findings.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-neutralDark">
                    Findings
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {advisory.findings.map((finding) => (
                      <li
                        className="rounded-md border border-gray-200 p-3 text-sm"
                        key={`${finding.title}-${finding.message}`}
                      >
                        <span className="font-semibold text-neutralDark">
                          {finding.title}
                        </span>
                        <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">
                          {finding.severity}
                        </span>
                        <p className="mt-1 text-gray-600">{finding.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {advisory.citations.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-neutralDark">
                    Citations
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {advisory.citations.map((citation) => (
                      <li
                        className="rounded-md border border-gray-200 p-3 text-sm"
                        key={citation.chunk_id}
                      >
                        <a
                          className="font-semibold text-primary hover:underline"
                          href={citation.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {citation.source_title}
                        </a>
                        <p className="mt-1 text-gray-600">{citation.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </article>

        <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutralDark">
            Audit trail
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {audits.length === 0 ? (
              <EmptyState>No advisory audits recorded</EmptyState>
            ) : (
              audits.slice(0, 6).map((audit) => (
                <article
                  className="rounded-md border border-gray-200 p-3 text-sm"
                  key={audit.id}
                >
                  <p className="font-semibold text-neutralDark">
                    {formatWorkflow(audit.workflow)}
                  </p>
                  <p className="mt-1 text-gray-600">
                    {audit.status.replace(/_/g, " ")} |{" "}
                    {formatDate(audit.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
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
