import { getStripePaymentProviderReadiness } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { getAdminAccess } from "../../_lib/server-auth";

export async function GET(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  return NextResponse.json(getStripePaymentProviderReadiness(process.env));
}
