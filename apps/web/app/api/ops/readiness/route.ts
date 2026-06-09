import {
  getNotificationProviderReadiness,
  getPortalDeliveryProviderReadiness,
  getStripePaymentProviderReadiness,
  toCustomerPortalProviderStatus,
  toNotificationProviderStatus,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { getAdminAccess } from "../../_lib/server-auth";

function configured(value?: string | null) {
  return Boolean(value?.trim());
}

export async function GET(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  const stripe = getStripePaymentProviderReadiness(process.env);
  const portalDelivery = toCustomerPortalProviderStatus(
    getPortalDeliveryProviderReadiness(process.env),
  );
  const notificationDelivery = toNotificationProviderStatus(
    getNotificationProviderReadiness(process.env),
  );

  return NextResponse.json({
    compliance: {
      openai_key_configured: configured(process.env.OPENAI_API_KEY),
      source_ingestion: {
        external_calls: false,
        status: configured(process.env.OPENAI_API_KEY)
          ? "static_ready"
          : "manual_fallback",
      },
    },
    notification_delivery: notificationDelivery,
    portal_delivery: portalDelivery,
    stripe,
    supabase: {
      anon_key_configured: configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      service_role_configured: configured(process.env.SUPABASE_SERVICE_ROLE_KEY),
      url_configured: configured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
  });
}
