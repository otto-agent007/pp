import {
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import { validateTechnicianInviteInput } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { checkApiRateLimit, rateLimitResponse } from "../_lib/rate-limit";
import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../_lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const technicians = await listTechnicianProfileRecords(client);

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error("Technician list failed", error);

    return NextResponse.json(
      { error: "Unable to load technicians" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess(request);

  if (adminAccess.response) {
    return adminAccess.response;
  }

  try {
    const input = validateTechnicianInviteInput(await request.json());

    // Supabase sends an invite email per call, so this is the one admin route
    // that turns a request into outbound mail against an address the caller
    // supplies. Without a limit, a single compromised or careless admin token
    // can use the project's mail reputation to blast arbitrary inboxes. Keyed
    // by admin and target so one admin's bulk onboarding of distinct
    // technicians is not throttled by an unrelated admin's.
    if (
      await checkApiRateLimit({
        id: "technician-invite",
        request,
        key: `technician-invite:${adminAccess.access.userId}:${input.email}`,
      })
    ) {
      return rateLimitResponse();
    }

    const redirectTo = new URL("/technician-login", request.url).toString();
    const client = createServiceRoleSupabaseClient();
    const result = await inviteTechnicianWithAdminClientRecord(client, {
      ...input,
      redirect_to: redirectTo,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Technician invite failed", error);

    return NextResponse.json(
      { error: "Unable to invite technician" },
      { status: 400 },
    );
  }
}
