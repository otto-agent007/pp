import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The provider client every record function in this package is given.
 *
 * This module used to construct a Supabase client at import time and export it
 * as `supabase`, and most of this package reached for that module-level value
 * either directly or through a `client = supabase` default. CR09A removed it:
 * a composition root now creates the client and passes it in, so selecting a
 * provider is real for every adapter rather than only the ones that already
 * accepted an injected client.
 *
 * The composition roots are `apps/web/lib/supabase-browser.ts`,
 * `apps/mobile/src/lib/supabase.ts`, and the per-request server client in
 * `apps/web/app/api/_lib/server-auth.ts`.
 */
export type SupabaseProviderClient = SupabaseClient;
