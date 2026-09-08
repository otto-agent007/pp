# CR02 Bounded-Context Shared Types Design

## Purpose

`packages/types` is the root of the target dependency direction: every other
Pest Patrol package may depend on it and it may depend on none of them. Today
it is a single 1370-line `index.ts` holding 175 exported type declarations for
every context in the product at once — technicians, customers, jobs, billing,
compliance, the customer portal, the offline queue. Nothing in the file records
which contract belongs to which concern, so the package that CR01 named the
canonical home of "provider-independent shared contracts" cannot say what any
of those contracts are about.

CR02 splits that file into bounded-context modules and keeps the root entry as
a compatibility barrel, so every existing consumer import continues to resolve
unchanged.

This slice starts from `47fdc35ae0169d0c2c88cd399626794682fd230a` on `main`,
the merge of CR01's reconciliation PR #185 and the reconciled predecessor for
CR02.

## Goals

1. Give every one of the 175 exported declarations exactly one owning
   bounded-context module, named from the vocabulary `packages/domain` and
   `packages/api-client` already use.
2. Keep `packages/types/index.ts` exporting the identical public surface, so
   no consumer file changes.
3. Make the split's dependency direction acyclic and prove it, rather than
   relying on TypeScript's tolerance of circular type-only imports.
4. Add the package's first test: an executable guard that the public surface is
   exactly the frozen set of 175 names and that the context modules partition
   it without overlap.

## Non-goals

CR02 does not:

- change any type's definition, name, or shape — every declaration moves
  byte-identical;
- edit any consumer of `@pest-patrol/types`;
- add subpath entry points (see "Why the barrel stays the only entry");
- create `packages/application` or `packages/sync`, which are CR04 and CR06;
- touch the two recorded boundary exceptions, which expire in CR05 and CR09;
- change package dependencies, the lockfile, runtime behavior, schemas, RLS,
  migrations, providers, environments, previews, or production.

## Why this is a compile-time-only change

All 175 declarations are `export type` or `export interface`. The package
contains no `const`, `function`, `class`, or `enum`, so it emits nothing at
runtime and every import of it is erased. Moving a declaration between files in
this package therefore cannot change behavior; it can only change what the type
checker resolves. That is why the gates that matter here are `pnpm typecheck`
and `pnpm build`, and why the compatibility guard has to be executable rather
than inferred from a green build of the package alone.

## The context partition

Twenty modules, each a flat `*.ts` file at the package root beside `index.ts`,
matching the layout of `packages/domain` and `packages/api-client`. Module
names reuse those packages' existing names wherever the concern already has
one, so the split introduces no new vocabulary.

| Module | Owns | Depends on |
| --- | --- | --- |
| `technicians.ts` | `UserRole`, `TechnicianStatus`, `UserProfile`, `TechnicianProfile`, invite input/result | none |
| `technicianLicenses.ts` | licence type, branch, status, record, input | `compliance`, `technicians` |
| `customers.ts` | customer, location, property type, location units | none |
| `serviceBillingCatalog.ts` | job purpose/cadence/disposition/estimate vocabulary, offering catalog, inference, guidance | none |
| `jobClassification.ts` | `JobClassification` | `serviceBillingCatalog` |
| `jobs.ts` | `JobStatus`, `Job`, `JobInput`, unit-audit items | `customers`, `serviceBillingCatalog`, `technicians` |
| `estimateConversion.ts` | conversion status, input, readiness, result, work-order candidate | `jobs`, `serviceBillingCatalog` |
| `geofencing.ts` | geofence event type/record/input, arrival decision | `jobs` |
| `payments.ts` | invoices, line items, payment records, reconciliation, Stripe provider status | `customers`, `jobs`, `providerReadiness` |
| `inventory.ts` | inventory status/unit, chemical inventory items and logs | `jobs` |
| `forms.ts` | field/template vocabulary, schemas, submissions, drafts | `jobs` |
| `media.ts` | media type, record, input | `jobs` |
| `closeouts.ts` | closeout review, capture summary | `forms`, `inventory`, `jobs`, `media` |
| `automation.ts` | automation rules, notification events/templates/delivery, scheduler runs | `customers`, `jobs`, `providerReadiness` |
| `compliance.ts` | jurisdictions, authorities, sources, documents, findings, advisories | none |
| `portal.ts` | every `CustomerPortal*` contract | `forms`, `media`, `providerReadiness` |
| `providerReadiness.ts` | `NotificationProviderReadinessState`, `StripeKeyMode`, `StripePaymentProviderReadinessState` | none |
| `offlineQueue.ts` | queue action/status/input/item and all seven `*QueuePayload` envelopes | `forms`, `geofencing`, `jobs` |
| `demoSeed.ts` | demo seed action, target, summary, runtime status, request/response | none |
| `apiRateLimits.ts` | `ApiRateLimitPolicyId` | none |

Seven modules depend on nothing, which is what makes the rest orderable.

### Three groupings that a first pass gets wrong

