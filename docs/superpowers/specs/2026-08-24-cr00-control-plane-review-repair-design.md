# CR00 Control-Plane Review Repair Design

## Purpose

Repair the correctness and governance gaps found during review of draft PR
#146 without widening CR00 into application, dependency, migration, provider,
preview, environment, or production work. CR00 remains the one running
controlled-rebuild slice and PR #146 remains its one draft PR.

The graph is intentionally a state machine plus a provisional roadmap. Planned
future nodes may remain incomplete. A node must become execution-ready before
it can transition to `ready`, `running`, or `done`.

## Design principles

1. `validateRebuildGraph(value)` remains pure, deterministic, and free of
   filesystem, Git, network, environment, and process side effects.
2. Repository facts are checked by a separate reconciliation tool. CI requires
   reconciliation, but the command is also locally runnable when Git history
   and GitHub credentials are available.
3. Every behavioral repair follows RED, GREEN, REFACTOR. Each regression test
   must be observed failing for the intended reason before production code is
   changed.
4. Mechanical verification policy belongs in tested tooling. The verification
   skill becomes a short instruction to run the tool, report its result, and
   never waive a failed or missing gate.
5. Future-slice details are not fabricated. Structural completeness is enforced
   at promotion time instead of graph authoring time.

## Pure graph model

### Repository identity

The graph stores repository identity as data:

```json
{
  "repository": {
    "slug": "otto-agent007/pp",
    "defaultBranch": "main"
  }
}
```

The validator checks normalized GitHub slug and branch-name structure without
hardcoding this repository. Canonical pull-request URLs are derived from the
graph repository slug.

### Target policy

Remove `FROZEN_TARGET_MATRIX` and the CR13-through-CR16 mapping from validator
code. The graph retains the non-negotiable policy that prereleases are
forbidden and that targets are refreshed at the start of their applicable
slice. Runtime target data lives on the applicable node:

```json
{
  "target": {
    "product": "expo",
    "constraint": "54",
    "selection": "exact-sdk-major",
    "resolvedVersion": ""
  }
}
```

All nodes carry `target`, using `null` when the node is not a version slice.
The validator checks target shape and allowed selection forms generically; it
does not hardcode node IDs or target versions. `resolvedVersion` may remain
empty while a node is planned, but an execution-ready version node requires a
non-empty stable version selected with recorded approval evidence.

### Node identity and lifecycle fields

Every node carries:

- `baseSha`: empty for provisional nodes and a full commit SHA for
  execution-ready nodes;
- `supersededBy`: `null` unless status is `superseded`;
- `target`: `null` or the target object above;
- structured `evidence` records instead of free-form strings.

Allowed statuses are `planned`, `ready`, `running`, `blocked`, `done`,
`abandoned`, and `superseded`.

`abandoned` and `superseded` are terminal. An abandoned node never satisfies a
dependency. A superseded node requires a non-self replacement that exists.
Replacement chains must be acyclic. A `ready`, `running`, or `done` dependent
that names a superseded dependency resolves through the replacement chain and
requires the terminal replacement to be `done`. No ownership, checks,
evidence, target, or dependent list is inherited or rewritten automatically.
The dependency graph after replacement resolution must remain acyclic.

### Parent and preferred order

`parent` remains an explicit containment relation for this schema version.
Parent references must exist, may not self-reference, and must form an acyclic
forest. Parent relationships do not satisfy dependencies and do not imply
state transitions.

`preferredPrOrder` remains the scheduler's deterministic tie breaker. It must
contain every node exactly once and must be a valid topological order of the
resolved dependency graph. The validator drops the ascending-numeric rule so
the field can express a real preference between independent eligible nodes.

### Promotion readiness

Nodes in `ready`, `running`, or `done` require:

- at least one non-empty ownership path;
- at least one deliverable;
- at least one exact check command;
- a full `baseSha`;
- a non-empty correctly named `codex/*` branch for `running` or `done` slices;
- every resolved dependency in `done` state;
- a resolved stable target plus approval evidence when `target` is non-null.

Done nodes additionally require structured verification evidence. Done slices
require a canonical PR URL and full merge SHA. These are structural claims in
the pure validator; repository reconciliation proves whether the claims are
true.

### Structured evidence

Evidence uses two variants:

