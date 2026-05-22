import type {
  ChemicalLog,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSource,
  JobUnitAuditItem,
  LocationUnit,
} from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  buildComplianceAdvisory,
  buildComplianceIngestionPlan,
  buildComplianceQueryText,
  buildComplianceSourceHash,
  chunkComplianceDocumentText,
  evaluateComplianceAdvisory,
  getComplianceKnowledgeBaseReadiness,
  getComplianceMultiUnitAuditSummary,
  getComplianceRuntimeStatus,
  getComplianceSchemaUnavailableReadiness,
  getComplianceSourceFilters,
  validateComplianceSourceManifestEntry,
  validateComplianceAdvisoryRequest,
} from "./compliance";
import {
  cdprStructuralRecordkeepingFixture,
  epaLabelFixture,
  spcbWdoFixture,
} from "./fixtures/compliance";

const now = "2026-05-16T12:00:00.000Z";

const source = {
  id: "source-1",
  title: "DPR structural recordkeeping",
  url: "https://www.cdpr.ca.gov/cac-letter/amendment-of-structural-fumigation-log-and-pesticide-use-record-keeping-requirements/",
  jurisdiction: "california",
  authority: "cdpr",
  workflow: "chemical_application",
  branch: "branch_2",
  effective_date: "2026-01-01",
  retrieved_at: now,
  source_hash: "hash-1",
  review_status: "reviewed",
  created_at: now,
  updated_at: now,
} as const;

const document = {
  id: "document-1",
  source_id: source.id,
  title: "Recordkeeping update",
  document_url: source.url,
  content_type: "text/html",
  retrieved_at: now,
  source_hash: "hash-1",
  review_status: "reviewed",
  raw_text: null,
  created_at: now,
  updated_at: now,
  source,
} satisfies ComplianceDocument;

const chunk = {
  id: "chunk-1",
  source_id: source.id,
  document_id: document.id,
  chunk_index: 0,
  heading: "Use records",
  content:
    "Structural pesticide use records include application time, product identity, registration number, amount used, and site treated.",
  tokens_estimate: 24,
  metadata: {},
  created_at: now,
  updated_at: now,
  document,
  source,
} satisfies ComplianceChunk;

