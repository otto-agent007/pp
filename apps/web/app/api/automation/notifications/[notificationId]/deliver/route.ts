import type {
  NotificationDeliveryProvider,
  NotificationEvent,
} from "@pest-patrol/types";
import {
  buildNotificationDeliveryProviderPayload,
  getArrivalNotificationDeliveryReadiness,
  safeLogError,
  safeLogWarn,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../../_lib/server-auth";
import { checkApiRateLimit, rateLimitResponse } from "../../../../_lib/rate-limit";

export const runtime = "nodejs";

const notificationSelect =
  "*, rule:automation_rules(*), customer:customers(*), job:jobs(*, customer:customers(*), location:locations(*))";

interface ProviderResult {
  provider: NotificationDeliveryProvider;
  provider_message_id: string | null;
}

const KNOWN_SAFE_DELIVERY_ERRORS = new Set([
  "Notification delivery provider is unavailable",
  "Notification provider delivery failed",
]);

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

async function sendThroughProvider(
  notification: NotificationEvent,
): Promise<ProviderResult> {
  const readiness = getArrivalNotificationDeliveryReadiness(process.env);

  if (readiness.state === "misconfigured") {
    throw new Error("Notification delivery provider is unavailable");
  }

  const webhookUrl = process.env.NOTIFICATION_DELIVERY_WEBHOOK_URL;

  if (!webhookUrl || readiness.state === "disabled") {
    safeLogWarn("notification.delivery.manual_fallback", {
      job_id: notification.job_id,
      notification_id: notification.id,
      provider: "manual",
      route: "automation/notifications/deliver",
    });

    return {
      provider: "manual",
      provider_message_id: `manual-${notification.id}-${Date.now()}`,
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const webhookSecret = process.env.NOTIFICATION_DELIVERY_WEBHOOK_SECRET;

  if (webhookSecret) {
    headers.Authorization = `Bearer ${webhookSecret}`;
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify(buildNotificationDeliveryProviderPayload(notification)),
    headers,
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as {
    id?: string;
    message_id?: string;
  };

  if (!response.ok) {
    throw new Error("Notification provider delivery failed");
  }

  return {
    provider: "webhook",
    provider_message_id: responseBody.message_id ?? responseBody.id ?? null,
  };
}

async function updateDeliveryState(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  id: string,
  input: {
    delivered_at?: string | null;
    delivery_provider: NotificationDeliveryProvider | null;
    delivery_status: NotificationEvent["delivery_status"];
    last_delivery_error?: string | null;
    last_delivery_attempted_at?: string | null;
    next_attempts: number;
    provider_message_id?: string | null;
  },
) {
  const { data, error } = await client
    .from("notification_events")
    .update({
      delivered_at: input.delivered_at ?? null,
      delivery_attempts: input.next_attempts,
      delivery_provider: input.delivery_provider,
      delivery_status: input.delivery_status,
      last_delivery_attempted_at: input.last_delivery_attempted_at ?? null,
      last_delivery_error: input.last_delivery_error ?? null,
      provider_message_id: input.provider_message_id ?? null,
    })
    .eq("id", id)
    .select(notificationSelect)
    .single<NotificationEvent>();

  if (error) {
    throw error;
  }

  return data as NotificationEvent;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const auth = await getAdminAccess(request);

  if (auth.response) {
    return auth.response;
  }

  const { notificationId } = await params;

  if (
    await checkApiRateLimit({
      id: "arrival-notification-delivery",
      request,
      key: `arrival-notification-delivery:${auth.access.userId}:${notificationId}`,
    })
  ) {
    return rateLimitResponse();
  }

  const id = requireNonEmpty(notificationId, "Notification");
  const client = createServiceRoleSupabaseClient();
  const { data, error } = await client
    .from("notification_events")
    .select(notificationSelect)
    .eq("id", id)
    .single<NotificationEvent>();

  if (error || !data) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 },
    );
  }

  const notification = data as NotificationEvent;

  if (notification.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending notifications can be sent" },
      { status: 400 },
    );
  }

  if (notification.delivery_status === "sending") {
    return NextResponse.json(
      { error: "Notification delivery is already in progress" },
      { status: 409 },
    );
  }

  if (notification.delivery_status === "sent") {
    return NextResponse.json(
      { error: "Notification has already been sent" },
      { status: 409 },
    );
  }

  const nextAttempts = (notification.delivery_attempts ?? 0) + 1;
  const attemptedAt = new Date().toISOString();
  const sendingNotification = await updateDeliveryState(client, id, {
    delivery_provider: null,
    delivery_status: "sending",
    last_delivery_attempted_at: attemptedAt,
    last_delivery_error: null,
    next_attempts: nextAttempts,
    provider_message_id: null,
  });

  try {
    const result = await sendThroughProvider(sendingNotification);
    const event = await updateDeliveryState(client, id, {
      delivered_at: new Date().toISOString(),
      delivery_provider: result.provider,
      delivery_status: "sent",
      last_delivery_attempted_at: attemptedAt,
      last_delivery_error: null,
      next_attempts: nextAttempts,
      provider_message_id: result.provider_message_id,
    });

    return NextResponse.json({
      event,
      provider: result.provider,
      provider_message_id: result.provider_message_id,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Unable to send notification";
    const message = KNOWN_SAFE_DELIVERY_ERRORS.has(rawMessage)
      ? rawMessage
      : "Unable to send notification";
    const provider = process.env.NOTIFICATION_DELIVERY_WEBHOOK_URL
      ? "webhook"
      : "manual";

    safeLogError("notification.delivery.failed", {
      customer_id: notification.customer_id,
      error: rawMessage,
      job_id: notification.job_id,
      notification_id: notification.id,
      provider,
      route: "automation/notifications/deliver",
    });

    const event = await updateDeliveryState(client, id, {
      delivery_provider: provider,
      delivery_status: "failed",
      last_delivery_attempted_at: attemptedAt,
      last_delivery_error: message,
      next_attempts: nextAttempts,
      provider_message_id: null,
    });

    return NextResponse.json(
      {
        error: message,
        event,
        provider: event.delivery_provider,
        provider_message_id: null,
      },
      {
        status:
          message === "Notification delivery provider is unavailable"
            ? 503
            : 502,
      },
    );
  }
}
