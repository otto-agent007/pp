export type NotificationProviderReadinessState =
  | "ready"
  | "manual_fallback"
  | "missing_webhook_url"
  | "missing_webhook_secret"
  | "disabled"
  | "misconfigured";

export type StripeKeyMode = "live" | "missing" | "test" | "unknown";

export type StripePaymentProviderReadinessState =
  | "live_mode_approved"
  | "live_mode_blocked"
  | "manual_fallback"
  | "misconfigured"
  | "test_mode_ready";
