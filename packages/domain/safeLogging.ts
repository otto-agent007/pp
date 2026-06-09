export type SafeLogPayload = Record<string, unknown>;

const sensitiveKeyPatterns = [
  "access_token",
  "api_key",
  "authorization",
  "cookie",
  "grant",
  "hash",
  "password",
  "refresh_token",
  "secret",
  "service_role",
  "session",
  "signature",
  "stripe_signature",
  "token",
  "webhook_secret",
];

const sensitiveQueryParams = [
  "access_token",
  "grant",
  "refresh_token",
  "session",
  "token",
];

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();

  return sensitiveKeyPatterns.some((pattern) => normalized.includes(pattern));
}

function redactUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  sensitiveQueryParams.forEach((param) => {
    if (parsed.searchParams.has(param)) {
      parsed.searchParams.set(param, "[REDACTED]");
    }
  });

  return parsed.toString();
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactUrl(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
}

export function redactObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : redactValue(value),
    ]),
  );
}

function safeLogPayload(payload?: SafeLogPayload) {
  return payload ? redactObject(payload) : undefined;
}

export function safeLogInfo(eventName: string, payload?: SafeLogPayload) {
  console.info(eventName, safeLogPayload(payload));
}

export function safeLogWarn(eventName: string, payload?: SafeLogPayload) {
  console.warn(eventName, safeLogPayload(payload));
}

export function safeLogError(eventName: string, payload?: SafeLogPayload) {
  console.error(eventName, safeLogPayload(payload));
}

export function buildSafeErrorResponse(
  message: string,
  status: number,
  extra: SafeLogPayload = {},
) {
  return {
    body: redactObject({
      error: message,
      ...extra,
    }),
    status,
  };
}
