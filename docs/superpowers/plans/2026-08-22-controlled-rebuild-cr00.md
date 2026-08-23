# Controlled Rebuild CR00 Control Plane

> **Execution note:** Use `superpowers:subagent-driven-development` to execute
> this plan. The approved program plan remains broader; this file is the
> merge-gated CR00 slice only.

**Goal:** Establish a repo-native, machine-validated control plane for the
Pest Patrol OS controlled rebuild without changing application behavior,
dependencies, databases, providers, environments, preview data, or production
state.

**Architecture:** A versioned JSON dependency graph is the source of truth for
rebuild nodes. A deterministic TypeScript validator enforces graph invariants.
Repo-scoped custom agents and focused skills provide repeatable execution roles,
while the main controller retains integration, security, provider, migration,
and GitHub authority.

**Base:** Fresh `origin/main` after PR #145, commit `a95be1e`.

## Global Constraints

- Work only on `codex/rebuild-cr00-control-plane-v1` from `origin/main`.
- Keep this slice control-plane-only. Do not change application behavior,
  runtime dependencies, lockfiles, migrations, environment values, providers,
  preview data, or production state.
- Preserve `docs/AGENTS.md` architecture and branch/PR boundaries.
- Permit at most one running slice and at most three bounded child agents.
- No child agent may delegate. Write-capable workers require isolated ownership;
  reviewers, explorers, and verifiers are read-only.
- The Sol controller owns integration, shared exports, security-sensitive
  decisions, task documentation, commits, pushes, and draft PR creation.
- Use GPT-5.6 Terra for bounded implementation/review and GPT-5.6 Luna for
  mechanical verification. Keep fast mode off by default.
- Use TDD for executable graph behavior. Record RED and GREEN evidence.
- Every graph node must have explicit dependencies, deliverables, checks,
  approvals, evidence, branch, and PR fields, even when values are empty.
- Do not store credentials, tokens, provider values, raw portal links, or other
  secrets in graph evidence, reports, skills, or agent instructions.

### Task 1: Graph validator and schema

**Files:**
- Create: `tooling/rebuild-graph.ts`
- Create: `tooling/rebuild-graph.test.ts`
- Modify: `package.json`

**Requirements:**

1. Add a `rebuild:graph:check` root script that validates
   `docs/rebuild/graph.json` by default and accepts one optional path argument.
2. Export a pure `validateRebuildGraph(value)` function returning a list of
   deterministic human-readable errors; the CLI exits nonzero and prints every
   error when validation fails.
3. Validate schema version `1`, unique node IDs, allowed kinds
   (`slice`, `task`, `gate`), allowed statuses (`planned`, `ready`, `running`,
   `blocked`, `done`), existing parents/dependencies/conflicts, no self edges,
   and an acyclic dependency graph.
4. Enforce no more than one running slice, no overlapping ownership between
   running write tasks, and readiness only when dependencies are done.
5. Enforce required node fields and require non-empty evidence for every done
   node. Slice nodes marked done also require a PR URL and merge SHA.
6. Add focused tests for the valid graph and each invariant. Write and run the
   failing tests before production implementation.

**Verification:**
- `pnpm exec vitest run tooling/rebuild-graph.test.ts`
- `pnpm rebuild:graph:check`

### Task 2: Rebuild graph and operator runbook

**Files:**
- Create: `docs/rebuild/graph.json`
- Create: `docs/rebuild/README.md`

**Requirements:**

1. Encode CR00 through CR18 with the approved dependencies and preferred
   numeric PR order.
2. Mark CR00 running; leave future slices planned. Include the current stable
   target matrix: Node 24 LTS, pnpm 11 stable, Next.js 16 stable, and Expo SDK
   54 through 57 as separate one-SDK migrations.
3. Define the state transition, branch, evidence, reconciliation, approval, and
   version-refresh/freeze rules in the runbook.
4. State that only one implementation slice and one draft PR may be active;
   read-only preparation may occur for dependency-ready future nodes.
5. State that live GitHub status wins over stale tracked status and the first
   commit of a new slice reconciles the previous node.
6. Document the application architecture destination without implying CR00
   implements it.

**Verification:**
- `pnpm rebuild:graph:check`
- `git diff --check`

### Task 3: Project-scoped custom agents

**Files:**
- Create: `.codex/config.toml`
- Create: `.codex/agents/pp-rebuild-explorer.toml`
- Create: `.codex/agents/pp-rebuild-worker.toml`
- Create: `.codex/agents/pp-rebuild-reviewer.toml`
- Create: `.codex/agents/pp-rebuild-verifier.toml`

**Requirements:**

1. Enable at most three concurrent child threads.
2. Explorer: GPT-5.6 Terra, medium reasoning, read-only, evidence-first mapping.
3. Worker: GPT-5.6 Terra, high reasoning, workspace-write, explicit path
   ownership, no integration or external mutations.
