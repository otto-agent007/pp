# CR04 Application Layer Plan

**Goal:** create `packages/application`, lift 88 adapter-reaching declarations
out of thirteen `packages/domain` modules, repoint the eighteen app files that
import one, and give the package the conflict and terminal-failure semantics
`docs/architecture.md` requires of it.

**Controlled rebuild:** node `CR04` in `docs/rebuild/graph.json`. Base:
`b98e6f6388051193f258d2e35bc9be0611418b57`. Branch:
`codex/rebuild-cr04-application-v1`. Design:
[CR04 Application Layer Design](../specs/2026-09-08-controlled-rebuild-cr04-application-design.md).

**Approvals:** the controller scoped CR04 from measurement on 2026-09-08 (PRs
[#191](https://github.com/otto-agent007/pp/pull/191) and
[#192](https://github.com/otto-agent007/pp/pull/192)), choosing the temporary
`application-to-api-client` exception over full ports in this slice, and
choosing to preserve the `AuthSupabaseClient` signatures. Merge remains a
controller-approved gate; the `rebuild/cr04-source` tag publishes automatically.

## The extraction was derived, then checked, not hand-listed

The moving set is every exported declaration that reaches an adapter, computed
transitively through each module's own non-exported helpers and counting
`media.ts`'s dynamic `await import(…)` alongside static imports. That produced
88 declarations across thirteen modules — 21% of what those modules export.

Two completeness checks bracket the move:

- **Nothing lost.** The exported name set of each module before the move equals
  the union of its domain and application halves afterwards. 422 symbols, zero
  lost. This caught two re-export statements the first extraction dropped —
  `compliance.ts`'s `export type { ComplianceSetupReadiness } from
  "@pest-patrol/types"` and a five-name `export { … } from
  "./closeoutBillingRules"` in `payments.ts`, both multi-line and both invisible
  to a single-line parser.
- **Nothing left behind.** All thirteen modules end with zero adapter imports,
  which is what lets `domain-to-api-client` narrow to `offlineSync`'s three
  occurrences.

## Steps

### 1. Package and extraction

Create `packages/application` with the same shape as its siblings, plus the
`"types": ["node"]` and `@types/node` pair the last two slices established.
Register it in `tsconfig.base.json` paths.

Move each moving declaration byte-identical. Rebuild both barrels: prune the 88
moved names from `packages/domain/index.ts`, and generate
`packages/application/index.ts` from the moved set.

Helpers that straddle the seam: `requireNonEmpty` is byte-identical in all six
modules that share it to the one `packages/domain/index.ts` already exports, so
moved code imports it; `normalizeOptional` is exported from `jobs.ts` for the
one mover that needs it, rather than duplicated into application.

### 2. Consumers

Repoint the eighteen app files. Aliased imports (`requestPasswordReset as
requestPasswordResetDomain`) must be matched on the name before `as`, not the
whole entry.

Split the test mocks that no longer intercept: `apps/web`'s two scheduler route
tests (`vi.mock`) and `admin-auth-context.test.tsx` (`vi.doMock`, which also
needs a matching `vi.doUnmock`). Split `packages/domain/auth.test.ts` — eight of
its seventeen `it` blocks cover moved functions and move with them; it is the
only domain test that does.

### 3. Policy

Promote the application entry from `planned` to `required`. Narrow
`domain-to-api-client` to `offlineSync`'s three occurrences and reassign it to
CR06. Add `application-to-api-client` with its seventeen occurrences, expiring
in CR05.

Generate the occurrence facts with the checker's own
`collectWorkspaceArchitectureFacts` rather than hand-writing digests. Write the
file with a serializer and then run prettier on it — unlike
`docs/rebuild/graph.json`, this file *is* prettier-formatted.

### 4. Reclassify, and let CR03's guard prove itself

All thirteen modules stop being orchestration modules, so
`packages/domain/module-roles.json` must move them to `policyModules`, leaving
`offlineSync` alone.

Do not do this first. Run the guard before the edit and confirm it fails with
`auth is declared an orchestration module but imports no adapter; reclassify it
as policy rather than leaving it misfiled`. That failure is CR03's third
assertion doing exactly the job it was built for, and it is worth seeing once.

### 5. Conflict and terminal-failure semantics

Add `packages/application/mutationOutcome.ts` and its tests.
Provider-independent by construction: adapters map their provider's answer to a
`MutationFailureReason`, and this module decides retryability, identity reuse
and user recovery. See the design document for the table and the two rules.

### 6. Gates, promotion, verification

Run every declared check. `pnpm test` is the load-bearing one for the first time
in this stretch, and `pnpm architecture:check` must read 10 packages and 3
matched exceptions. Then the promotion commit, `pnpm rebuild:verify` on a clean
tree, evidence, and stop for merge approval.

## Ownership

```text
apps/mobile/src/store/{useAssignedJobs,useAuth,useChemicalInventory}.ts
apps/web/app/{admin-auth-context.tsx,technician-web-auth-context.tsx}
apps/web/app/api/automation/scheduler/{route.ts,manual/route.ts}
apps/web/hooks/*.ts (11 files)
docs/architecture.md
docs/rebuild/graph.json
docs/superpowers/{plans,specs}/2026-09-08-controlled-rebuild-cr04-application*.md
packages/application/**
packages/domain/**
tooling/architecture-boundaries.json
tsconfig.base.json
pnpm-lock.yaml
tasks/in-progress.md
```

Test files and mocks under `apps/web` that the move touched are inside the app
paths already owned.

## What this slice leaves

- **Ports.** CR05 defines them in `packages/application`, implements them in
  `api-client`, wires the composition roots, and removes
  `application-to-api-client`.
- **`offlineSync` and `domain-to-api-client`.** CR06.
- **`AuthSupabaseClient`.** Nineteen signatures still take a `SupabaseClient`.
  Retiring the provider type is part of CR05's port work; changing signatures
  and relocating code in one slice would mix two independent risks.
