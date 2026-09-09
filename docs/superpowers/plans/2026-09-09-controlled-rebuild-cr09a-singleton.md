# CR09A Singleton Removal Plan

**Goal:** remove the module-level `supabase` client from
`packages/api-client`, give `apps/web` the browser composition root it never
had, and drop the `supabase` re-export from the package's public surface — so
selecting a provider at a composition root is real for every adapter rather
than real for the ones that accepted a client and nominal for the rest.

**Controlled rebuild:** node `CR09A` in `docs/rebuild/graph.json`, the first
`kind: "task"` node the chain has run. Base:
`1d28d5c1a3c2429d6c482803bf5c7a92aaeaa020`. Branch:
`codex/rebuild-cr09a-singleton-v1`.

**Approvals:** decomposed from CR09 on 2026-09-09 under its
`decompose into parallel write-tasks at promotion` approval (PR #208), split by
application so ownership does not overlap CR09B. The node's own approval records
that `checks` must name `pnpm typecheck` explicitly, because
`selectVerificationGates` maps `packages/**` and `apps/**` to `pnpm test` alone
and turbo's `test` task does not depend on `typecheck` — for a refactor of 87
signatures the compiler is the gate that matters.

## What was actually there

Measured on `1d28d5c`, and unchanged from the measurement recorded on the node:

- **87 exported functions reached the singleton.** 27 took no client at all, 60
  took it as a default parameter value (`client: X = supabase`, CR05's wrap),
  and 7 already required one.
- **`createCustomersAdapter()` took no client parameter at all** — the one
  adapter factory that could never be selected.
- **`apps/web` had no browser client.** Its two auth contexts imported the
  package's own singleton and passed it back in; fourteen hook call sites passed
  nothing. `apps/mobile` already passed `mobileSupabase` everywhere, and the API
  routes already built a per-request client, so the gap was the web browser
  only.

## Steps

### 1. Make the client a required argument everywhere

Delete the client `supabase.ts` constructed and leave it exporting the type the
package needs (`SupabaseProviderClient`). Drop every `= supabase` default, give
every client-less function a client parameter, and thread it through the
internal callers — the `getAccessToken` helpers in `automation.ts`,
`portal.ts` and `technicians.ts`, `createInvoiceRecord`'s call to
`getInvoiceRecord`, and `listTechnicianProfiles`.

Two functions took an optional argument before their new client
(`listTechnicianProfileRecords`, `listTechnicianLicenseRecords`); a required
parameter cannot follow an optional one, so their client goes first, matching
`auth.ts`. `runDemoSeedActionRecord` loses the overload that existed only to
supply the singleton.

### 2. Bind the client at every adapter factory

Every factory in `adapters.ts` takes its client as a required argument, and each
port method passes it to the record function it wraps.

### 3. Create the web composition root

Add `apps/web/lib/supabase-browser.ts`, the counterpart of
`apps/mobile/src/lib/supabase.ts`, and pass `browserSupabase` at all eighteen
adapter constructions — sixteen in the hooks, two in the auth contexts — and to
the demo-seed and estimate-conversion record functions the hooks call
directly. Extend the app's lint script to cover the new
directory, which its globs did not reach.

### 4. Guard it rather than describe it

Two test files, because a requirement recorded where no gate reads it is this
chain's most repeated defect:

- `packages/api-client/supabase.test.ts` fails if any module in the package
  constructs a client, if the package exports a client-valued binding, or if an
  adapter factory defaults its client again (`Function.length` drops to 0).
- `apps/web/lib/supabase-browser.test.ts` fails if a browser adapter is built
  with anything but `browserSupabase`, if a second browser client appears, or if
  server code imports the browser's.

Both were proved to fire by injecting the regression they describe.

### 5. Repoint the documentation at what is now true

`docs/architecture.md`'s "Provider selection is only half real until CR09A"
section recorded the limitation this task removes, and names the guards now.

## Scope note

`tooling/compliance-ingest.ts` is in scope and in ownership. It passes a
possibly-undefined client into `upsertComplianceSourceRecord` and two siblings,
which the singleton's disappearance turns into a type error; its dry-run path is
the case with no client, so naming that in the loop is what gives the compiler
the narrowing. `docs/architecture.md` is in ownership for the same reason: the
task's own deliverable makes the recorded limitation false.
