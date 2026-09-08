# CR01 Executable Architecture Foundation Design

## Purpose

CR01 establishes a machine-enforced architecture boundary for the Pest Patrol
controlled rebuild. It records the current workspace dependency debt exactly,
prevents new debt, and makes each later removal observable without moving code
that belongs to CR02 through CR06.

This slice starts from `3630dbb3ecaf4361dc059a974246e688f473bcf2` on
`codex/rebuild-cr01-foundation-v1`. That commit is the squash merge of recovery
PR #147 and is the reconciled predecessor for CR01.

## Goals

1. Make `docs/architecture.md` the canonical description of package roles and
   dependency direction.
2. Add a deterministic TypeScript architecture checker and versioned JSON
   policy.
3. Check both workspace manifests and TypeScript source imports. Neither view
   is sufficient alone in the current repository.
4. Preserve current behavior by representing every known violation as an
   exact exception with a responsible removal slice.
5. Reject new violations, drift in an exception's exact observed facts, and
   exceptions that remain after their debt is removed.
6. Reserve the future `@pest-patrol/application` and `@pest-patrol/sync`
   identities without creating those packages before CR04 and CR06.

## Non-goals

CR01 does not:

- edit application or package implementation code;
- create `packages/application` or `packages/sync`;
- change package dependencies, the lockfile, runtime behavior, schemas, RLS,
  migrations, providers, environments, previews, or production;
- remove existing dependency violations;
- enforce external-provider imports or UI workflow rules beyond the internal
  workspace dependency graph;
- replace the controlled-rebuild graph, reconciler, or verifier.

## Target package direction

The target dependency direction is inward toward stable policy:

```text
@pest-patrol/types
        ^
        |
@pest-patrol/domain
        ^
        |
@pest-patrol/application
       ^             ^
       |             |
@pest-patrol/api-client   @pest-patrol/sync
              \           /
               app composition roots
```

- `types` owns provider-independent shared contracts and has no Pest Patrol
  workspace dependency.
- `domain` owns pure business rules and may depend only on `types`.
- `application` owns ports and use cases and may depend on `domain` and
  `types`.
- `api-client` owns provider and persistence adapters and may depend on
  `application`, `domain`, and `types`.
- `sync` owns durable queue execution and retry orchestration and may depend on
  `application`, `domain`, and `types`; provider adapter wiring remains in app
  composition roots.
- web and mobile are composition roots. Shared presentation packages remain
  leaf libraries with explicit package-specific allowlists.

The versioned policy uses these exact allowlists. An allowlist is permission,
not a requirement that every listed edge already exist:

| Workspace package | Allowed Pest Patrol workspace dependencies |
| --- | --- |
| `@pest-patrol/types` | none |
| `@pest-patrol/domain` | `@pest-patrol/types` |
| `@pest-patrol/application` | `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/api-client` | `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/sync` | `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/types` |
| `@pest-patrol/i18n` | none |
| `@pest-patrol/ui-tokens` | none |
| `@pest-patrol/ui` | `@pest-patrol/ui-tokens` |
| `@pest-patrol/ui-native` | `@pest-patrol/ui-tokens` |
| `@pest-patrol/web` | `@pest-patrol/api-client`, `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/i18n`, `@pest-patrol/sync`, `@pest-patrol/types`, `@pest-patrol/ui`, `@pest-patrol/ui-tokens` |
| `@pest-patrol/mobile` | `@pest-patrol/api-client`, `@pest-patrol/application`, `@pest-patrol/domain`, `@pest-patrol/i18n`, `@pest-patrol/sync`, `@pest-patrol/types`, `@pest-patrol/ui-native`, `@pest-patrol/ui-tokens` |

Each allowed edge also records its allowed manifest sections. Every initial
edge permits only `dependencies`. `devDependencies`, `peerDependencies`, and
`optionalDependencies` are never implicit alternatives; a future policy
change must explicitly permit the section for that exact edge.

CR01 records this destination but does not claim that the current repository
already conforms.

## Policy data

