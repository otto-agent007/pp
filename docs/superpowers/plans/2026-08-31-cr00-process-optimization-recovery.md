# CR00 Process-Optimization Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Fable's approved controlled-rebuild process optimizations in
one CR00 post-merge recovery PR without promoting another slice or weakening
the existing lifecycle invariants.

**Architecture:** Keep `validateRebuildGraph(value)` unchanged and use its
existing supersession and resolved-dependency machinery for graph surgery.
Extend only the reconciler's changed-path ownership boundary, and pass the
selected slice ID through recovery verification, so standing slice-owned
control files and the active lockfile are accepted mechanically. Keep the
human operating doctrine in the canonical rebuild runbook.

**Tech Stack:** JSON, Markdown, TypeScript, Node.js built-ins, Vitest 4, pnpm
9.15.4, Git, GitHub Actions.

**Spec:** Fable process-optimization contract supplied and controller-approved
in the 2026-08-31 recovery request; its exact requirements are reproduced in
the global constraints and tasks below.

## Global Constraints

- Work only on `codex/rebuild-cr00-process-optimization-recovery-v1`, based on
  `origin/main` commit `3630dbb3ecaf4361dc059a974246e688f473bcf2`.
- Publish exactly one draft PR against `main` and verify it with
  `pnpm rebuild:verify -- --recovery-slice CR00`.
- Do not modify `tooling/rebuild-graph.ts` or its tests. A graph invariant that
  rejects legitimate surgery is a finding; it is not authorization to weaken
  or bypass the validator.
- Preserve reconciliation's provenance and lifecycle checks. The only
  reconciler behavior change is the requested standing ownership policy.
- Record every executable behavior change RED, then GREEN, before moving on.
- Do not promote CR01 or CR02, mark PR #148 ready, source-tag it, merge it, or
  mutate provider, EAS, environment, preview, migration, or production state.
- CR15's final Expo target is SDK 57 with `resolvedVersion` no lower than
  `57.0.9`; prereleases remain forbidden.
- `preferredPrOrder` must remain exhaustive, unique, and topological after
  dependency replacement resolution.
- Superseded CR08, CR16, and CR17 each require commit-bound approval evidence.
- The only tracker in this slice is `tasks/in-progress.md`; the rebuild runbook
  is the canonical home for all standing doctrine.

---

### Task 1: Mechanize standing slice ownership

**Files:**

- Modify: `tooling/rebuild-graph-reconcile.test.ts`
- Modify: `tooling/rebuild-graph-reconcile.ts`
- Modify: `tooling/rebuild-verification.test.ts`
- Modify: `tooling/rebuild-verification.ts`

**Interfaces:**

- Extend `validateChangedPathOwnership(changedPaths, ownership, sliceId?)` so
  a selected slice implicitly owns exact paths `docs/rebuild/graph.json`,
  `tasks/in-progress.md`, and `pnpm-lock.yaml`, plus only plan Markdown files
  under `docs/superpowers/plans/` whose basename contains the slice ID as a
  lowercase hyphen-delimited token.
- Extend `selectVerificationGates(..., recoveryOwnership?, recoverySliceId?)`
  and pass `verificationNode.id` in recovery mode.
- Do not broaden ownership for calls without a selected slice ID, other plan
  directories, other slices' plans, prefix lookalikes, or any other lockfile.

- [x] **Step 1: Add focused reconciler ownership regressions**

Add a test that calls the desired three-argument API with `CR06`, an empty
declared ownership list, and these hand-derived accepted paths:

```ts
[
  "docs/rebuild/graph.json",
  "tasks/in-progress.md",
  "docs/superpowers/plans/2026-08-31-controlled-rebuild-cr06.md",
  "pnpm-lock.yaml",
];
```

Add a second assertion that CR06 still rejects a CR09 plan, a
`pnpm-lock.yaml.backup` prefix lookalike, and an unrelated source path.

- [x] **Step 2: Run the focused tests and observe RED**

Run:

```bash
pnpm exec vitest run tooling/rebuild-graph-reconcile.test.ts -t "standing slice ownership"
```

Expected: FAIL because the current helper ignores the slice ID and rejects all
four implicit paths.

- [x] **Step 3: Implement the minimal implicit-ownership predicate**

Keep normalization validation first. Accept exact shared control paths, exact
root `pnpm-lock.yaml`, and a slice-owned plan basename matching
`/(?:^|-)<lowercase-id>(?:-|\.md$)/`; retain the existing exact-or-descendant
rule for declared ownership.

- [x] **Step 4: Run the focused reconciler tests and observe GREEN**

Run the Step 2 command, then the complete reconciler test file.

- [x] **Step 5: Add a recovery-verifier regression**

Exercise `selectVerificationGates` with the four implicit CR00 paths, empty
recovery ownership, and recovery slice ID `CR00`. Assert there is no
`UNMAPPED recovery ownership` gate. Keep the existing negative recovery test,
but change its outside path to `docs/AGENTS.md` now that
`tasks/in-progress.md` is intentionally implicit.

- [x] **Step 6: Run the recovery test and observe RED**

Run:

```bash
pnpm exec vitest run tooling/rebuild-verification.test.ts -t "standing slice ownership|outside the completed slice ownership"
```

Expected: the new assertion FAILS because recovery verification does not pass
the selected slice ID to the reconciler ownership helper.

- [x] **Step 7: Pass the recovery slice ID and observe GREEN**

