import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  };
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-supabase-anon-key";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
