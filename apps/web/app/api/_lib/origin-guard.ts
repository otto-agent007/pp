import { NextResponse } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function parseOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getExpectedOrigin(request: Request) {
  return new URL(request.url).origin;
}

export function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    return parseOrigin(origin);
  }

  const referer = request.headers.get("referer");

  return referer ? parseOrigin(referer) : null;
}

export function validateSameOriginRequest(request: Request) {
  const expectedOrigin = getExpectedOrigin(request);
  const requestOrigin = getRequestOrigin(request);

  return {
    expectedOrigin,
    ok: Boolean(requestOrigin && requestOrigin === expectedOrigin),
    requestOrigin,
  };
}

export function sameOriginGuardResponse() {
  return NextResponse.json(
    { error: "Request origin is not allowed" },
    { status: 403 },
  );
}

export function requireSameOriginForUnsafeMethod(request: Request) {
  if (!unsafeMethods.has(request.method.toUpperCase())) {
    return null;
  }

  return validateSameOriginRequest(request).ok ? null : sameOriginGuardResponse();
}