**Payments and invoices are one module, not two.** `Invoice` references
`PaymentRecord` and `PaymentRecord` references `Invoice`. That mutual reference
is intrinsic to the contracts, so splitting invoices from payments would create
a module cycle for no gain. They share `payments.ts`, matching the sibling name
in `domain` and `api-client`.

**The commercial vocabulary belongs to the catalog, not to jobs.** `Job`
references `ServiceBillingFamily` and `ServiceBillingOfferingId`, while
`ServiceBillingOffering` references `JobPurpose`, `JobServiceCadence`, and
`JobBillingDisposition`. Reading the `Job*` names as job-owned produces a
jobs/catalog cycle. They are catalog vocabulary that jobs consume: putting all
four with the offering catalog leaves `serviceBillingCatalog.ts` dependency-free
and `jobs.ts` a plain consumer.

**Provider readiness is its own module.** `NotificationProviderReadinessState`
is shared by notification delivery and the customer portal, and the portal's own
`CustomerPortalProviderStatus` combines both. Leaving the readiness vocabulary
in `automation.ts` would force `portal -> automation`, and the portal's delivery
provider is needed back in the other direction. A three-symbol
`providerReadiness.ts` breaks that; `automation`, `payments`, and `portal` each
depend on it and not on each other.

### The graph is acyclic

Derived from the actual cross-references between the 175 declarations rather
than asserted:

```text
technicians   customers   serviceBillingCatalog   compliance
providerReadiness   demoSeed   apiRateLimits          (no dependencies)

jobs -> customers, serviceBillingCatalog, technicians
jobClassification -> serviceBillingCatalog
technicianLicenses -> compliance, technicians
estimateConversion, geofencing, inventory, forms, media -> jobs (+ catalog)
payments, automation -> customers, jobs, providerReadiness
portal -> forms, media, providerReadiness
closeouts -> forms, inventory, jobs, media
offlineQueue -> forms, geofencing, jobs
```

`offlineQueue.ts` and `closeouts.ts` are sinks: nothing imports them. The
`*QueuePayload` envelopes are referenced by no other declaration in the package,
which is what lets the offline-queue wire format live in one module instead of
scattering across the contexts that produce each payload.

## Why the barrel stays the only entry

`index.ts` becomes a barrel of explicit `export type { … } from "./module"`
statements — no wildcard re-exports, so the public surface stays readable and
reviewable in one file, the same style `packages/domain/index.ts` uses.

Every one of the 174 real import sites across the workspace uses the bare
`"@pest-patrol/types"` specifier. The only two subpath specifiers in the
repository, `@pest-patrol/types/all` and `@pest-patrol/types/legacy`, are
fixtures inside `tooling/architecture-boundaries.test.ts` and resolve nothing.

So CR02 adds no `exports` map and no subpath entry points. Supporting them would
mean satisfying four independent resolvers — `tsc` via `tsconfig.base.json`
`paths`, Next.js, Metro, and vitest — for a capability no consumer asks for, and
Metro resolution in this repository has already proven fragile. The context
modules are internal structure; the barrel is the contract. A later slice can
promote a subpath surface if a consumer ever needs one.

## Compatibility guard

`packages/types/publicSurface.test.ts` is the package's first test. Using the
TypeScript compiler API — the approach CR01 established in
`tooling/architecture-boundaries.ts` — it asserts:

1. the set of type names exported from `index.ts` equals a frozen list of the
   175 names, so a declaration cannot be dropped or renamed unnoticed;
2. every context module's exports are disjoint from every other's, so no
   declaration is duplicated across modules;
3. the union of the context modules' exports equals the barrel's surface, so no
   module-local declaration is left unexported and no barrel entry is invented.

Assertions 2 and 3 are what make this a partition guard rather than a spelling
test. They fail loudly if a future slice moves a type between contexts and
forgets the barrel.

A type-level assertion file cannot do this job: type-only exports are absent
from the value namespace, so `keyof typeof import("./index")` sees none of them.
The surface has to be read from the source text.

## Verification

The declared checks are CR01's list minus the boundary-checker suite it owned,
plus the new package test:

```text
pnpm exec vitest run packages/types/publicSurface.test.ts
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

`pnpm architecture:check` matters here specifically: `@pest-patrol/types` has an
empty allowed-dependency list, so the checker fails if the split ever reaches
for another workspace package to resolve a reference.

`pnpm typecheck` and `pnpm build` are the gates that prove compatibility for
the 124 consumer files, because a dropped or misplaced export surfaces there and
nowhere else. `pnpm test` is load-bearing again for the first time since CR09's
predecessors, as `tasks/in-progress.md` predicted for this stretch.

## Risks

- **A declaration silently lost in the move.** The compatibility guard's frozen
  175-name list is the control; `pnpm typecheck` across 124 consumer files is
  the backstop.
- **A reference that resolves only because both declarations shared a file.**
  Splitting makes every cross-context reference an explicit import, so the type
  checker now has to agree with the partition. This is the intended effect, and
  it is why the partition was derived from the reference graph first.
- **Reviewer load.** The diff moves 1370 lines. Every hunk should be a pure
  move; the guard plus a `git diff --find-copies-harder` reading is what keeps
  that claim checkable.
