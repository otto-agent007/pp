# CR00 Control-Plane Review Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair draft PR #146 so its rebuild graph, evidence model,
repository reconciliation, ownership boundary, verification gate, CI, and
governance claims are mechanically enforced.

**Architecture:** Keep `validateRebuildGraph(value)` pure and deterministic.
Place Git/GitHub and changed-path checks in a separate reconciliation tool,
and place package-manager resolution, gate selection, input digests, and gate
classification in a separate verification tool. CI runs all three layers with
full Git history; documentation links to the executable contracts instead of
repeating their algorithms.

**Tech Stack:** TypeScript, Node.js built-ins, Vitest 4, pnpm 9.15.4, Git,
GitHub Actions, JSON, Markdown.

**Spec:**
`docs/superpowers/specs/2026-08-24-cr00-control-plane-review-repair-design.md`

## Global Constraints

- Work only on `codex/rebuild-cr00-control-plane-v1` and update existing draft
  PR #146; do not create a second slice branch or PR.
- Do not change application behavior, runtime dependencies, `pnpm-lock.yaml`,
  migrations, provider data, environment values, previews, or production.
- `validateRebuildGraph(value)` must not read files, invoke Git, call GitHub,
  inspect environment variables, or spawn processes.
- Every production behavior follows RED, GREEN, REFACTOR. Record each focused
  test failure before changing its implementation.
- CR00 remains `running`; future nodes remain provisional and `planned`.
- Repository reconciliation and verification are read-only. They never update
  graph state, branches, pull requests, providers, or environments.
- GitHub protection/ruleset mutation remains separately authorized and is not
  performed by this implementation plan.
- CR00's ownership list must cover every changed path in this plan.

---

### Task 1: Close dependency, parent-cycle, and order holes

**Files:**

- Modify: `tooling/rebuild-graph.test.ts`
- Modify: `tooling/rebuild-graph.ts`

**Interfaces:**

- Consumes: existing `validateRebuildGraph(value: unknown): string[]`.
- Produces: parent-cycle detection and topological validation of
  `preferredPrOrder`; dependency completion applies to `done` as well as
  `ready` and `running`.

- [x] **Step 1: Add the done-with-undone-dependency regression**

```ts
it("rejects a done node whose dependency is not done", () => {
  expect(
    errorsFor(
      graphWith({
        nodes: [
          nodeWith({ id: "CR00", kind: "slice", parent: null }),
          nodeWith({
            dependencies: ["CR00"],
            evidence: ["verified"],
            status: "done",
          }),
        ],
      }),
    ),
  ).toContain("done node CR01 depends on CR00 with status planned, not done");
});
```

- [x] **Step 2: Run the focused test and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph.test.ts -t "rejects a done node whose dependency is not done"`

Expected: FAIL because the current validator returns no dependency error for a
done node.

- [x] **Step 3: Apply dependency completion to executable terminal claims**

Change the dependency-status condition from `ready || running` to
`ready || running || done`, keeping the existing deterministic error format.

- [x] **Step 4: Run the focused test and observe GREEN**

Run the Step 2 command. Expected: PASS.

- [x] **Step 5: Add parent-cycle and dependency-invalid-order regressions**

```ts
it("rejects parent cycles", () => {
  expect(
    errorsFor(
      graphWith({
        nodes: [
          nodeWith({ id: "CR01", parent: "CR02" }),
          nodeWith({ id: "CR02", parent: "CR01" }),
        ],
        preferredPrOrder: ["CR01", "CR02"],
      }),
    ),
  ).toContain("parent graph contains a cycle: CR01 -> CR02 -> CR01");
});

it("rejects a preferred PR order that places a node before its dependency", () => {
  expect(
    errorsFor(
      graphWith({
        nodes: [
          nodeWith({ id: "CR01", dependencies: ["CR02"] }),
          nodeWith({ id: "CR02" }),
        ],
        preferredPrOrder: ["CR01", "CR02"],
      }),
    ),
  ).toContain("preferredPrOrder places CR01 before dependency CR02");
});
```

- [x] **Step 6: Run both tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph.test.ts -t "rejects parent cycles|rejects a preferred PR order"`

