# Architecture

Pest Patrol OS is a full-stack pest-control operations platform. This document
is the canonical responsibility and workspace-dependency direction contract.
It describes the destination architecture; executable policy and the current
exception inventory are the source of truth for the repository's exact state.

## Platform context

The product includes a Next.js admin dashboard and customer portal, an Expo
technician mobile app, and provider-backed operational services. Mobile is
offline-first, UI mutations are optimistic, and database integrity controls
remain provider concerns behind adapters.

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
- `application` owns ports and use cases and coordinates domain behavior.
- `api-client` owns provider and persistence adapters, including provider-SDK
  calls and mapping provider data to application-facing results.
- `sync` owns durable queue execution and retry orchestration. Provider-adapter
  implementations are selected and wired at app composition roots.
- `i18n`, `ui-tokens`, `ui`, and `ui-native` are presentation libraries with
  explicit package-specific allowlists; they do not become application or
  provider layers.
- Web and mobile are app composition roots. They select implementations and
  wire dependencies rather than placing business rules or provider access in
  UI components.

## Data flow

```text
UI/input -> app composition root -> application use case -> port -> adapter -> provider -> mapped result
```

This flow keeps policy and provider concerns separate. Domain code expresses
provider-independent rules; provider clients belong in adapter
implementations, never in domain code or UI components. Mobile remains
offline-first: writes enter the durable sync path and support retry rather
than blocking field work on network availability.

## Target versus current repository state

CR01 records the target direction without claiming that the current repository
already conforms. The versioned [boundary policy](../tooling/architecture-boundaries.json)
defines package allowlists and freezes the exact, expiring exceptions. Its
[checker](../tooling/architecture-boundaries.ts) validates them. Read those
artifacts for current exception facts and removal ownership; do not duplicate
them in prose.

Use the [controlled rebuild runbook](rebuild/README.md) for scheduler,
lifecycle, verification, and publication rules.
