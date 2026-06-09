import { describe, expect, it } from "vitest";

import {
  getNotificationProviderReadiness,
  getPortalDeliveryProviderReadiness,
} from "./providerReadiness";

describe("notification provider readiness", () => {
  it("uses manual fallback when a provider webhook URL is missing", () => {
    expect(getNotificationProviderReadiness({ NODE_ENV: "test" })).toEqual({
      manual_fallback: true,
      provider: "manual",
      state: "manual_fallback",
      webhook_configured: false,
      webhook_secret_configured: false,
    });
  });

  it("treats production webhook URL without a secret as misconfigured", () => {
    expect(
      getPortalDeliveryProviderReadiness({
        NODE_ENV: "production",
        PORTAL_DELIVERY_WEBHOOK_URL: "https://provider.example/send",
      }),
    ).toMatchObject({
      manual_fallback: true,
      provider: "webhook",
      state: "misconfigured",
      webhook_configured: true,
      webhook_secret_configured: false,
    });
  });

  it("allows local webhook URL without a secret without crashing", () => {
    expect(
      getNotificationProviderReadiness({
        NODE_ENV: "test",
        NOTIFICATION_DELIVERY_WEBHOOK_URL: "https://provider.example/send",
      }),
    ).toMatchObject({
      manual_fallback: false,
      provider: "webhook",
      state: "missing_webhook_secret",
    });
  });
});
