import type {
  CustomerPortalProviderStatus,
  NotificationProviderStatus,
} from "@pest-patrol/types";

export type ProviderReadinessSurface = "notification" | "payment" | "portal";

export interface ProviderReadinessCopy {
  action: string;
  detail: string;
  label: string;
  stateLabel: string;
  summary: string;
}

type ProviderStatus =
  | CustomerPortalProviderStatus
  | NotificationProviderStatus
  | null
  | undefined;

function isWebhookReady(status: ProviderStatus) {
  return Boolean(
    status?.provider === "webhook" &&
      status.webhook_configured &&
      status.webhook_secret_configured,
  );
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

  if (isWebhookReady(status)) {
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