Expected: both FAIL because only dependency cycles are detected and numeric
order is currently the only order constraint.

- [x] **Step 7: Implement generic cycle and topological-order helpers**

Create an internal `findCycles(nodes, edgesForNode)` helper used for dependency,
parent, and later replacement cycles. Drop the ascending-numeric check. Build
an order-index map and emit one error for each dependency whose index is after
its dependent.

- [x] **Step 8: Run the complete graph test file and commit**

Run: `node_modules/.bin/vitest run tooling/rebuild-graph.test.ts`

Expected: all graph tests pass.

Commit:

```bash
git add tooling/rebuild-graph.ts tooling/rebuild-graph.test.ts
git commit -m "fix: enforce rebuild graph ordering"
```

---

### Task 2: Replace hardcoded repository and target policy with validated data

**Files:**

- Modify: `tooling/rebuild-graph.test.ts`
- Modify: `tooling/rebuild-graph.ts`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

- Produces top-level `repository: { slug: string; defaultBranch: string }` and
  `targetPolicy: { prereleases: "forbidden"; refreshAt: "slice-start" }`.
- Produces node field
  `target: null | { product: string; constraint: string; selection:
"lts-major" | "latest-stable-patch" | "stable-major" |
"exact-sdk-major"; resolvedVersion: string }`.
- Removes `FROZEN_TARGET_MATRIX` and top-level `targetMatrix`.

- [x] **Step 1: Add a fixture using repository data and node-local targets**

Update `graphWith()` and `nodeWith()` with literal valid repository,
target-policy, `baseSha`, `supersededBy`, and `target` fields. Add this helper
for done-slice repository assertions and add one Expo node whose ID is not CR13
to prove target validation is ID-independent:

```ts
const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";

function doneSliceWith(overrides: Record<string, unknown> = {}) {
  return nodeWith({
    baseSha: FULL_SHA,
    branch: "codex/rebuild-test-v1",
    checks: ["pnpm test"],
    evidence: ["verified"],
    kind: "slice",
    mergeSha: FULL_SHA,
    ownership: ["tooling"],
    parent: null,
    pr: "https://github.com/otto-agent007/pp/pull/7",
    status: "done",
    ...overrides,
  });
}
```

- [x] **Step 2: Add repository and target regressions**

```ts
it("derives canonical PR URLs from graph repository data", () => {
  const graph = graphWith();
  expect(
    errorsFor({
      ...graph,
      repository: { slug: "example/fork", defaultBranch: "trunk" },
      nodes: [
        doneSliceWith({ pr: "https://github.com/otto-agent007/pp/pull/7" }),
      ],
      preferredPrOrder: ["CR01"],
    }),
  ).toContain(
    "done slice CR01 must include a pull request URL for example/fork",
  );
});

it("accepts node-local targets without hardcoded slice IDs or versions", () => {
  expect(
    validateRebuildGraph(
      graphWith({
        nodes: [
          nodeWith({
            id: "MOBILE-A",
            kind: "slice",
            parent: null,
            target: {
              product: "expo",
              constraint: "58",
              selection: "exact-sdk-major",
              resolvedVersion: "",
            },
          }),
        ],
        preferredPrOrder: ["MOBILE-A"],
      }),
    ),
  ).toEqual([]);
});
```

