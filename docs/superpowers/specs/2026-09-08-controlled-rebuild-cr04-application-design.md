# CR04 Application Layer Design

## Purpose

`packages/domain` is supposed to depend only on `@pest-patrol/types`. CR03
declared and guarded the seam that says which of its modules are pure policy and
which orchestrate adapters. CR04 acts on that declaration: it creates
`packages/application`, lifts the orchestration through the seam, and repoints
the app files that imported it.

The purity outcome CR03 could not reach — it had nowhere to put the
orchestration, because `packages/application` is created here and CR04 depends
on CR03 — lands in this slice for thirteen of the fourteen orchestration
modules.
`offlineSync` is CR06's, for reasons the scoping recorded.

This slice starts from `b98e6f6388051193f258d2e35bc9be0611418b57` on `main`.

## What actually moves, and why it is smaller than it looked

CR03 recorded fourteen orchestration modules totalling 9,644 lines, which reads
as this slice's workload. That is the *file* total. Those modules export 450
declarations and only 98 of them — 947 lines — reach an adapter, transitively
through local helpers as well as directly. Removing `offlineSync` leaves **88
declarations, 557 lines, across thirteen modules**.

The seam runs *inside* modules, not between them. `customers.ts` is six pure
functions plus four one-to-three line adapter wrappers, and that shape repeats.
Every module keeps its rules; only the calls that reach an adapter leave.

## Goals

1. Create `packages/application` and promote its boundary-policy entry from
   `planned` to `required`.
2. Move all 88 adapter-reaching declarations out of the thirteen modules,
   byte-identical, leaving each module's policy in place.
3. Repoint the eighteen app files importing a moved symbol, in the same change.
4. Narrow `domain-to-api-client` to `offlineSync`, and record the debt this move
   creates as `application-to-api-client`, expiring in CR05.
5. Define provider-independent conflict and terminal-failure semantics with
   policy tests, which `docs/architecture.md` requires of CR04.

## Non-goals

CR04 does not:

- move `offlineSync`, or remove `domain-to-api-client` — both are CR06's;
- define or implement ports — `packages/application` may not depend on
  `packages/api-client`, ports need implementations, and implementations belong
  in `api-client`, which CR05 owns;
- retire `AuthSupabaseClient`, the provider type threaded through nineteen
  signatures — CR04 preserves those signatures so the move stays
  behaviour-preserving;
- change any moved declaration's body, or any staying declaration at all.

## The debt this move creates

`@pest-patrol/application` may depend only on `domain` and `types`. Every one of
the 88 moved functions calls `@pest-patrol/api-client`. So relocating them
creates a second forbidden edge rather than resolving one, and CR01's checker
rejects it.

That cannot be avoided inside CR04, so it is made explicit and scheduled the way
CR01 recorded the two exceptions it inherited: an `application-to-api-client`
exception with seventeen exact source occurrences, expiring in **CR05**, which
defines the ports, implements them in `api-client`, wires the composition roots
and removes it.

This is deliberate debt with an owner and a deadline, not an oversight. The
alternative — full ports plus app-side wiring inside CR04 — would turn the
eighteen app files from an import repoint into a rewiring, and would still put
adapter implementations in a package CR04 does not own.

## Conflict and terminal-failure semantics

`docs/architecture.md` makes this package the owner of provider-independent
conflict and terminal-failure semantics. Nothing in the repository provided
them: `packages/domain`'s queue can mark an item `failed`, but nothing decided
when retrying should stop, and nothing distinguished a write that lost a race
from one that can never apply.

`packages/application/mutationOutcome.ts` supplies both, without knowing what
any provider's error looks like. Adapters map their provider's answer onto a
`MutationFailureReason`; this module decides what it means:

| Reason | Outcome | Retryable | Reuses identity | User recovery |
| --- | --- | --- | --- | --- |
| `network-unavailable`, `provider-unavailable`, `rate-limited` | `retryable` | yes | yes | no |
| `ambiguous-response` | `ambiguous` | yes | yes | no |
| `precondition-conflict` | `conflict` | no | yes | **yes** |
| `invalid-intent`, `unauthorized`, `target-missing` | `terminal` | no | yes | **yes** |

Two rules carry the weight:

**Every replay reuses the intent's existing identity.** Any outcome that leaves
provider state uncertain or unchanged must replay under the identity the intent
already has. Minting a fresh one is what turns a single logical write into two,
which the architecture document forbids.

**A retry budget converts persistence into visibility.** A retryable or
ambiguous failure that exhausts `maxAttempts` becomes terminal, so the
technician is shown it rather than the queue hiding it behind another attempt
forever. An already-terminal reason is never rescued by having budget left.

## Verification

The declared checks are CR03's list with the guard swapped for this slice's
tests. Two matter more than the rest.

`pnpm test` is load-bearing for the first time in this stretch. CR02 moved only
erased type declarations and CR03 changed no import; CR04 relocates real runtime
behaviour across a package boundary, so the 426 web and 79 mobile tests are the
evidence that behaviour is unchanged.

`pnpm architecture:check` must report **10 packages and 3 matched exceptions**.
Ten because `packages/application` now exists and is `required`; three because
this slice narrows one exception and adds one.

## Risks

- **A moved declaration losing a helper it shared with the staying half.** Six
  modules share `requireNonEmpty` across the seam, and `jobs` shares
  `normalizeOptional`. All six copies of `requireNonEmpty` are byte-identical to
  the one `packages/domain/index.ts` already exports, so the moved code imports
  it; `normalizeOptional` is exported from `jobs.ts` rather than duplicated.
- **An export silently lost in the split.** Controlled by comparing the exported
  name set of each module before the move against the union of its domain and
  application halves afterwards: 422 symbols, none lost.
- **Test mocks left pointing at the old module.** `vi.mock` and `vi.doMock` on
  `@pest-patrol/domain` keep resolving after the move but no longer intercept a
  moved symbol, which fails loudly rather than silently. Three test files needed
  splitting.
