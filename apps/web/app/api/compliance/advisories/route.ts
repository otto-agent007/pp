import {
  assertComplianceSchemaReady,
  createComplianceAdvisoryAuditRecord,
  isComplianceSchemaUnavailableError,
  listChemicalLogRecords,
  listJobRecords,
  searchComplianceChunkRecords,
} from "@pest-patrol/api-client";
import {
  buildComplianceAdvisory,
  buildComplianceQueryText,
  getComplianceRuntimeStatus,
  getComplianceSchemaReadyReadiness,
  getComplianceSchemaUnavailableReadiness,
  safeLogError,
  safeLogWarn,
  validateComplianceAdvisoryRequest,
} from "@pest-patrol/domain";
import type { ComplianceAdvisoryRequest } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../_lib/server-auth";
import { checkApiRateLimit, rateLimitResponse } from "../../_lib/rate-limit";

export const runtime = "nodejs";

async function createEmbedding(input: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    body: JSON.stringify({
      input,
      model: process.env.OPENAI_COMPLIANCE_EMBEDDING_MODEL ?? "text-embedding-3-small",
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create compliance query embedding");
  }

  const body = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  return body.data?.[0]?.embedding ?? null;
}

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess(request);

  if (adminAccess.response) {
    return adminAccess.response;
  }

  let input: ComplianceAdvisoryRequest | null = null;
  let runtimeStatus: ReturnType<typeof getComplianceRuntimeStatus> | null = null;

  try {
    const payload = (await request.json()) as ComplianceAdvisoryRequest;
    const parsedInput = validateComplianceAdvisoryRequest(payload);
    input = parsedInput;
    if (
      await checkApiRateLimit({
        id: "compliance-advisory-create",
        request,
        key: `compliance-advisory-create:${adminAccess.access.userId}:${parsedInput.workflow}`,
      })
    ) {
      return rateLimitResponse();
    }
    runtimeStatus = getComplianceRuntimeStatus({
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    });

    if (!runtimeStatus.available) {
      safeLogWarn("compliance.advisory.provider_unavailable", {
        reason: runtimeStatus.reason,
        route: "compliance/advisories",
        workflow: parsedInput.workflow,
      });

      const advisory = buildComplianceAdvisory({
        chunks: [],
        prompt: parsedInput.prompt,
        ragDisabled: true,
        workflow: parsedInput.workflow,
      });

      return NextResponse.json({ advisory, runtime: runtimeStatus });
    }

    const client = createServiceRoleSupabaseClient();
    await assertComplianceSchemaReady(client);
    const queryText = buildComplianceQueryText(parsedInput);
    const embedding = await createEmbedding(
      queryText,
      process.env.OPENAI_API_KEY ?? "",
    );
    const chunks = await searchComplianceChunkRecords(
      {
        embedding,
        limit: 8,
        query: queryText,
        workflow: parsedInput.workflow,
      },
      client,
    );
    const chemicalLogs = parsedInput.context?.chemical_log_id
      ? await listChemicalLogRecords(client)
      : [];
    const jobs = parsedInput.context?.job_id ? await listJobRecords(client) : [];
    const chemicalLog =
      chemicalLogs.find(
        (log) => log.id === parsedInput.context?.chemical_log_id,
      ) ?? null;
    const job =
      chemicalLog?.job ??
      jobs.find((item) => item.id === parsedInput.context?.job_id) ??
      null;
    const advisory = buildComplianceAdvisory({
      chemicalLog,
      chunks,
      job,
      prompt: parsedInput.prompt,
      workflow: parsedInput.workflow,
    });

    await createComplianceAdvisoryAuditRecord(
      {
        citation_chunk_ids: advisory.citations.map((citation) => citation.chunk_id),
        created_by: adminAccess.access.userId,
        request: {
          context: parsedInput.context ?? {},
          prompt: parsedInput.prompt ?? null,
          workflow: parsedInput.workflow,
        },
        response: advisory,
        status: advisory.status,
        workflow: parsedInput.workflow,
      },
      client,
    );

    return NextResponse.json({
      advisory,
      runtime: runtimeStatus,
      setup: getComplianceSchemaReadyReadiness(),
    });
  } catch (error) {
    if (input && isComplianceSchemaUnavailableError(error)) {
      const advisoryInput = input;
      safeLogWarn("compliance.advisory.schema_unavailable", {
        route: "compliance/advisories",
        workflow: advisoryInput.workflow,
      });
      const advisory = buildComplianceAdvisory({
        chunks: [],
        prompt: advisoryInput.prompt,
        workflow: advisoryInput.workflow,
      });

      return NextResponse.json({
        advisory,
        runtime:
          runtimeStatus ??
          getComplianceRuntimeStatus({
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          }),
        setup: getComplianceSchemaUnavailableReadiness(),
      });
    }

    const message = "Unable to create compliance advisory";

    safeLogError("compliance.advisory.failed", {
      route: "compliance/advisories",
      workflow: input?.workflow ?? null,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
