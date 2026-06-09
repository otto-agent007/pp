import {
  getPortalDeliveryProviderReadiness,
  toCustomerPortalProviderStatus,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { getAdminAccess } from "../../../_lib/server-auth";

export async function GET(request: Request) {
  const { response: authError } = await getAdminAccess(request);
  if (authError) {
    return authError;
  }

  const status = toCustomerPortalProviderStatus(
    getPortalDeliveryProviderReadiness(process.env),
  );

  return NextResponse.json(status);
}
