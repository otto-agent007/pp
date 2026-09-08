# CR05 Ports and Adapters Design

## Purpose

CR04 lifted the use cases into `packages/application` but left them calling
`@pest-patrol/api-client` directly, which it recorded as the
`application-to-api-client` exception expiring here. CR05 replaces those calls
with ports, so the application layer names no provider and no adapter, and the
dependency direction finally matches `docs/architecture.md`.

This slice starts from `b98e6f6388051193f258d2e35bc9be0611418b57` on `main`
(CR04's merge).

## What the shape is

Thirteen ports, one per bounded context, 77 methods total. Ports are declared in
`packages/application/ports.ts` and implemented in
`packages/api-client/adapters.ts`.

The direction matters: the **implementations import the interfaces**, rather
than the interfaces being restated on the adapter side. `api-client` may depend
on `application`, so this is the allowed edge, and it makes a drifted signature
a type error instead of a runtime surprise.

Ports are passed as a parameter — `signInAdmin(authPort, input)` replaces
`signInAdmin(client, input)`. Every use case stays a plain function, and the
diff at each composition root is one construction plus one argument.

Where an adapter took a provider client, the port does not. The client is bound
when the implementation is constructed, which is what moves provider selection
out to the composition root.

## Deriving the surface rather than writing it

Port signatures came from the TypeScript compiler, not from reading adapters.
For each of the 76 adapter functions the use cases call, the checker printed the
parameter and return types; a public `@pest-patrol/types` name was substituted
for a printed structural type **only when the two were assignable in both
directions**. That named 71 of 77 automatically.

The six that were left are the interesting ones, and each was decided rather
than guessed:

- **`AuthPort<TSession>` is generic.** No use case inspects a session — they
  only hand it back to the caller. Keeping it a type parameter is what lets
  `packages/application` avoid naming Supabase's `Session` while a composition
  root keeps its concrete type. `createAuthAdapter` returns `AuthPort<Session>`
  because `api-client` is the layer that may know.
- **Two customer writes** print as a structural type that is assignable to
  `Customer` in one direction only, because `Customer.locations` is optional and
  the write returns it as `Location[] | undefined`. The port declares `Customer`
  and the implementation satisfies it structurally.
- **TypeScript elides long unions as `{ ...; }`**, which is not syntax that can
  be re-emitted. `listJobMediaRecords` hit that; its real type is `JobMedia[]`.
- **Three contract types were module-private in `api-client`.** They are now
  declared in `packages/application` and imported back by the implementations,
  which is the correct direction anyway.

## Why offlineSync moved here, not in CR06

CR04 deferred `offlineSync` to CR06 as a `sync` concern, and that reading was
right about ownership. It was wrong about ordering.

`packages/application` may depend only on `domain` and `types`. Adding
`api-client -> application` while `domain -> api-client` still existed — the
`domain-to-api-client` exception, whose only remaining occurrence was
`offlineSync` — closes a cycle:

```text
domain -> api-client -> application -> domain
```

Turbo refuses that task graph outright, so `pnpm typecheck` fails and CR05
cannot complete. The cycle is not an artifact of tooling: the target
architecture has no such edge, and it existed only because a temporary exception
was still open.

Moving `offlineSync`'s ten adapter-reaching declarations into
`packages/application` removes the last `domain -> api-client` edge and breaks
the cycle. `packages/domain` now depends on `types` alone. CR06 becomes a
relocation from `application` to `packages/sync`, using the ports this slice
builds, rather than another adapter extraction.

## What this clears

All three exceptions CR01 recorded or CR04 added:

| Exception | Cleared because |
| --- | --- |
| `application-to-api-client` | the use cases call ports now |
| `domain-to-api-client` | `offlineSync` moved out of `packages/domain` |
| `api-client-domain-manifest` | `api-client` declares the domain dependency it always had |

`pnpm architecture:check` reports **zero exceptions** for the first time since
CR01 recorded them.

## Tests follow the seam

`docs/architecture.md` asks CR05 for adapter-mapping, stable-intent idempotency
and ambiguous-response replay tests. The port is what makes those separable:

- **Use cases** are tested in `packages/application` against stub ports, with no
  module mocking at all. Six auth tests previously reached through the adapter
  into `client.auth.*`, which meant a use-case test could only run by knowing
  how the provider is called.
- **Adapters** are tested in `packages/api-client`: that a factory binds its
  client once rather than taking one per call, that a port method maps onto the
  provider's own call shape, that a provider error surfaces rather than
  returning a partial result, and that a replay reaches the provider with the
  arguments the intent already carries rather than regenerating them.

## The singleton, recorded rather than hidden

`packages/api-client/supabase.ts` still creates a client at import time from env
vars, and the adapters that take no client still use it. A port wrapping those
is bound to a process-global client, so **composition-root selection is real for
the adapters that accept a client and nominal for the rest**. Removing the
singleton is an explicit CR09 deliverable.

## Risks

- **A use case losing its provider-specific client.** Caught once, in the two
  automation scheduler routes: they build a *service-role* client per request,
  and a module-scope port would have silently substituted the anon-key
  singleton. The port is now constructed from that client inside the request and
  the tests assert it carries it.
- **A test mock that stops intercepting.** `vi.mock` on a module keeps resolving
  after a symbol moves, so this fails loudly rather than silently — three test
  files needed splitting or a new factory in their mock.
