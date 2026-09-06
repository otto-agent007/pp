import { createHmac } from "crypto";

const WEBHOOK_TIMEOUT_MS = 15_000;

export class WebhookDispatchError extends Error {}

export async function dispatchSignedWebhook(input: {
  headers?: Record<string, string>;
  payload: unknown;
  secret?: string | null;
  url: string;
}): Promise<Response> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.url);
  } catch {
    throw new WebhookDispatchError("Webhook URL is invalid");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new WebhookDispatchError("Webhook URL must use https");
  }

  const body = JSON.stringify(input.payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...input.headers,
  };

  if (input.secret) {
    const timestamp = Date.now().toString();
    const signature = createHmac("sha256", input.secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    headers["X-Webhook-Signature"] = signature;
    headers["X-Webhook-Timestamp"] = timestamp;
  }

  return fetch(parsedUrl.toString(), {
    body,
    headers,
    method: "POST",
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
}