const chemicalLog = {
  id: "log-1",
  job_id: "job-1",
  chemical_id: "chemical-1",
  amount_used: 2,
  notes: null,
  created_at: now,
  chemical: {
    id: "chemical-1",
    name: "Bait Gel",
    epa_number: "EPA-123",
    current_stock: 12,
    unit: "oz",
    reorder_level: null,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  job: {
    id: "job-1",
    customer_id: "customer-1",
    location_id: "location-1",
    assigned_tech_id: "tech-1",
    status: "completed",
    scheduled_start: now,
    scheduled_end: now,
    service_notes: "Crack and crevice",
    created_at: now,
    updated_at: now,
    customer: {
      id: "customer-1",
      name: "Acme Apartments",
      phone: null,
      email: null,
      property_type: "commercial",
      service_notes: null,
      status: "active",
      created_at: now,
      updated_at: now,
    },
    location: {
      id: "location-1",
      customer_id: "customer-1",
      address: "100 Main St",
      nickname: null,
      service_notes: null,
      is_primary: true,
      latitude: null,
      longitude: null,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  },
} satisfies ChemicalLog;

describe("compliance domain", () => {
  it("reports OpenAI RAG as disabled when the server key is missing", () => {
    expect(getComplianceRuntimeStatus({ OPENAI_API_KEY: "" })).toEqual({
      available: false,
      provider: "openai",
      reason: "OPENAI_API_KEY is not configured for server-side RAG.",
      requiredEnvName: "OPENAI_API_KEY",
    });
  });

  it("reports migration-needed setup state without raw database details", () => {
    expect(getComplianceSchemaUnavailableReadiness()).toEqual({
      available: false,
      migrationName: "20260516175724_california_compliance_rag_v1.sql",
      reason:
        "Compliance schema is unavailable. Apply 20260516175724_california_compliance_rag_v1.sql in an approved Supabase environment before relying on source-backed advisories.",
      status: "schema_unavailable",
    });
  });

  it("normalizes advisory requests and query text", () => {
    const request = validateComplianceAdvisoryRequest({
      context: { job_id: "job-1" },
      prompt: " Review label ",
      workflow: "chemical_application",
    });

    expect(request.prompt).toBe("Review label");
    expect(buildComplianceQueryText(request)).toContain("Chemical application");
    expect(getComplianceSourceFilters("chemical_application").authorities).toEqual([
      "cdpr",
      "epa",
    ]);
  });

  it("chunks local compliance fixtures without live web access", () => {
    const epaChunks = chunkComplianceDocumentText({
      documentId: "document-epa",
      sourceId: "source-epa",
      text: epaLabelFixture,
      wordsPerChunk: 12,
    });
    const dprChunks = chunkComplianceDocumentText({
      documentId: "document-dpr",
      sourceId: "source-dpr",
      text: cdprStructuralRecordkeepingFixture,
    });
    const spcbChunks = chunkComplianceDocumentText({
      documentId: "document-spcb",
      sourceId: "source-spcb",
      text: spcbWdoFixture,
    });

    expect(epaChunks.length).toBeGreaterThan(1);
    expect(dprChunks[0].metadata).toHaveProperty("hash");
    expect(spcbChunks[0].tokens_estimate).toBeGreaterThan(1);
    expect(
      buildComplianceSourceHash({
        retrievedAt: now,
        title: "EPA label",
        url: "https://www.epa.gov/",
      }),
    ).toMatch(/^fnv1a-/);
  });

  it("normalizes manifest entries and builds deterministic ingestion records", () => {
    const entry = validateComplianceSourceManifestEntry({
      authority: "epa",
      branch: "branch_2",
      content_type: "text/plain",
      document_title: "EPA label fixture",
      effective_date: null,
      id: "epa-label-guidance",
      jurisdiction: "federal",
      retrieved_at: now,
      review_status: "reviewed",
      text_path: "epa-label.txt",
      title: " EPA label guidance ",
      url: "https://www.epa.gov/pesticide-labels/introduction-pesticide-labels",
      workflow: "chemical_application",
    });

    const plan = buildComplianceIngestionPlan({
      documentId: "document-epa",
      entry,
      sourceId: "source-epa",
      text: epaLabelFixture,
      wordsPerChunk: 20,
    });

    expect(entry.title).toBe("EPA label guidance");
    expect(plan.source).toEqual(
      expect.objectContaining({
        authority: "epa",
        review_status: "reviewed",
        source_hash: buildComplianceSourceHash({
          retrievedAt: now,
          title: "EPA label guidance",
          url: "https://www.epa.gov/pesticide-labels/introduction-pesticide-labels",
        }),
      }),
    );
    expect(plan.document).toEqual(
      expect.objectContaining({
        content_type: "text/plain",
        document_url: entry.url,
        raw_text: epaLabelFixture,
        source_id: "source-epa",
      }),
    );
    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.chunks[0]).toEqual(
      expect.objectContaining({
        document_id: "document-epa",
        source_id: "source-epa",
      }),
    );
  });

  it("summarizes source review readiness by workflow", () => {
    const draftSource = {
      ...source,
      id: "source-draft",
      review_status: "draft",
      source_hash: "hash-draft",
      workflow: "recurring_route",
    } satisfies ComplianceSource;
    const readiness = getComplianceKnowledgeBaseReadiness({
      chunks: [chunk],
      documents: [document],
      sources: [source, draftSource],
    });

    expect(readiness.totals).toEqual({
      archivedSources: 0,
      chunks: 1,
      documents: 1,
      draftSources: 1,
      reviewedSources: 1,
      sources: 2,
    });
    expect(readiness.workflows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chunks: 1,
          draftSources: 0,
          lastRetrievedAt: now,
          reviewedSources: 1,
          status: "ready",
          workflow: "chemical_application",
        }),
        expect.objectContaining({
          chunks: 0,
          draftSources: 1,
          reviewedSources: 0,
          status: "draft_only",
          workflow: "recurring_route",
        }),
      ]),
    );
  });

  it("builds cited chemical advisories and flags fields outside current records", () => {
    const advisory = buildComplianceAdvisory({
      chemicalLog,
      chunks: [chunk],
      now,
      workflow: "chemical_application",
    });

    expect(advisory.status).toBe("advisory_ready");
    expect(advisory.citations).toHaveLength(1);
    expect(advisory.required_fields).toContainEqual(
      expect.objectContaining({
        field: "license_or_supervision",
        status: "unknown",
      }),
    );
    expect(advisory.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Label citation check" }),
      ]),
    );
  });

  it("evaluates fixture-backed advisories for operator-facing copy without live providers", () => {
    const citedAdvisory = buildComplianceAdvisory({
      chemicalLog,
      chunks: [chunk],
      now,
      workflow: "chemical_application",
    });
    const citedEvaluation = evaluateComplianceAdvisory(citedAdvisory);

    expect(citedEvaluation).toEqual(
      expect.objectContaining({
        label: "Operator review required",
        status: "operator_review_required",
        summary:
          "Cited advisory has 1 source, 0 missing evidence fields, and 1 operator review item.",
      }),
    );
    expect(citedEvaluation.checks).toContainEqual(
      expect.objectContaining({
        id: "source-citations",
        state: "pass",
      }),
    );
    expect(citedEvaluation.checks).toContainEqual(
      expect.objectContaining({
        id: "advisory-scope",
        state: "review",
      }),
    );

    expect(
      evaluateComplianceAdvisory(
        buildComplianceAdvisory({
          chunks: [],
          now,
          workflow: "wdo_branch3",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        label: "Blocked until sources are ready",
        status: "blocked",
      }),
    );
  });

  it("refuses to invent an advisory when citations are missing", () => {
    const advisory = buildComplianceAdvisory({
      chunks: [],
      now,
      workflow: "wdo_branch3",
    });

    expect(advisory.status).toBe("insufficient_sources");
    expect(advisory.review_task).toContain("Ingest and review official");
  });

  it("summarizes multi-unit audit coverage", () => {
    const units = [
      {
        id: "unit-1",
        location_id: "location-1",
        unit_label: "101",
        floor: "1",
        area_type: "unit",
        status: "active",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "unit-2",
        location_id: "location-1",
        unit_label: "Common laundry",
        floor: null,
        area_type: "common_area",
        status: "active",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies LocationUnit[];
    const auditItems = [
      {
        id: "audit-1",
        job_id: "job-1",
        location_unit_id: "unit-1",
        status: "treated",
        evidence: {},
        notes: null,
        audited_by: "tech-1",
        audited_at: now,
        created_at: now,
        updated_at: now,
      },
    ] satisfies JobUnitAuditItem[];

    expect(getComplianceMultiUnitAuditSummary(units, auditItems)).toEqual({
      blocked: 0,
      complete: false,
      followUp: 0,
      pending: 1,
      skipped: 0,
      totalUnits: 2,
      treated: 1,
    });
  });
});
