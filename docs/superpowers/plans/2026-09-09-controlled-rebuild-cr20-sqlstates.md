# CR20 Technician RPC Error Codes Plan

**Goal:** make the technician RPCs say what went wrong in a code rather than in
a sentence, so the durable offline queue's reason no longer depends on matching
English prose.

**Controlled rebuild:** node `CR20` in `docs/rebuild/graph.json`. Base:
`7f21bcaddfb175ec3e2ce36e57f51bcfaddd9f2b`. Branch:
`codex/rebuild-cr20-sqlstates-v1`.

**Approvals:** the controller made two decisions on 2026-09-09 — one application
code per reason, and code-first with the message matching retained as a
compatibility path.

## What measurement found

| | |
|---|---|
| RPCs on the offline-sync path | **2**, in one migration |
| Bare `raise exception` in those two | **12** |
| Migrations repo-wide raising with an `errcode` | **0** of 17 |
| Other callers of these RPCs | **none** outside `packages/api-client` |
| Gate mapping for `supabase/**` before this slice | **none** — every path reported `UNMAPPED` |
| `tooling/*.test.ts` files run by nothing | **7 of 14** |

**The message matching was not merely fragile, it was incapable.**
`record_assigned_job_geofence_event` raises `Assigned job geofence event is not
allowed` for two different things: the job is not assigned to this technician,
and the idempotent upsert matched a row belonging to someone else. They are the
same string, so no matcher can separate them. Only a code can.

**The mapping was also wrong before this slice.** CR19's fallback covered four
messages, all from the status RPC. Every geofence message fell through to the
`P0001` default of `invalid-intent`, so `Assigned job was not found` — a
`target-missing` — was being reported as an intent that could never be valid.

**No node had ever owned a `supabase` path, and it shows.**
`selectVerificationGates` has no rule for one, so a migration reports `UNMAPPED
changed path` and `pnpm rebuild:verify` fails. CR20's first-cut ownership listed
`supabase/migrations` but not `tooling/`, so it could not have fixed that — the
tenth instance of the recurring defect class, found before promotion.

**Seven of fourteen `tooling/*.test.ts` files are run by nothing.** The root
`test` script names seven files explicitly rather than globbing, and CI runs no
others. Among the orphans are two migration tests, an RLS boundary audit, and an
OWASP route inventory. A gate mapping that sends `supabase/**` to `pnpm test`
would have been a lie until this was fixed.

## Steps

### 1. Give every guard a code

A new migration re-declares both functions with `using errcode`. Four codes, one
per reason the RPCs need: `PP400` invalid-intent, `PP401` unauthorized, `PP404`
target-missing, `PP409` precondition-conflict. Class `PP` is unused by
PostgreSQL, whose PL/pgSQL codes are class `P0`, and is not one of the `PT`
codes PostgREST reinterprets as an HTTP status.

Both function bodies travel byte-identical apart from the added lines, proved by
reconstructing the original from the new file and comparing. Every message is
unchanged, so an app released before this migration still matches on text.

### 2. Read the code first, keep the text as a fallback

`SQLSTATE_REASONS` gains the four codes, so a migrated database never reaches the
message matcher. The matcher stays for the other skew direction — this app
against a database that has not yet migrated — and gains the geofence messages it
was missing. Its removal is not scheduled, because the condition for removing it
is that no client older than the migration is still running, and that is not
observable from this repository.

### 3. Make `supabase/**` verifiable at all

Map it to `pnpm test` and `git diff --check` in `selectVerificationGates`,
test-first. Then make that mapping true by adding the five orphaned tooling tests
that actually assert `supabase/` to the root `test` script.

### 4. Prove it fires

Seven injections, each required to produce a named failure or a demonstrable
silence.

## What CR20 deliberately does not do

**It does not adopt the other two orphaned tooling tests.**
`production-readiness-protection.test.ts` passes and
`owasp-api-route-inventory.test.ts` **fails** — Next API routes exist that its
inventory does not document. Neither reads `supabase/`, so neither is needed to
make this slice's gate honest, and wiring in a failing test would make CR20 red
for a reason that is not CR20's. Both are reported rather than absorbed.

**It does not add codes to the other 15 migrations.** Ten more bare raises exist
across the repository. None is on the offline-sync path, so none reaches the
queue's reason mapping.
