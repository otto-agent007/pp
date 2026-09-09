import {
  inviteTechnicianWithAdminClientRecord,
  listTechnicianProfileRecords,
} from "@pest-patrol/api-client";
import { validateTechnicianInviteInput } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

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
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const input = validateTechnicianInviteInput(await request.json());
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
