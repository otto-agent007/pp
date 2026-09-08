# Architecture

Pest Patrol OS is a full-stack pest-control operations platform. This document
is the canonical responsibility and workspace-dependency direction contract.
It describes the destination architecture; executable policy and the current
exception inventory are the source of truth for the repository's exact state.

## Platform context

The product includes a Next.js admin dashboard and customer portal, an Expo
technician mobile app, and provider-backed operational services. Mobile is
offline-first, eligible UI mutations are optimistic, and database integrity
controls remain provider concerns behind adapters.

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

An allowlist is permission, not a requirement that every listed edge already
exist. Every initial edge permits only `dependencies`; `devDependencies`,
`peerDependencies`, and `optionalDependencies` are never implicit
alternatives. A future policy change must explicitly permit the section for
that exact edge.

## Responsibilities

- `types` owns provider-independent shared contracts and has no Pest Patrol
  workspace dependency.
- `domain` owns pure business rules and depends only on `types`. It is
  provider-independent.
- `application` owns ports and use cases, coordinates domain behavior, and
  defines provider-independent conflict and terminal-failure semantics and
  policy.
- `api-client` owns provider and persistence adapters, including provider-SDK
  calls, mapping provider requests, responses, and errors to
  application-facing results, and idempotent delivery using stable intent
  identities. Adapter handling includes ambiguous provider responses.
- `sync` owns durable persisted intent identity and state, restart
  replay/recovery, retry and backoff scheduling, queue execution, and durable
  state transitions. Provider-adapter implementations are selected and wired
  at app composition roots.
- `i18n`, `ui-tokens`, `ui`, and `ui-native` are presentation libraries with
  explicit package-specific allowlists; they do not become application or
  provider layers.
- Web and mobile are app composition roots. They select implementations and
  wire dependencies rather than placing business rules or provider access in
  UI components. Mobile presentation also makes terminal failures visible and
  provides user recovery UI.

## Data flow

```text
UI/input -> app composition root -> application use case -> port -> adapter -> provider -> mapped result
```

Mobile writes use this canonical flow:

```text
UI/input -> durable offline queue -> optimistic projection -> sync/retry -> port/client adapter -> provider -> mapped result
```

This flow keeps policy and provider concerns separate. Domain code expresses
provider-independent rules; provider clients belong in adapter
implementations, never in domain code or UI components. Mobile remains
offline-first: a write is durably enqueued before its optimistic projection,
then the queue drives sync and retry rather than blocking field work on network
availability. Do not create optimistic-first or network-first mobile writes.
If a provider response is ambiguous, replay reuses the same stable intent
identity rather than creating a duplicate logical write.

## Future mobile-write evidence

CR04 (`packages/application`) must provide provider-independent conflict and
terminal-failure semantics and policy tests. CR05 (`packages/api-client`) must
provide adapter-mapping, stable-intent idempotency, and ambiguous-response
replay tests. CR06 (`packages/sync`) must provide package-local tests for
durable identity and state, persistence, restart replay, retry/backoff
scheduling, durable transitions, and stable identity across retry, using owned
package boundaries or fakes where needed. CR09 (`apps`) must provide the real
`apps/mobile` composition-root integration through durable enqueue, optimistic
projection, restart, sync, adapter/provider acknowledgment, plus a
terminal-failure visibility and user-recovery interaction test.

CR01 documents this target contract only. It creates no application or sync
package implementation and does not claim that these behaviors exist in the
current repository.

## Target versus current repository state

CR01 records the target direction without claiming that the current repository
already conforms. The versioned [boundary policy](../tooling/architecture-boundaries.json)
defines package allowlists and freezes the exact, expiring exceptions. Its
[checker](../tooling/architecture-boundaries.ts) validates them. Read those
artifacts for current exception facts and removal ownership; do not duplicate
them in prose.

### Where domain purity actually lands

`packages/domain` does not yet depend only on `types`. Fourteen of its thirty
production modules import `@pest-patrol/api-client`, which the
`domain-to-api-client` exception permits until its removal slice. Those modules
are not domain rules reaching for a helper: they orchestrate adapter calls, so
by the responsibilities above they are use cases and belong in
`@pest-patrol/application`.

That package does not exist until CR04, so the coupling cannot clear before
CR04 exists to receive it. CR03 therefore records and guards the seam — which
modules are pure policy and which orchestrate adapters — in
[`packages/domain/module-roles.json`](../packages/domain/module-roles.json).

The seam runs *inside* modules, not between them. Those fourteen modules export
450 declarations, and only 98 of them — 947 lines — reach an adapter; the other
5,542 exported lines are policy that stays. So the extraction is a filleting
job, not a file move, and every module keeps its rules.

It takes two slices, because one of the fourteen is not application work.
**CR04** lifts thirteen modules' orchestration into `packages/application`,
repoints the eighteen app files that import a moved symbol, and narrows the
`domain-to-api-client` exception to what remains. **CR06** lifts `offlineSync`
— 41% of the moving code, and by the responsibilities above a `sync` concern:
durable identity and state, restart replay, retry and backoff, queue
execution — into `packages/sync`, and removes the exception. Only then is the
domain package pure.

The exception named CR09 until this was reconciled; CR09 owns only `apps`, so
it could never have removed a `packages/domain` import.

Use the [controlled rebuild runbook](rebuild/README.md) for scheduler,
lifecycle, verification, and publication rules.