- [x] **Step 3: Run the two tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph.test.ts -t "derives canonical PR URLs|accepts node-local targets"`

Expected: FAIL because the validator hardcodes the repository and frozen target
matrix.

- [x] **Step 4: Implement generic repository, target policy, and target shape validation**

Delete `FROZEN_TARGET_MATRIX`. Validate the repository slug with
`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`, require a non-empty default branch,
require the two exact target-policy values, validate target objects generically,
and derive the done-slice PR URL prefix from `repository.slug`.

- [x] **Step 5: Migrate the checked-in graph data**

Replace `targetMatrix` with `repository` and `targetPolicy`. Add `target`,
`baseSha`, and `supersededBy` to all nodes. Set CR00 `baseSha` to
`a95be1ef64ebc2d90ba15c5d6aa92b71446d1f03`; set future `baseSha` values to
empty strings. Put Node, pnpm, Next.js, and Expo target objects on CR10 through
CR16 with the constraints and selection modes from the approved spec.

- [x] **Step 6: Run unit and real-graph checks and commit**

Run:

```bash
node_modules/.bin/vitest run tooling/rebuild-graph.test.ts
node --import tsx tooling/rebuild-graph.ts
```

Expected: both commands pass.

Commit:

```bash
git add tooling/rebuild-graph.ts tooling/rebuild-graph.test.ts docs/rebuild/graph.json
git commit -m "refactor: move rebuild targets into graph data"
```

---

### Task 3: Enforce structured evidence, promotion readiness, and lifecycle

**Files:**

- Modify: `tooling/rebuild-graph.test.ts`
- Modify: `tooling/rebuild-graph.ts`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

- Produces structured command and claim evidence from the spec.
- Produces terminal statuses `abandoned` and `superseded` plus
  `supersededBy: string | null`.
- Resolves superseded dependency chains without rewriting graph data.

- [x] **Step 1: Add literal evidence and execution-ready fixture helpers**

```ts
function commandEvidence(overrides: Record<string, unknown> = {}) {
  return {
    kind: "command",
    summary: "focused tests passed",
    command: "pnpm test",
    exitCode: 0,
    commitSha: FULL_SHA,
    recordedAt: "2026-08-24T20:00:00Z",
    ...overrides,
  };
}

function claimEvidence(overrides: Record<string, unknown> = {}) {
  return {
    kind: "review",
    summary: "controller reviewed the transition",
    commitSha: FULL_SHA,
    recordedAt: "2026-08-24T20:00:00Z",
    ...overrides,
  };
}

function executionReadyNode(overrides: Record<string, unknown> = {}) {
  return nodeWith({
    baseSha: FULL_SHA,
    checks: ["pnpm test"],
    ownership: ["tooling"],
    status: "ready",
    ...overrides,
  });
}

function doneNodeWith(overrides: Record<string, unknown> = {}) {
  return executionReadyNode({
    evidence: [commandEvidence()],
    status: "done",
    ...overrides,
  });
}
```

- [x] **Step 2: Add the fabricated-evidence and incomplete-promotion regressions**

```ts
it("rejects free-form evidence on done nodes", () => {
  expect(
    errorsFor(graphWith({ nodes: [doneNodeWith({ evidence: ["x"] })] })),
  ).toContain(
    "node CR01 evidence entry 0 must be a structured evidence record",
  );
});

it("requires execution-ready fields before promotion", () => {
  const errors = errorsFor(
    graphWith({
      nodes: [
        nodeWith({
          baseSha: "",
          checks: [],
          ownership: [],
          status: "ready",
        }),
      ],
    }),
  );
  expect(errors).toContain("ready node CR01 must include ownership");
  expect(errors).toContain("ready node CR01 must include checks");
  expect(errors).toContain("ready node CR01 must include a full base SHA");
});
```

- [x] **Step 3: Run the tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph.test.ts -t "rejects free-form evidence|requires execution-ready fields"`

Expected: both FAIL because evidence is a string array and promotion fields are
not enforced.

- [x] **Step 4: Implement evidence parsing and promotion checks**

Validate evidence discriminants, required fields, full commit SHAs, UTC
timestamps, command exits, and optional HTTPS URLs. Require ownership,
deliverables, checks, and `baseSha` for `ready`, `running`, and `done`. Require
running/done slice branches to match `^codex/[a-z0-9][a-z0-9-]*$`. Require a
successful command record with a full commit SHA for done nodes; repository
ancestry remains Task 4's responsibility.

- [x] **Step 5: Run the complete graph tests and observe GREEN**

Run: `node_modules/.bin/vitest run tooling/rebuild-graph.test.ts`

Expected: all tests pass.

- [x] **Step 6: Add lifecycle regressions**