Create `tooling/architecture-boundaries.json` with schema version `1`. It is
data, not executable policy hidden in the checker. The file contains:

- every current workspace package name and repository-relative directory;
- reserved entries for `@pest-patrol/application` and
  `@pest-patrol/sync`, marked `planned` so their absence is valid;
- the exact allowed Pest Patrol workspace dependencies for each package;
- exact exception records for current violations.

Each exception identifies:

- a stable exception ID;
- the violation kind;
- importer and dependency package names;
- the exact sorted source occurrences that exhibit the edge, including path,
  canonical module specifier, syntax form, type-only versus value use, count,
  and a digest of normalized imported bindings;
- the observed manifest section and exact version specifier, or their absence;
- the controlled-rebuild node that must remove it;
- a short reason.

The initial policy has two debt groups:

1. `domain-to-api-client`, removed by CR08 after the pure domain, application,
   adapter, and sync foundations exist. CR03 may introduce the pure domain core
   and compatibility exports, but it cannot safely migrate all current
   app-facing and offline-sync use cases before their destination boundaries
   exist. The forbidden manifest edge is declared in
   `packages/domain/package.json`, and imports currently appear in these exact
   files:

   - `packages/domain/auth.ts`
   - `packages/domain/automation.ts`
   - `packages/domain/closeouts.ts`
   - `packages/domain/compliance.ts`
   - `packages/domain/customers.ts`
   - `packages/domain/forms.ts`
   - `packages/domain/geofencing.ts`
   - `packages/domain/inventory.ts`
   - `packages/domain/jobs.ts`
   - `packages/domain/media.ts`
   - `packages/domain/offlineSync.test.ts`
   - `packages/domain/offlineSync.ts`
   - `packages/domain/payments.ts`
   - `packages/domain/technicianLicenses.ts`
   - `packages/domain/technicians.ts`

2. `api-client-domain-manifest`, removed by CR05. The target architecture
   permits `api-client` to depend inward on `domain`, but
   `packages/api-client/package.json` does not declare the dependency while
   these exact files import it:

   - `packages/api-client/demoSeed.test.ts`
   - `packages/api-client/demoSeed.ts`

An exception matches only when all recorded facts match. A new or removed
occurrence, import-form change, type-to-value change, normalized-binding digest
change, manifest section or version change, missing removal node, or already
resolved violation is an error. This prevents an already excepted file from
silently accumulating more debt.

The removal node must exist and have status `planned`, `ready`, or `running`.
`blocked`, `done`, `abandoned`, and `superseded` removal nodes invalidate the
exception and require an explicit reassignment; replacements are never
inherited. Before a removal node may become `ready` or `running`, its graph
ownership must cover the policy file, the affected package manifest, and every
recorded source path. Future slices may change the policy only when their
promoted graph ownership explicitly includes it.

## Checker architecture

Create `tooling/architecture-boundaries.ts` with three separate concerns:

1. `validateArchitecturePolicy(value)` is pure and returns deterministic,
   sorted human-readable errors for malformed or contradictory policy data.
2. `collectWorkspaceArchitectureFacts(cwd)` reads workspace manifests and uses
   the existing TypeScript compiler API to collect string-literal imports,
   exports, `import()` calls, and `require()` calls from `.ts` and `.tsx`
   files. Generated outputs and `node_modules` are excluded.
3. `validateArchitectureFacts(policy, facts, rebuildGraph)` compares observed
   facts with the policy and exception set. It returns errors without mutating
   files or policy.

The CLI reads `tooling/architecture-boundaries.json` and
`docs/rebuild/graph.json`, prints every deterministic error, and exits nonzero
on any violation. `package.json` exposes it as `pnpm architecture:check`.

The checker treats type-only imports as dependency edges. It normalizes Pest
Patrol subpath imports to their owning workspace package. External packages
and relative imports are outside this slice's dependency-direction policy.

