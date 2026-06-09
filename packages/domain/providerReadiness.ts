import type {
  CustomerPortalProviderStatus,
  NotificationDeliveryProvider,
  NotificationProviderReadinessState,
  NotificationProviderStatus,
} from "@pest-patrol/types";

export type ProviderReadinessSurface = "notification" | "payment" | "portal";
export type NotificationDeliveryMode = "arrival" | "notification" | "portal";

export interface ProviderReadinessCopy {
  action: string;
  detail: string;
  label: string;
  stateLabel: string;
  summary: string;
}

export interface NotificationDeliveryEnv {
  NODE_ENV?: string | null;
  VERCEL_ENV?: string | null;
  NOTIFICATION_DELIVERY_DISABLED?: string | null;
  NOTIFICATION_DELIVERY_WEBHOOK_SECRET?: string | null;
  NOTIFICATION_DELIVERY_WEBHOOK_URL?: string | null;
  PORTAL_DELIVERY_DISABLED?: string | null;
  PORTAL_DELIVERY_WEBHOOK_SECRET?: string | null;
  PORTAL_DELIVERY_WEBHOOK_URL?: string | null;
}

export interface NotificationDeliveryReadiness {
  manual_fallback: boolean;
  provider: NotificationDeliveryProvider;
  state: NotificationProviderReadinessState;
  webhook_configured: boolean;
  webhook_secret_configured: boolean;
}

type ProviderStatus =
  | CustomerPortalProviderStatus
  | NotificationProviderStatus
  | null
  | undefined;

function isEnabled(value?: string | null) {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

function isProductionLike(env: NotificationDeliveryEnv) {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function validateNotificationDeliveryConfig(
  env: NotificationDeliveryEnv = {},
  mode: NotificationDeliveryMode = "notification",
): NotificationDeliveryReadiness {
  const isPortal = mode === "portal";
  const disabled = isPortal
    ? isEnabled(env.PORTAL_DELIVERY_DISABLED)
    : isEnabled(env.NOTIFICATION_DELIVERY_DISABLED);
  const webhookUrl = normalizeOptional(
    isPortal
      ? env.PORTAL_DELIVERY_WEBHOOK_URL
      : env.NOTIFICATION_DELIVERY_WEBHOOK_URL,
  );
  const webhookSecret = normalizeOptional(
    isPortal
      ? env.PORTAL_DELIVERY_WEBHOOK_SECRET
      : env.NOTIFICATION_DELIVERY_WEBHOOK_SECRET,
  );

  if (disabled) {
    return {
      manual_fallback: true,
      provider: "manual",
      state: "disabled",
      webhook_configured: Boolean(webhookUrl),
      webhook_secret_configured: Boolean(webhookSecret),
    };
  }

  if (!webhookUrl) {
    return {
      manual_fallback: true,
      provider: "manual",
      state: "manual_fallback",
      webhook_configured: false,
      webhook_secret_configured: Boolean(webhookSecret),
    };
  }

  if (!webhookSecret) {
    return {
      manual_fallback: isProductionLike(env),
      provider: "webhook",
      state: isProductionLike(env) ? "misconfigured" : "missing_webhook_secret",
      webhook_configured: true,
      webhook_secret_configured: false,
    };
  }

  return {
    manual_fallback: false,
    provider: "webhook",
    state: "ready",
    webhook_configured: true,
    webhook_secret_configured: true,
  };
}

export function getNotificationProviderReadiness(
  env: NotificationDeliveryEnv = {},
) {
  return validateNotificationDeliveryConfig(env, "notification");
}

export function getArrivalNotificationDeliveryReadiness(
  env: NotificationDeliveryEnv = {},
) {
  return validateNotificationDeliveryConfig(env, "arrival");
}

export function getPortalDeliveryProviderReadiness(
  env: NotificationDeliveryEnv = {},
) {
  return validateNotificationDeliveryConfig(env, "portal");
}

export function toNotificationProviderStatus(
  readiness: NotificationDeliveryReadiness,
): NotificationProviderStatus {
  return {
    manual_fallback: readiness.manual_fallback,
    provider: readiness.provider,
    readiness_state: readiness.state,
    webhook_configured: readiness.webhook_configured,
    webhook_secret_configured: readiness.webhook_secret_configured,
  };
}

export function toCustomerPortalProviderStatus(
  readiness: NotificationDeliveryReadiness,
): CustomerPortalProviderStatus {
  return {
    manual_fallback: readiness.manual_fallback,
    provider: readiness.provider,
    readiness_state: readiness.state,
    webhook_configured: readiness.webhook_configured,
    webhook_secret_configured: readiness.webhook_secret_configured,
  };
}

function statusState(status: ProviderStatus): NotificationProviderReadinessState {
  if (status?.readiness_state) {
    return status.readiness_state;
  }

  if (
    status?.provider === "webhook" &&
    status.webhook_configured &&
    status.webhook_secret_configured
  ) {
    return "ready";
  }

  return "manual_fallback";
}

export function getProviderReadinessCopy(
  surface: ProviderReadinessSurface,
  status?: ProviderStatus,
): ProviderReadinessCopy {
  if (surface === "payment") {
    return {
      action:
        "Payment links and webhook receipts remain deferred until provider setup is approved.",
      detail:
        "Invoices and manual paid status still work for non-payment demos without Stripe.",
      label: "Manual payment fallback is active for provider-free demos.",
      stateLabel: "Manual fallback accepted",
      summary:
        "Payment links and webhook receipts stay deferred until provider setup is approved.",
    };
  }

  const state = statusState(status);

  if (state === "ready") {
    return {
      action:
        "Use approved preview smoke to prove provider delivery before adding receipt or retry follow-ups.",
      detail:
        "Provider delivery is configured. Keep receipts evidence-gated until provider smoke passes.",
      label:
        surface === "portal"
          ? "Webhook portal delivery"
          : "Webhook notification delivery",
      stateLabel: "Webhook configured",
      summary:
        "Provider delivery is configured, but receipts remain evidence-gated until provider smoke passes.",
    };
  }

  if (state === "misconfigured" || state === "missing_webhook_secret") {
    return {
      action:
        "Use manual follow-up until the approved webhook secret is configured.",
      detail:
        "A provider URL is present, but the matching secret is missing. Secret values are not shown.",
      label: "Webhook secret required",
      stateLabel: "Provider misconfigured",
      summary:
        "Manual follow-up is active because provider delivery is not fully configured.",
    };
  }

  if (state === "disabled") {
    return {
      action:
        "Use manual follow-up while provider delivery is intentionally disabled.",
      detail:
        "Provider delivery has been disabled by configuration. Manual fallback remains available.",
      label: "Provider delivery disabled",
      stateLabel: "Disabled",
      summary:
        "Manual follow-up is active because provider delivery is disabled.",
    };
  }

  if (surface === "notification") {
    return {
      action:
        "Webhook delivery and receipts remain deferred until provider setup is approved.",
      detail:
        "Manual notification follow-up stays available without changing provider settings.",
      label: "Manual fallback accepted",
      stateLabel: "Manual fallback accepted",
      summary:
        "Manual notification follow-up stays available without changing provider settings.",
    };
  }

  return {
    action:
      "Use manual portal sharing for provider-free demos; keep delivery receipts deferred until webhook-backed evidence exists.",
    detail:
      "Manual fallback accepted. Copy and share links manually; provider sends stay hidden until webhook mode is approved.",
    label: "Manual portal sharing",
    stateLabel: "Manual fallback accepted",
    summary:
      "Portal links can be copied and shared manually without changing provider settings.",
  };
}
