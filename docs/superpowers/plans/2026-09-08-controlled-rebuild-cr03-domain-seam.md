# CR03 Domain Purity Seam Plan

**Goal:** declare and guard which `packages/domain` modules are pure policy and
which orchestrate adapters, without changing a single import.

**Controlled rebuild:** node `CR03` in `docs/rebuild/graph.json`. Base:
`d4199f73535ddd6fda4ab12407ec6fbad227ad79`. Branch:
`codex/rebuild-cr03-domain-seam-v1`. Design:
[CR03 Domain Purity Seam Design](../specs/2026-09-08-controlled-rebuild-cr03-domain-seam-design.md).

**Approvals:** the controller re-scoped CR03 on 2026-09-08 (PR #188) after its
original "Pure domain package" deliverable proved unreachable from CR03, and
directed the work to continue through implementation. Merge remains a
controller-approved gate per `docs/rebuild/README.md`; the
`rebuild/cr03-source` tag publishes automatically on merge.

**Predecessor:** CR02 is `done` and reconciled on `main` by PR #187, and the
re-scope landed as #188, so this slice's first commit is its implementation.

## Why CR03 does not make the domain package pure

Because it cannot. Fourteen of `packages/domain`'s thirty production modules
import `@pest-patrol/api-client`, and that orchestration belongs in
`@pest-patrol/application` — a package CR04 creates, while CR04 depends on
CR03. PR #188 moved the purity outcome to CR04 and left CR03 the seam.

So the measure of this slice is not "did coupling go down". It is "is the
boundary now recorded and un-driftable". `pnpm architecture:check` must still
report **two** matched exceptions afterwards; a drop to one would mean the
slice removed coupling it was scoped not to touch.

## Steps

### 1. Branch and manifest

Cut `codex/rebuild-cr03-domain-seam-v1` from `d4199f7`.

Add `packages/domain/module-roles.json`: `schemaVersion`, the specifiers
forbidden in policy modules, and the two module lists. Sixteen policy modules,
fourteen orchestration modules, derived from what each module actually imports
and then frozen as a declaration.

`forbiddenInPolicy` names the provider SDKs (`@supabase/*`, `stripe`) alongside
`@pest-patrol/api-client` even though none appears in the package today. They
are the shape the next violation would take, and listing them costs nothing.

### 2. Guard

Add `packages/domain/moduleRoles.test.ts`, reading source text with the
TypeScript compiler API. Four assertions: the manifest partitions the package;
policy modules import nothing forbidden, in production **or** test files; every
orchestration module still imports an adapter; the barrel imports nothing
forbidden.

The third assertion is the one that earns its place during CR04 — as
orchestration is lifted out, an emptied module fails until it is reclassified,
so the manifest tracks the extraction rather than decaying behind it.

**Prove all four fire.** Per the runbook lesson, a gate wired in but never
invoked looks identical to a passing one.

### 3. Toolchain

`packages/domain` needs `"types": ["node"]` and an `@types/node` devDependency,
for the same reason `packages/types` did in CR02: the guard reads files, and
`virtualStoreDir: .pnpm` puts `@types/node` outside `tsc`'s default type-root
walk. This is now the fourth workspace project carrying that pair, after
`api-client`, `tooling/`, and `types`.

### 4. Gates, promotion, verification

Run every declared check. Push, open the draft PR, then the promotion commit
(status `running`, `baseSha`, `branch`, `pr`, ownership, deliverables, checks,
approvals, evidence). Push, run `pnpm rebuild:verify` on the clean tree, record
the `command` evidence bound to a commit in the PR's own set. Stop for
controller merge approval.

## Ownership

```text
docs/rebuild/graph.json
docs/superpowers/plans/2026-09-08-controlled-rebuild-cr03-domain-seam.md
docs/superpowers/specs/2026-09-08-controlled-rebuild-cr03-domain-seam-design.md
packages/domain/module-roles.json
packages/domain/moduleRoles.test.ts
packages/domain/package.json
packages/domain/tsconfig.json
pnpm-lock.yaml
tasks/in-progress.md
```

## What this slice does not touch

No existing domain module, no import, no other package, and neither recorded
boundary exception. `domain-to-api-client` still expires in CR04 and
`api-client-domain-manifest` in CR05.

## What CR04 inherits

A list, not a grep. `orchestrationModules` is CR04's extraction worklist —
fourteen modules, 9,644 lines against the policy half's 8,399 — and the guard
turns each completed extraction into a required manifest edit rather than an
optional one.