```ts
it("does not let abandoned dependencies satisfy promotion", () => {
  expect(
    errorsFor(
      graphWith({
        nodes: [
          nodeWith({
            id: "CR00",
            status: "abandoned",
            evidence: [claimEvidence()],
          }),
          executionReadyNode({ dependencies: ["CR00"], status: "ready" }),
        ],
      }),
    ),
  ).toContain("ready node CR01 depends on abandoned node CR00");
});

it("requires acyclic superseded replacement chains ending in done", () => {
  const errors = errorsFor(
    graphWith({
      nodes: [
        nodeWith({
          id: "CR00",
          status: "superseded",
          supersededBy: "CR02",
          evidence: [claimEvidence()],
        }),
        executionReadyNode({ dependencies: ["CR00"], status: "ready" }),
        nodeWith({ id: "CR02", status: "planned" }),
      ],
    }),
  );
  expect(errors).toContain(
    "ready node CR01 resolves superseded dependency CR00 to CR02 with status planned, not done",
  );
});
```

- [x] **Step 7: Run lifecycle tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph.test.ts -t "abandoned dependencies|superseded replacement chains"`

Expected: FAIL because lifecycle statuses and replacement semantics do not
exist.

- [x] **Step 8: Implement terminal lifecycle and replacement resolution**

Add statuses, require terminal-state evidence, require `supersededBy` only for
superseded nodes, detect replacement cycles, resolve dependency chains, and run
cycle/topological checks over resolved dependencies. Do not mutate dependency
or ownership arrays.

- [x] **Step 9: Migrate CR00 evidence and commit**

Replace CR00's string evidence with structured records tied to real commits and
timestamps already present in Git history; drop any historical claim whose
command, exit, SHA, or timestamp cannot be proved. Keep future evidence arrays
empty.

Run:

```bash
node_modules/.bin/vitest run tooling/rebuild-graph.test.ts
node --import tsx tooling/rebuild-graph.ts
```

Expected: both pass.

Commit:

```bash
git add tooling/rebuild-graph.ts tooling/rebuild-graph.test.ts docs/rebuild/graph.json
git commit -m "feat: enforce rebuild lifecycle evidence"
```

---

### Task 4: Add repository reconciliation and ownership enforcement

**Files:**

- Create: `tooling/rebuild-graph-reconcile.test.ts`
- Create: `tooling/rebuild-graph-reconcile.ts`
- Modify: `package.json`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

```ts
export type PullRequestFact = {
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  mergeSha: string | null;
};

export type RepositoryFacts = {
  changedPaths: string[];
  existingCommits: string[];
  ancestorPairs: Array<{ ancestor: string; descendant: string }>;
  pullRequests: PullRequestFact[];
};

export function validateChangedPathOwnership(
  changedPaths: readonly string[],
  ownership: readonly string[],
): string[];

export function validateRepositoryClaims(
  graph: unknown,
  facts: RepositoryFacts,
): string[];

export async function runRebuildGraphReconcileCli(
  args?: readonly string[],
  cwd?: string,
  environment?: NodeJS.ProcessEnv,
): Promise<number>;
```

- [x] **Step 1: Write ownership regressions first**

Test exact-file coverage, directory-prefix coverage, prefix lookalikes such as
`tooling-old/file.ts`, normalized-path rejection, and an undeclared
`.github/workflows/ci.yml` change.

- [x] **Step 2: Run ownership tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph-reconcile.test.ts -t "ownership"`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement pure ownership matching**

Cover a changed path only when it equals an ownership path or is a descendant
of an owned directory path. Return sorted, deterministic errors for undeclared
paths.

- [x] **Step 4: Run ownership tests and observe GREEN**

Run the Step 2 command. Expected: PASS.

- [x] **Step 5: Add fabricated PR and merge-SHA fact regressions**

Use literal `RepositoryFacts` to prove that a missing PR, non-merged PR,
mismatched merge SHA, missing commit, non-ancestor merge commit, and missing or
non-ancestor evidence commit each fail. Also prove a matching merged PR,
evidence commit, and ancestor pairs pass.

