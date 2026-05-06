import { getProfileRecord } from "@pest-patrol/api-client";
import { validateAdminAccess } from "@pest-patrol/domain";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface AdminAccess {
  userId: string;
}

export function createServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function getAdminAccess(request: Request): Promise<
  | {
      access: AdminAccess;
      response: null;
    }
  | {
      access: null;
      response: NextResponse;
    }
> {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return {
      access: null,
      response: NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      access: null,
      response: NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 },
      ),
    };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  try {
    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user) {
      return {
        access: null,
        response: NextResponse.json(
          { error: "Authentication is required" },
          { status: 401 },
        ),
      };
    }

    const profile = await getProfileRecord(client, data.user.id);
    validateAdminAccess({ profile, session: {} as never });

    return {
      access: {
        userId: data.user.id,
      },
      response: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    return {
      access: null,
      response: NextResponse.json({ error: message }, { status: 403 }),
    };
  }
}

export async function requireAdminAccess(request: Request) {
  const result = await getAdminAccess(request);

  return result.response;
}
