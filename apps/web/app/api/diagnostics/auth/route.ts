import { NextResponse } from "next/server";

function parseSupabaseHost(value: string | undefined) {
  if (!value) {
    return {
      host: null,
      projectRef: null,
    };
  }

  try {
    const host = new URL(value).host;
    const projectRef = host.endsWith(".supabase.co")
      ? host.replace(".supabase.co", "")
      : null;

    return {
      host,
      projectRef,
    };
  } catch {
    return {
      host: "invalid-url",
      projectRef: null,
    };
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabase = parseSupabaseHost(supabaseUrl);

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    supabase_anon_key_configured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    supabase_project_ref: supabase.projectRef,
    supabase_service_role_configured: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    supabase_url_configured: Boolean(supabaseUrl),
    supabase_url_host: supabase.host,
  });
}
