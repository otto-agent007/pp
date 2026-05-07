import {
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import { validateTechnicianInviteInput } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  requireAdminAccess,
} from "../_lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = await requireAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const technicians = await listTechnicianProfileRecords(undefined, client);

    return NextResponse.json({ technicians });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load technicians";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const input = validateTechnicianInviteInput(await request.json());
    const redirectTo = new URL("/auth/update-password", request.url).toString();
    const client = createServiceRoleSupabaseClient();
    const result = await inviteTechnicianWithAdminClientRecord(client, {
      ...input,
      redirect_to: redirectTo,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to invite technician";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