Each occurrence is classified as production value, production type-only,
test-only value, or test-only type. A production occurrence must be declared
in an explicitly allowed `dependencies`, `peerDependencies`, or
`optionalDependencies` section for that edge and may never be satisfied only
by `devDependencies`. A test-only occurrence may use `devDependencies` only
when that section is explicitly allowed for the edge. Peer and optional usage
are accepted only when the exact edge policy names those sections; the checker
does not infer intent from syntax. If several occurrence classes exist for one
edge, all applicable section rules must pass.

## Required failures

The checker fails when it observes any of the following:

- malformed JSON or unsupported policy schema;
- duplicate or non-normalized package names, paths, exception IDs, or source
  paths;
- a discovered workspace package missing from policy;
- a required package missing from disk or a planned package already present
  with facts that policy does not describe;
- a forbidden internal dependency in a manifest or source file;
- a source dependency missing from an explicitly allowed manifest section;
- a runtime or production type edge satisfied only by `devDependencies`, or an
  edge present in a manifest section not explicitly allowed by policy;
- an exception whose observed facts differ in either direction;
- an exception assigned to an unknown, blocked, done, abandoned, or superseded
  removal node;
- a ready or running removal node whose ownership does not cover the policy,
  affected manifest, and exact source paths;
- any new violation without an exact exception.

Errors include the package edge and relevant repository-relative paths. The
checker never edits policy automatically and never offers a flag that accepts
new debt.

## Documentation

Implementation updates:

- `docs/architecture.md` with the canonical package responsibility and data
  flow contract;
- `docs/DECISIONS.md` to record the incremental strangler approach: freeze
  debt first, remove it in owned slices;
- `docs/PATTERNS.md` to replace the incorrect rule that Supabase calls belong
  in domain logic with the adapter boundary from `docs/AGENTS.md`.

The detailed scheduler and lifecycle policy remain only in
`docs/rebuild/README.md`.

## Testing strategy

`tooling/architecture-boundaries.test.ts` covers pure policy validation,
manifest/source fact comparison, TypeScript import forms, package discovery,
and CLI behavior with temporary fixtures. Every executable behavior follows
RED, GREEN, REFACTOR.

At minimum, tests prove that the checker:

- accepts the exact initial repository debt;
- rejects a new forbidden source or manifest edge;
- rejects an undeclared source dependency;
- rejects added, removed, duplicated, or stale exception facts;
- rejects same-file occurrence growth, type-to-value changes, normalized
  binding changes, and manifest version drift;
- handles type imports, re-exports, dynamic imports, and literal `require`;
- distinguishes production, test-only, peer, optional, and wrong-section
  dependency declarations;
- permits absent planned application and sync packages;
- rejects an unmanaged new workspace package;
- rejects blocked, done, abandoned, and superseded removal nodes, and validates
  removal-node ownership before promotion;
- reports deterministic errors and nonzero CLI exit status.

The root `test` command includes the new focused test file, so existing CI
executes the architecture tests. `pnpm architecture:check` validates the live
repository rather than only fixtures.

## CR01 files and ownership

CR01 owns only:

- `docs/architecture.md`
- `docs/DECISIONS.md`
- `docs/PATTERNS.md`
- `docs/rebuild/graph.json`
- `docs/superpowers/specs/2026-08-25-controlled-rebuild-cr01-foundation-design.md`
- `docs/superpowers/plans/2026-08-25-controlled-rebuild-cr01-foundation.md`
- `package.json`
- `tasks/in-progress.md`
- `tooling/architecture-boundaries.json`
- `tooling/architecture-boundaries.ts`
- `tooling/architecture-boundaries.test.ts`

No directory-wide ownership is implied.

## Verification and completion

The node-declared checks are:

```text
pnpm exec vitest run tooling/architecture-boundaries.test.ts
pnpm architecture:check
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
git diff --check
```

After the final implementation commit, run `pnpm rebuild:verify` separately;
the verifier itself is not a recursive node-declared gate. Completion also
requires an independent architecture review, a clean worktree bound to commit
and tree identity, controller approval before publication, a pushed immutable
`rebuild/cr01-source` tag at the canonical PR head before merge, and a draft
PR. CR01 does not authorize merging itself.
