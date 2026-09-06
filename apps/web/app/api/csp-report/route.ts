import { safeLogWarn } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Browsers POST here for both the legacy `report-uri` directive
// (application/csp-report) and the modern Reporting API `report-to`
// directive (application/reports+json). Accept either shape and just log
// it — this keeps the Report-Only CSP from being pure theater without
// standing up a full reporting pipeline.
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    safeLogWarn("csp.violation_reported", {
      report: body,
    });
  } catch {
    // Malformed or empty report bodies are not actionable; ignore them.
  }

  return new NextResponse(null, { status: 204 });
}
