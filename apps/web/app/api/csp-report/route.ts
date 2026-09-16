import { safeLogWarn } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  checkApiRateLimit,
  getClientIpFromRequest,
  rateLimitResponse,
} from "../_lib/rate-limit";

export const runtime = "nodejs";

// A CSP report is a small, fixed-shape document. Anything larger than this is
// not a browser report, and reading it only to throw it away is the cost the
// sender wants us to pay.
const maxReportBytes = 8 * 1024;
const maxFieldLength = 256;
// Inline script/style excerpts are the one field that echoes page content
// back into the log, so they get a tighter bound than the URL fields.
const maxSampleLength = 128;

function boundedText(value: unknown, limit = maxFieldLength) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function boundedNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// Browsers POST here in two shapes: the legacy `report-uri` directive sends
// `{"csp-report": {...}}` as application/csp-report with hyphenated keys, and
// the Reporting API `report-to` directive sends an array of
// `{type, body: {...}}` as application/reports+json with camelCase keys.
function extractViolation(payload: unknown) {
  const legacy = asRecord(asRecord(payload)?.["csp-report"]);

  if (legacy) {
    return legacy;
  }

  if (Array.isArray(payload)) {
    const entries = payload.map(asRecord).filter(Boolean) as Record<
      string,
      unknown
    >[];
    const report =
      entries.find((entry) => entry.type === "csp-violation") ?? entries[0];

    return asRecord(report?.body);
  }

  return asRecord(payload);
}

// Only these fields are logged. The endpoint is unauthenticated, so the body is
// attacker-controlled: logging it verbatim let anyone write arbitrary JSON of
// arbitrary size into the platform log, which on a 1h retention window is
// enough to push real events out of it. Projecting onto a known, bounded shape
// makes the volume a function of this list rather than of the sender.
export function buildSafeCspViolation(payload: unknown) {
  const violation = extractViolation(payload);

  if (!violation) {
    return undefined;
  }

  const fields = {
    blocked_uri: boundedText(
      violation["blocked-uri"] ?? violation.blockedURL ?? violation.blockedUri,
    ),
    column_number: boundedNumber(
      violation["column-number"] ?? violation.columnNumber,
    ),
    disposition: boundedText(violation.disposition, 32),
    document_uri: boundedText(
      violation["document-uri"] ?? violation.documentURL ?? violation.documentUri,
    ),
    effective_directive: boundedText(
      violation["effective-directive"] ??
        violation.effectiveDirective ??
        violation["violated-directive"] ??
        violation.violatedDirective,
      64,
    ),
    line_number: boundedNumber(violation["line-number"] ?? violation.lineNumber),
    sample: boundedText(
      violation["script-sample"] ?? violation.sample,
      maxSampleLength,
    ),
    source_file: boundedText(
      violation["source-file"] ?? violation.sourceFile,
    ),
    status_code: boundedNumber(violation["status-code"] ?? violation.statusCode),
  };
  const present = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );

  return present.length > 0 ? Object.fromEntries(present) : undefined;
}

async function readBoundedBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maxReportBytes) {
    return undefined;
  }

  const body = await request.text();

  return body.length > maxReportBytes ? undefined : body;
}

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request);

  if (
    await checkApiRateLimit({
      id: "csp-violation-report",
      request,
      key: `csp-violation-report${clientIp ? `:${clientIp}` : ""}`,
    })
  ) {
    return rateLimitResponse();
  }

  try {
    const body = await readBoundedBody(request);
    const violation = body ? buildSafeCspViolation(JSON.parse(body)) : undefined;

    if (violation) {
      safeLogWarn("csp.violation_reported", violation);
    }
  } catch {
    // Malformed or empty report bodies are not actionable; ignore them.
  }

  return new NextResponse(null, { status: 204 });
}