```ts
type CommandEvidence = {
  kind: "command";
  summary: string;
  command: string;
  exitCode: number;
  commitSha: string;
  recordedAt: string;
};

type ClaimEvidence = {
  kind: "review" | "approval" | "github";
  summary: string;
  commitSha: string;
  recordedAt: string;
  url?: string;
};
```

Timestamps must be valid UTC ISO-8601 strings and commit SHAs must be full
hexadecimal identifiers. A done node requires at least one successful command
record for its current commit. Version targets require an approval record for
the current commit before promotion.

## Repository reconciliation

`tooling/rebuild-graph-reconcile.ts` owns side-effecting repository checks. Its
CLI reads the graph and uses bounded Git and GitHub adapters. Core comparison
functions accept facts as inputs so unit tests remain deterministic.

The tool checks:

1. The graph passes pure structural validation.
2. Every done slice PR exists in the declared repository, is merged, and reports
   the same merge SHA as the graph.
3. Every done-slice merge SHA exists and is an ancestor of the declared default
   branch.
4. The running node's `baseSha` exists and is an ancestor of `HEAD`.
5. Every path in `git diff --name-only <baseSha>...HEAD` is covered by the
   running node's ownership list. Directory ownership covers descendants;
   file ownership covers only that exact path.

Missing Git history, credentials, network evidence, malformed provider data,
timeouts, and undeclared changed paths fail reconciliation. The tool never
updates the graph, branches, pull requests, or provider settings.

CI uses `actions/checkout` with `fetch-depth: 0`, runs the pure graph command,
then runs reconciliation with the workflow's read-only GitHub token.

## Mechanical verification

`tooling/rebuild-verification.ts` replaces the prose-only deterministic logic
from the verification skill. It provides tested functions and a CLI for:

- resolving the exact package manager declared by `packageManager` from an
  explicit path, PATH, Corepack, or a version-matching npm cache launcher;
- selecting the union of required gates from changed repository paths and the
  running node's declared checks;
- computing deterministic SHA-256 digests for explicitly declared ignored
  input files, directories, and symlinks;
- recording pre/post `HEAD`, `HEAD^{tree}`, worktree status, timestamps, input
  digests, commands, exits, and classifications in one evidence-set result;
- classifying `MISSING`, `STALE`, `BLOCKED`, `FAIL`, and `PASS` without waiver.

The CLI does not install dependencies or mutate external state. A missing exact
package manager or required input is reported, not repaired. Human-readable
output is accompanied by a deterministic JSON result suitable for review and
future graph evidence.

## Ownership and governance

CR00's ownership list must contain every changed repair path. Reconciliation
mechanically compares the final diff to that list so the repair itself is the
first acceptance test of ownership enforcement.

`.github/CODEOWNERS` assigns a human owner to:

- `docs/rebuild/`;
- `tooling/rebuild-graph.ts` and its test;
- reconciliation and verification tooling and tests;
- `.github/workflows/ci.yml`;
- `.github/CODEOWNERS` itself.

CODEOWNERS is not an enforcement boundary by itself. PR #146 may not merge
after target constants move into graph data until a separately authorized
GitHub ruleset or branch-protection configuration requires pull requests,
human approval, code-owner approval where applicable, and dismissal of stale
approvals after new pushes. No provider mutation is part of the local code
implementation without that separate authorization.

## Documentation

`docs/rebuild/README.md` is the canonical lifecycle, scheduling, target,
evidence, reconciliation, and governance contract. Root/project operating docs
link to it and retain only entry-point and authority boundaries. The three
repo-local skills link to executable tooling instead of repeating mechanical
algorithms.

The runbook defines the closed-unmerged flow: a node becomes `blocked` while
the controller decides whether to retry, abandon, or supersede it. Abandonment
and supersession require structured evidence; supersession also requires the
replacement relationship described above.

## Verification and delivery

Focused tests run after every RED/GREEN cycle. Final verification includes:

- pure graph unit tests and the checked-in graph;
- reconciliation and verification-tool tests;
- repository reconciliation against the CR00 branch;
- all three repo-local skill validations;
- TOML profile assertions;
- root test, typecheck, lint, build, security baseline, and `git diff --check`;
- a final architecture and correctness review of the complete diff.

Verified changes are committed and pushed to
`codex/rebuild-cr00-control-plane-v1`, updating existing draft PR #146. The PR
remains draft and unmerged pending human review and the separately authorized
GitHub protection step.
