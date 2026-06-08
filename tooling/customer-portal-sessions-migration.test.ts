import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260608140600_customer_portal_sessions_v1.sql",
  ),
  "utf8",
).toLowerCase();

describe("customer portal sessions migration", () => {
  it("stores hashed HttpOnly session material with admin-only RLS", () => {
    expect(migration).toContain("create table if not exists public.customer_portal_sessions");
    expect(migration).toContain("token_id uuid not null references public.customer_portal_access_tokens");
    expect(migration).toContain("customer_id uuid not null references public.customers");
    expect(migration).toContain("session_hash text not null unique");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("last_used_at timestamptz");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain("alter table public.customer_portal_sessions enable row level security");
    expect(migration).toContain("private.has_admin_access()");
    expect(migration).not.toMatch(/\baccess_token\s+(text|varchar|uuid)\b/);
    expect(migration).not.toMatch(/\bsession_token\s+(text|varchar|uuid)\b/);
  });
});