- [x] **Step 6: Run repository-claim tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-graph-reconcile.test.ts -t "repository claims"`

Expected: FAIL because repository fact validation is absent.

- [x] **Step 7: Implement claim validation and bounded adapters**

Keep `validateRepositoryClaims` pure. In the CLI, use `git cat-file -e`,
`git merge-base --is-ancestor`, and `git diff --name-only` with
`spawnSync`. Use built-in `fetch` with `AbortSignal.timeout(15_000)` and
`GITHUB_TOKEN` or `GH_TOKEN` for GitHub REST reads. Never print tokens or raw
authorization headers.

- [x] **Step 8: Add scripts, the exact reconciliation check, and commit**

Add scripts:

```json
"rebuild:graph:reconcile": "node --import tsx tooling/rebuild-graph-reconcile.ts"
```

Add the command to CR00 checks. Run:

```bash
node_modules/.bin/vitest run tooling/rebuild-graph-reconcile.test.ts
node --import tsx tooling/rebuild-graph-reconcile.ts -- --offline
```

Expected: tests pass; offline reconciliation validates Git facts and ownership
while explicitly reporting that live PR checks were not requested. Live CI
mode remains mandatory in Task 6.

Commit:

```bash
git add tooling/rebuild-graph-reconcile.ts tooling/rebuild-graph-reconcile.test.ts package.json docs/rebuild/graph.json
git commit -m "feat: reconcile rebuild graph claims"
```

---

### Task 5: Move verification mechanics into tooling

**Files:**

- Create: `tooling/rebuild-verification.test.ts`
- Create: `tooling/rebuild-verification.ts`
- Modify: `package.json`
- Modify: `.agents/skills/pest-patrol-verification-gate/SKILL.md`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

```ts
export type GateStatus = "MISSING" | "STALE" | "BLOCKED" | "FAIL" | "PASS";
export type VerificationGate = { id: string; command: string };

export function selectVerificationGates(
  changedPaths: readonly string[],
  declaredChecks: readonly string[],
): VerificationGate[];

export function digestInputTree(path: string): string;

export function classifyGate(input: {
  provenanceComplete: boolean;
  stale: boolean;
  launched: boolean;
  isolatedInfrastructureFailure: boolean;
  exitCode: number | null;
}): GateStatus;

