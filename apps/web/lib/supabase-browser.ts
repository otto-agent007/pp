import { createClient } from "@supabase/supabase-js";

/**
 * The web app's browser composition root.
 *
 * `packages/api-client` used to construct this client itself, at import time,
 * and every adapter that took no client reached for it. That made provider
 * selection nominal here: the two auth contexts imported the package's own
 * client and handed it back, and fourteen hooks passed nothing at all. CR09A
 * removed that singleton, so the client the browser uses is created here — the
 * web counterpart of `apps/mobile/src/lib/supabase.ts` — and passed into every
 * adapter factory.
 *
 * Server code does not use this client. API routes build a per-request client
 * in `apps/web/app/api/_lib/server-auth.ts`, bound to the caller's token or to
 * the service role.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase Environment Variables");
}

export const browserSupabase = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseAnonKey ?? "missing-supabase-anon-key",
  {
    auth: {
      detectSessionInUrl: false,
    },
  },
);
