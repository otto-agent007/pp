# CR03 Domain Purity Seam Design

## Purpose

`packages/domain` is supposed to depend only on `@pest-patrol/types`. It does
not. Fourteen of its thirty production modules import `@pest-patrol/api-client`
for eighty distinct symbols — `AuthSupabaseClient` plus seventy-nine `*Record`
adapter functions — which the `domain-to-api-client` boundary exception permits
until CR04 removes it.

Those fourteen modules are not domain rules reaching for a helper. They
orchestrate adapter calls, which `docs/architecture.md` assigns to
`@pest-patrol/application`. That package does not exist until CR04, so the
coupling cannot clear in CR03; the re-scope in PR #188 moved that outcome to
CR04 and left CR03 the job of making the seam explicit and enforceable.

CR03 therefore records which modules are pure policy and which orchestrate
adapters, guards that record against drift, and hands CR04 a declared
extraction boundary rather than one inferred at extraction time.

This slice starts from `d4199f7` on `main`, the merge of the re-scope PR #188
and the reconciled predecessor for CR03.

## Goals

1. Declare, in a versioned manifest, the role of every production module in
   `packages/domain`.
2. Guard the declaration so a policy module cannot silently acquire an adapter
   import, and an orchestration module cannot silently stop being one.
3. Leave the extraction boundary in a form CR04 can act on and diff against.

## Non-goals

CR03 does not:

- remove or reduce the `domain-to-api-client` coupling — that is CR04;
- create `packages/application`;
- move, rename, or edit any domain module's logic;
- change the boundary policy, the two recorded exceptions, or their removal
  slices;
- change package dependencies, the lockfile, runtime behavior, schemas, RLS,
  migrations, providers, environments, previews, or production.

## What the package actually imports

`packages/domain` reaches outside itself for exactly three specifiers:

| Specifier | Occurrences | Meaning |
| --- | --- | --- |
| `@pest-patrol/types` | 46 | the allowed dependency |
| `vitest` | 30 | test framework, test files only |
| `@pest-patrol/api-client` | 19 | the exception |

There is no direct provider SDK import anywhere in the package — no
`@supabase/*`, no `stripe`. The coupling is entirely mediated through
`api-client`, which is what makes a single-specifier seam sufficient today and
why the manifest still names the provider SDKs it forbids: they are the shape
the next violation would take.

## The declared split

Sixteen policy modules, fourteen orchestration modules, no module in both and
none unclassified:

**Policy** — `closeoutBillingRules`, `customerLedger`, `demoReadiness`,
`demoSeedData`, `demoSmokePreflight`, `demoWorkflowFixtures`,
`estimateConversion`, `homeCommandCenter`, `jobClassification`,
`mobileWorkModes`, `offlineQueue`, `productionReadiness`, `providerReadiness`,
`safeLogging`, `serviceBillingCatalog`, `wdoEscrowClearance`.

**Orchestration** — `auth`, `automation`, `closeouts`, `compliance`,
`customers`, `forms`, `geofencing`, `inventory`, `jobs`, `media`,
`offlineSync`, `payments`, `technicianLicenses`, `technicians`.

The split is 8,399 lines of policy against 9,644 lines of orchestration, so
CR04's extraction is roughly half the package rather than a fringe.

`index.ts` is excluded from the classification and checked separately: it is
the package barrel, it imports no adapter today, and it must not start.

## Why a manifest rather than a derived list

A module's role is derivable — it orchestrates if it imports an adapter — but a
derived list cannot fail. If someone adds an adapter import to
`serviceBillingCatalog`, a derived classifier simply reclassifies it and stays
green, which is precisely the drift CR03 exists to prevent.

Declaring the roles makes the same event a test failure. It also gives CR04 a
list to work from and to diff against as it empties modules out, rather than a
boundary rediscovered by grep at extraction time.

The manifest is `packages/domain/module-roles.json`, following CR01's shape of
a versioned JSON policy validated by executable code, at package scale.

## Guard

`packages/domain/moduleRoles.test.ts`, reading source text with the TypeScript
compiler API as CR01's checker and CR02's surface guard both do:

1. the manifest partitions the package — every production module except
   `index.ts` appears exactly once, and no declared module is missing from
   disk;
2. no policy module imports a forbidden specifier, in its production file **or**
   its test;
3. every orchestration module does import one — a module that stops
   orchestrating must be reclassified, not left misfiled;
4. `index.ts` imports no forbidden specifier.

Assertion 3 is what keeps the boundary honest during CR04. As orchestration is
lifted out, each emptied module fails until it is moved to the policy list, so
the manifest tracks the extraction instead of decaying behind it.

Assertion 2 covering tests costs nothing today: all sixteen policy modules have
test files and none of them imports `api-client`, so the guard starts green
with no exception list.

## Verification

```text
pnpm exec vitest run packages/domain/moduleRoles.test.ts
pnpm architecture:check
pnpm exec vitest run tooling/rebuild-graph.test.ts \
  tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
pnpm security:audit
git diff --check
```

`pnpm architecture:check` must still report two matched exceptions: CR03
changes no import, so the coupling it documents is unchanged. A drop to one
would mean the slice removed coupling it was scoped not to touch.

## Risks

- **A misclassified module.** The guard's assertion 3 catches an orchestration
  module that does not orchestrate; assertion 2 catches a policy module that
  does. Together they make the manifest checkable rather than asserted.
- **The guard passing vacuously.** Proven by injection rather than assumed: a
  policy module given an adapter import, and an orchestration module with its
  adapter import removed, must each fail.