export function resolvePackageManager(
  declaration: string,
  candidates: readonly { path: string; version: string }[],
): string | null;
```

- [ ] **Step 1: Add gate-selection and package-manager RED tests**

Test the union of graph/validator, reconciliation, skill, TOML, source/test,
manifest/security, docs/config, and declared-node gates. Test exact version
matching and deterministic candidate ordering for `pnpm@9.15.4`.

- [ ] **Step 2: Run the tests and observe RED**

Run:
`node_modules/.bin/vitest run tooling/rebuild-verification.test.ts -t "selects|package manager"`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement gate selection and package-manager resolution**

Use normalized repository paths, stable IDs, deduplication by exact command,
and lexical ordering. Reject a candidate unless its reported version exactly
matches the package declaration.

- [ ] **Step 4: Add deterministic digest RED tests**

Create temporary trees containing files, nested directories, empty files, and
symlinks. Assert a literal digest fixture, stable results across creation order,
and changed results when file bytes or symlink targets change.

- [ ] **Step 5: Run digest tests and observe RED, then implement GREEN**

Run:
`node_modules/.bin/vitest run tooling/rebuild-verification.test.ts -t "digest"`

Expected before implementation: FAIL. Implement SHA-256 over sorted entries
containing entry type, normalized relative path, byte length, and bytes or
symlink target; rerun and expect PASS.

- [ ] **Step 6: Add classification precedence RED tests**

Use one literal case for each status and prove precedence:
incomplete provenance -> MISSING; complete but different identity -> STALE;
isolated launch failure -> BLOCKED; launched nonzero -> FAIL; complete exit zero
-> PASS.

- [ ] **Step 7: Implement classification and CLI evidence-set execution**

Capture pre/post commit, tree, status, UTC timestamps, declared ignored-input
digests, commands, exits, and classifications. Emit deterministic JSON plus a
short human summary. Refuse PASS when identities change or a required gate is
not PASS. Do not install or mutate external state.

- [ ] **Step 8: Reduce the verification skill and commit**

Replace prose algorithms with: run `pnpm rebuild:verify`, report its exact JSON
result, never waive a non-PASS result, and never fix failures from the verifier
role. Add script:

```json
"rebuild:verify": "node --import tsx tooling/rebuild-verification.ts"
```

Run:

```bash
node_modules/.bin/vitest run tooling/rebuild-verification.test.ts
python3 /home/user1/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/pest-patrol-verification-gate
```

Expected: both pass.

Commit:

```bash
git add tooling/rebuild-verification.ts tooling/rebuild-verification.test.ts package.json .agents/skills/pest-patrol-verification-gate/SKILL.md docs/rebuild/graph.json
git commit -m "feat: automate rebuild verification gates"
```

---

### Task 6: Wire real graph enforcement and governance into CI

**Files:**

- Create: `.github/CODEOWNERS`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

- CI supplies full Git history and read-only `GITHUB_TOKEN` to reconciliation.
- CODEOWNERS assigns `@otto-agent007` to control-plane paths.

- [ ] **Step 1: Add a real checked-in graph test**

```ts
it("accepts the checked-in rebuild graph", () => {
  const graph = JSON.parse(
    readFileSync(resolve(process.cwd(), "docs/rebuild/graph.json"), "utf8"),
  );
  expect(validateRebuildGraph(graph)).toEqual([]);
});
```

- [ ] **Step 2: Temporarily corrupt a copied graph and observe RED through the CLI**

Write an invalid graph to a Vitest temporary directory, invoke
`runRebuildGraphCli([path])`, and assert exit `1`. Then retain only the
checked-in valid-graph regression in permanent tests.

- [ ] **Step 3: Update root tests and CI**

Add reconciliation and verification test files to the root `test` script.
Configure checkout with `fetch-depth: 0`. After install and before general
tests, add explicit `pnpm rebuild:graph:check` and
`pnpm rebuild:graph:reconcile` steps. Give the reconciliation step
`contents: read` and `pull-requests: read` permissions via the job token.

- [ ] **Step 4: Add CODEOWNERS**

```text
/docs/rebuild/ @otto-agent007
/tooling/rebuild-graph.ts @otto-agent007
/tooling/rebuild-graph.test.ts @otto-agent007
/tooling/rebuild-graph-reconcile.ts @otto-agent007
/tooling/rebuild-graph-reconcile.test.ts @otto-agent007
/tooling/rebuild-verification.ts @otto-agent007
/tooling/rebuild-verification.test.ts @otto-agent007
/.github/workflows/ci.yml @otto-agent007
/.github/CODEOWNERS @otto-agent007
```

- [ ] **Step 5: Prove every changed path is owned**

Run:
`node --import tsx tooling/rebuild-graph-reconcile.ts -- --offline`

Expected: PASS with no undeclared changed paths, including CODEOWNERS, CI, the
spec, and this plan.

- [ ] **Step 6: Run focused integration checks and commit**

Run:

```bash
pnpm rebuild:graph:check
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
git diff --check
```

Expected: all pass.

Commit:

```bash
git add .github/CODEOWNERS .github/workflows/ci.yml package.json docs/rebuild/graph.json tooling/rebuild-graph.test.ts
git commit -m "ci: enforce controlled rebuild graph"
```

---

### Task 7: Canonicalize lifecycle and operating documentation

**Files:**

- Modify: `docs/rebuild/README.md`
- Modify: `docs/AGENTS.md`
- Modify: `docs/CODEX_OPERATING_PLAN.md`
- Modify: `.agents/skills/pest-patrol-rebuild-orchestrator/SKILL.md`
- Modify: `tasks/in-progress.md`
- Modify: `docs/rebuild/graph.json`

**Interfaces:**

- `docs/rebuild/README.md` is the one detailed operating contract.
- Entry documents link to the runbook and retain only launch and authority
  boundaries.

- [ ] **Step 1: Update the canonical runbook**

Document the pure/reconciliation split, true topological preference,
promotion readiness, structured evidence, node-local target refresh, terminal
lifecycle semantics, closed-unmerged -> blocked flow, ownership enforcement,
CI fact checks, and protection-before-merge requirement.

- [ ] **Step 2: Remove duplicated scheduling algorithms**

Reduce `docs/AGENTS.md`, `docs/CODEX_OPERATING_PLAN.md`, and the orchestrator
skill to links plus non-negotiable authority boundaries. The orchestrator runs
the graph check and reconciliation commands instead of reinterpreting their
algorithms.

- [ ] **Step 3: Record the review-repair state**

Update `tasks/in-progress.md`, CR00 deliverables/checks/evidence, and the graph
ownership list to match the actual final paths and commands. Do not mark CR00
done or invent merge evidence.

- [ ] **Step 4: Validate docs, graph, and skills and commit**

Run:

```bash
node --import tsx tooling/rebuild-graph.ts
node --import tsx tooling/rebuild-graph-reconcile.ts -- --offline
python3 /home/user1/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/pest-patrol-rebuild-orchestrator
python3 /home/user1/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/pest-patrol-architecture-guard
python3 /home/user1/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/pest-patrol-verification-gate
git diff --check
```

Expected: all pass.

Commit:

```bash
git add docs/rebuild/README.md docs/AGENTS.md docs/CODEX_OPERATING_PLAN.md .agents/skills/pest-patrol-rebuild-orchestrator/SKILL.md tasks/in-progress.md docs/rebuild/graph.json
git commit -m "docs: reconcile CR00 operating contract"
```

---

### Task 8: Full verification, review, and draft-PR update

**Files:**

- Modify when evidence changes: `docs/rebuild/graph.json`
- Modify when status changes: `tasks/in-progress.md`

**Interfaces:**

- Consumes every command and invariant above.
- Produces a verified pushed head on existing draft PR #146; does not merge.

- [ ] **Step 1: Resolve the exact pnpm launcher and capture pre-identities**

Use the declared `pnpm@9.15.4`, record the absolute launcher, `HEAD`,
`HEAD^{tree}`, worktree status, and ignored-input identities required by
`rebuild:verify`.

- [ ] **Step 2: Run focused control-plane verification**

```bash
pnpm exec vitest run tooling/rebuild-graph.test.ts tooling/rebuild-graph-reconcile.test.ts tooling/rebuild-verification.test.ts
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile
pnpm rebuild:verify
```

Expected: all PASS.

- [ ] **Step 3: Run repository-wide gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:baseline
git diff --check
```