4. Reviewer: GPT-5.6 Terra, high reasoning, read-only, correctness/security/
   architecture/test findings only.
5. Verifier: GPT-5.6 Luna, medium reasoning, read-only, exact command/result
   evidence without fixing failures.
6. Every profile forbids nested delegation and defers security, migration,
   provider, production, integration, push, and PR authority to the controller.

**Verification:**
- Parse every TOML file with Python `tomllib`.
- Confirm Codex lists the configured agent files without changing user config.

### Task 4: Repo-local controlled rebuild skills

**Files:**
- Create: `.agents/skills/pest-patrol-rebuild-orchestrator/SKILL.md`
- Create: `.agents/skills/pest-patrol-architecture-guard/SKILL.md`
- Create: `.agents/skills/pest-patrol-verification-gate/SKILL.md`

**Requirements:**

1. Use the skill creator and skill-writing workflow separately for each skill:
   baseline scenario without the skill, minimal authored skill, forward scenario
   with the skill, and structural validation.
2. Orchestrator handles selecting/reconciling one graph node and preparing its
   bounded slice execution; it never grants external mutation authority.
3. Architecture guard reviews the Pest Patrol data-flow, offline-first, type,
   schema-compatibility, and secret/provider boundaries without editing code.
4. Verification gate selects scope-proportionate commands, records fresh exit
   evidence, and refuses completion claims after a failed/missing gate.
5. Keep each skill concise and self-contained. Do not add unused assets,
   references, scripts, or UI metadata.

**Verification:**
- Run the official skill creator `quick_validate.py` for every skill.
- Record baseline and forward-test outcomes in the ignored SDD reports.

### Task 5: Operating and task documentation

**Files:**
- Modify: `docs/AGENTS.md`
- Modify: `docs/CODEX_OPERATING_PLAN.md`
- Modify: `tasks/in-progress.md`

**Requirements:**

1. Replace phantom Pest Patrol skill names with the three skills that now
   exist, plus the existing Claude design relay rules where relevant.
2. Add the graph as the authoritative multi-slice scheduler while retaining all
   existing security and production boundaries.
3. Reconcile merged PR #145 and mark CR00 as the active slice with its branch,
   scope, checks, and explicit exclusions.

**Verification:**
- `git diff --check`
- Review links and branch names against live GitHub/local git evidence.

### Task 6: Whole-slice verification and publication

**Requirements:**

1. Run focused graph and skill validation first.
2. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
   `pnpm security:baseline`, and `git diff --check` on the final tree.
3. Run a broad independent review against this plan and resolve Critical or
   Important findings before publication.
4. Commit the reviewed slice, push the branch, and open a draft PR against
   `main`. Do not merge it.

## Paused Execution Checkpoint — 2026-08-22

The user explicitly paused execution before publication. Resume from branch
`codex/rebuild-cr00-control-plane-v1`, based on `origin/main` commit `a95be1e`.
No push or draft PR has been created for this slice.

Completed and independently reviewed:

- Tasks 1–3: graph validator/tests, versioned CR00–CR18 graph/runbook, and four
  bounded project-scoped agent profiles under the canonical three-thread cap.
- Task 4a: `pest-patrol-rebuild-orchestrator`, including behavioral fixes for
  exact cached package-manager discovery, bounded live reconciliation, and
  first-eligible `preferredPrOrder` selection.
- Task 4b: `pest-patrol-architecture-guard`, with clean baseline/forward
  behavioral evidence and independent review.

Tracked commits after the base, in order:

```text
4ab22eb docs: add CR00 controlled rebuild plan
4f5f439 feat: validate controlled rebuild graph
decb9d1 test: include rebuild graph validator
d5ad9ac docs: add controlled rebuild graph runbook
c8c75dc chore: add controlled rebuild agent profiles
70b2602 fix: use canonical agent concurrency key
6a9f07a docs: add rebuild orchestrator skill
a3f609d docs: resolve cached pnpm for rebuild skill
4265290 docs: bound rebuild reconciliation checks
01f5622 docs: make rebuild node selection deterministic
1e2351f docs: add Pest Patrol architecture guard skill
```

Resume at Task 4c. No tracked verification-gate skill exists yet. Two bounded
no-skill baseline attempts were interrupted without producing tracked changes;
start a fresh, finite baseline scenario, then author, structurally validate,
forward-test, and independently review
`pest-patrol-verification-gate`. Continue with Task 5 documentation, then Task
6 focused/full verification and broad branch review. Only after all required
gates pass should the branch be pushed and a draft PR opened.

Environment note: this checkout declared `pnpm@9.15.4`; ordinary `pnpm` and
Corepack were absent from `PATH`. Resolve an exact matching executable using
the orchestrator skill's npm-cache discovery procedure. Lint and full builds
previously needed the approved unsandboxed path because sandbox IPC/framework
workers failed before repository execution. Re-establish fresh evidence rather
than relying on those earlier baseline results.