Add the optional `recoverySliceId` argument, forward it to
`validateChangedPathOwnership`, and call the selector with
`verificationNode.id` only in recovery mode. Run the Step 6 command and the
complete verification test file.

---

### Task 2: Perform lifecycle graph surgery with the existing validator

**Files:**

- Modify: `docs/rebuild/graph.json`

**Interfaces:**

- CR08 becomes `superseded` by CR09; CR09 depends directly on CR07 and absorbs
  application-composition preparation.
- CR16 becomes `superseded` by CR15; CR15 absorbs the SDK 56-to-57 hop and
  ends at Expo SDK 57 with `resolvedVersion: "57.0.9"`.
- CR17 becomes `superseded` by CR18; CR18 removes its self-resolving CR17
  dependency and absorbs cross-runtime compatibility reconciliation.
- Each superseded node records one `approval` evidence item bound to base
  commit `3630dbb3ecaf4361dc059a974246e688f473bcf2` and the controller-approved
  Fable contract.
- CR06 and CR09 each record the exact approval note
  `decompose into parallel write-tasks at promotion`.

- [x] **Step 1: Apply only the superseded statuses and replacement edges**

Set the three terminal statuses, replacement IDs, approval evidence, absorbing
deliverables, CR15 target, and CR06/CR09 promotion notes. Leave CR09 and CR18's
old dependencies in place for the first validator run.

- [x] **Step 2: Run the unchanged graph validator and observe RED**

Run: `pnpm rebuild:graph:check`

Expected: FAIL with resolved dependency cycles caused by CR09 resolving its
CR08 dependency back to itself and CR18 resolving its CR17 dependency back to
itself. Any different invariant failure is a finding to investigate before
continuing.

- [x] **Step 3: Make the minimal dependency repair**

Replace CR09's dependency on CR08 with CR07 and remove CR17 from CR18's
dependency list. Keep every node in `preferredPrOrder`; retain the current
order if the unchanged validator proves it remains topological.

- [x] **Step 4: Run structural and repository checks and observe GREEN**

Run:

```bash
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
```

Expected: both commands pass without a validator change or a lifecycle bypass.

---

### Task 3: Write the canonical operating doctrine and tracker state

**Files:**

- Modify: `docs/rebuild/README.md`
- Modify: `tasks/in-progress.md`
- Modify: `docs/superpowers/plans/2026-08-31-cr00-process-optimization-recovery.md`

**Interfaces:**

- Scheduling permits read-only exploration and promotion-spec drafting for
  slice N+1 while N is in review; branch creation, tracked implementation,
  `ready`/`running` promotion, and a new slice PR still wait for N's merge and
  reconciliation.
- The merge checklist requires external adversarial pre-review.
- Controller approval plus green required checks authorizes auto-merge; the
  controller does not wait synchronously for the merge event and reconciliation
  remains the later source of truth.
- Expo native-build evidence accepts commit-bound successful command evidence
  for Expo Doctor and clean, no-install iOS/Android prebuild generation, plus
  `github` evidence whose URL is the immutable successful EAS build page for
  each required platform when CI cannot run the native build.
- Standing ownership doctrine matches the exact mechanical contract in Task 1.

- [x] **Step 1: Update only the canonical rebuild runbook**

Add the scheduling, promotion, ownership, native-build evidence, merge
checklist, adversarial pre-review, and asynchronous auto-merge rules. Do not
duplicate them into root `AGENTS.md` or `docs/CODEX_OPERATING_PLAN.md`.

- [x] **Step 2: Replace the tracker with the recovery slice state**

Record the base, branch, Fable contract, CR01 draft-PR coexistence boundary,
changed scope, verification mode, and explicit exclusions. Before publication,
state that the recovery PR URL is pending; after creating it, replace that
line with the canonical draft PR URL in a follow-up commit.

- [x] **Step 3: Check prose and graph formatting**

Run:

```bash
git diff --check
pnpm rebuild:graph:check
```

---

### Task 4: Verify, review, publish, and bind final evidence

**Files:**

- Modify after PR creation: `tasks/in-progress.md`

- [x] **Step 1: Run focused suites and unchanged reconciliation**

```bash
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
```

- [x] **Step 2: Run the full project gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
git diff --check
```

- [x] **Step 3: Review the complete branch adversarially**

Inspect every changed path against this plan, the unchanged graph validator,
the supersession topology, ownership negative cases, evidence provenance, and
the README's authority boundaries. Repair every Critical or Important finding
with a focused RED/GREEN cycle before publication.

- [x] **Step 4: Commit and run clean-tree recovery verification**

Commit the reviewed files, then run:

```bash
pnpm rebuild:verify -- --recovery-slice CR00 --package-manager /home/user1/.npm/_npx/32b21065a482fe57/node_modules/.bin/pnpm
```

Require a clean pre/post worktree and overall `PASS`.

- [x] **Step 5: Push and open exactly one draft PR**

Push `codex/rebuild-cr00-process-optimization-recovery-v1`, create a draft PR
against `main`, and do not mark it ready or merge it synchronously.

- [ ] **Step 6: Record the PR URL and rebind final evidence**

Replace the pending tracker line with the canonical PR URL, commit, push, rerun
the complete clean-tree recovery verifier, and inspect hosted checks once.
Report passed and pending checks exactly as observed; auto-merge is authorized
only if controller approval and required checks are both present.
