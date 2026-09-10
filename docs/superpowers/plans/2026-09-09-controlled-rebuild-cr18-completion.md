# CR18 Controlled Rebuild Completion Plan

**Goal:** close the controlled rebuild — reconcile the graph with every node
done and every source tag published, and make the completion claim something
that fails when it stops being true rather than something recorded on a node.

**Controlled rebuild:** node `CR18` in `docs/rebuild/graph.json`, the last node
in the chain. Base: `9959215`. Branch: `codex/rebuild-cr18-completion-v1`.

**Approvals:** controller directed the completion run on 2026-09-09 after
merging CR09B (#213) and the control-plane fix (#214). CR18 depends on every
other live node by name, so `pnpm rebuild:graph:check` would have refused to
promote it if any were open.

## What was actually there

Measured on `9959215`, deliverable by deliverable:

- **Deliverable 3 is already enforced, by the act of running this node.** CR18
  depends on all of CR10-CR15, CR20, CR09A and CR09B, and the validator refuses
  to promote a node whose dependency is not `done`. The reconciler independently
  checks every done node's source tag, merge ancestry and tag drift on every
  run. Nothing needed writing; it needed recording.
- **Deliverable 2 was enforced by nothing.** `pnpm architecture:check` prints
  `0 matched exceptions` on every run — and printing a zero is not the same as
  failing on a one. Re-adding a boundary exception, or leaving a package
  `planned`, would have left every gate green while CR18's recorded claim
  quietly stopped being true. Fourteenth instance of the recurring defect class,
  and the last node in the chain met it about its own claim.
- **A related gap had sat unowned since CR06.** The checker errors when a
  `required` package is missing and says nothing when a `planned` package
  exists, so CR06 could have created `packages/sync` against a policy that still
  called it planned and nothing would have objected. CR06 recorded it and could
  not close it: `tooling/architecture-boundaries.ts` was not CR06's to edit.
- **Deliverable 1's cross-runtime compatibility is the chain's own output.**
  Node 24.20.0, pnpm 12.3.4, Next.js 16.3.4, Expo SDK 57.0.20 and TypeScript 6
  each moved under their own node with their own evidence, and `pnpm build`,
  `pnpm typecheck` and `pnpm test` pass on the pinned set.

## Steps

### 1. Reconcile CR09B as done

Folded into this branch's first commit, which is what PR #178 made safe. Bind
the done-evidence to the pull request head rather than the merge commit.

### 2. Close the CR06 checker gap

Add the mirror of "required package is missing": a `planned` package whose
directory exists is a stale policy and an error. This is a genuine checker rule
rather than a claim about this repository — `planned` means "expected later",
and once the package is there the policy is describing the past.

One existing test encodes the gap, as this defect class's memory warns they do:
"validates a present planned package against its declared permissions" asserts
with `toEqual` that a present planned package yields only an edge error. Its
intent is right and is kept; the staleness error joins its expected list.

### 3. Freeze the completion claim

`tooling/architecture-completion.test.ts` asserts the real policy carries no
exceptions, leaves no package `planned`, and declares eleven packages.

These are assertions about *this* policy, not new rules in the checker, and that
is deliberate. Both features stay legitimate — a future debt exception with a
removal node, or a package declared before it is built, is a normal thing to
want. What must not happen is either appearing without someone deciding to.
Editing this file is how that decision becomes reviewable.

### 4. Write the ledgers

`tasks/done.md` gains CR09B, CR18 and the control-plane fix. `tasks/in-progress.md`
collapses its controlled-rebuild sections: the chain carries no open work, so
what it keeps is what the chain ended with and the lesson it kept relearning.

## Verification

The standard gates. `tooling/**` maps to `pnpm test` in `selectVerificationGates`
and `tasks/` and `docs/` to `git diff --check`, so no path reports UNMAPPED.
`pnpm typecheck` is named explicitly, as every node in this chain has had to.

Both new guards are proved to fire rather than to pass: flipping
`@pest-patrol/i18n` back to `planned` fails the completion test naming it and
fails `pnpm architecture:check` with the new rule, and re-adding an exception
fails the completion test. The policy is restored byte-identical after each.