Expected: all exit 0. Existing unrelated warnings are reported separately and
are not rewritten without a failing CR00 gate.

- [ ] **Step 4: Validate skills and agent profiles**

Run all three `quick_validate.py` commands. Parse every `.toml` with Python
`tomllib` and rerun the exact profile assertions from the original CR00 plan.

- [ ] **Step 5: Review the complete diff**

Check pure/side-effect boundaries, deterministic ordering, token redaction,
path normalization, lifecycle cycles, shallow-clone assumptions, CI
permissions, CODEOWNERS coverage, rule duplication, and application-scope
exclusions. Resolve all Critical and Important findings through a fresh RED /
GREEN cycle.

- [ ] **Step 6: Commit final evidence-only reconciliation if needed**

Only add evidence that has exact command, exit, SHA, and UTC timestamp. Do not
mark CR00 done or supply a merge SHA while PR #146 remains open.

- [ ] **Step 7: Push and refresh PR #146**

```bash
git push origin codex/rebuild-cr00-control-plane-v1
gh pr view 146 --repo otto-agent007/pp --json isDraft,state,mergeable,statusCheckRollup,url
```

Expected: push succeeds; PR #146 remains open and draft. Check CI once and
report its current result without entering a watch loop.

- [ ] **Step 8: Stop before provider mutation or merge**

Report the exact ruleset/branch-protection change still requiring separate
authorization. Do not enable protection and do not merge the PR in this task.
