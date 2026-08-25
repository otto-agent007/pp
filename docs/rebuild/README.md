# Controlled rebuild operator runbook

`docs/rebuild/graph.json` is the versioned state machine and provisional
roadmap for the Pest Patrol controlled rebuild. Planned nodes may remain
incomplete; promotion, not initial authoring, requires execution-ready detail.

Run these commands before relying on graph state:

```bash
pnpm rebuild:graph:check
pnpm rebuild:graph:reconcile -- --offline
```

The first command is pure structural validation. The second checks local Git
ancestry and the running slice's changed paths against its ownership. CI runs
live reconciliation with full history and a read-only GitHub token. Live
GitHub state wins over stale tracked state.

## Scheduling model

Only one implementation slice and one draft PR may be active. Read-only
preparation for a future node may not edit tracked files, create a branch or
PR, or claim `running`. The controller resolves the running node before another
slice begins.

`preferredPrOrder` contains every node once and is a valid topological order of
the resolved dependency graph. It is a deterministic tie breaker between
otherwise eligible nodes, not numeric restatement. `parent` is an acyclic
containment relation only; it neither satisfies dependencies nor changes
state. Conflicts prohibit nodes from running together.

The lifecycle states are:

- `planned`: provisional roadmap entry;
- `ready`: execution-ready, with every resolved dependency done;
- `running`: the one active implementation slice;
- `blocked`: progress requires a decision or failed/missing gate resolution;
- `done`: verified and, for a slice, merged with canonical PR and merge SHA;
- `abandoned`: terminal, evidenced, and never dependency-satisfying;
- `superseded`: terminal and evidenced, with an existing non-self replacement.

Replacement chains must be acyclic. A promoted dependent resolves a
superseded dependency through that chain and requires the terminal replacement
to be `done`. Nothing else—ownership, checks, evidence, targets, or dependent
lists—is inherited or rewritten.

If a running slice's PR closes unmerged, record the live GitHub fact and move
the slice to `blocked`. The controller then decides whether to reopen it or
transition it, with evidence, to `abandoned` or `superseded`. A superseded
transition must name its replacement. Do not perform an automatic graph
rewrite.

## Promotion and targets

Before `ready`, `running`, or `done`, a node requires non-empty ownership,
deliverables, exact check commands, and a full `baseSha`. A running or done
slice also requires a correctly named `codex/*` branch. Every resolved
dependency must be done.

Version policy lives on the applicable node rather than in validator code.
CR10 targets Node 24 LTS, CR11 pnpm 11 stable, CR12 Next.js 16 stable, and
CR13–CR16 one Expo SDK each from 54 through 57. At slice start, resolve the
node's declared constraint to a released stable version, record controller
approval evidence, and freeze that exact version for the slice. Prereleases
are forbidden.

## Evidence and repository facts

Evidence is structured and commit-bound:

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

Use full commit SHAs and UTC timestamps. A done node needs successful command
evidence. Shape validation is deliberately pure; reconciliation separately
proves merged PR state, merge-SHA agreement, source history, tree identity,
running-base ancestry, default-branch ancestry, and ownership coverage.

For a done slice, each evidence commit must belong to the canonical pull
request's original commit set. The original PR head tree must exactly match the
tree at the recorded merge SHA. This binds evidence across merge commits,
squash merges, and rebased merges without treating rewritten commit ancestry as
proof or accepting content changed during merge. Offline reconciliation
reconstructs these facts from a retained local source branch; live
reconciliation reads the immutable PR commit set and both tree identities from
GitHub. Missing history, credentials, provider data, or network evidence fails
the applicable reconciliation mode.

Run `pnpm rebuild:verify` for completion or PR-readiness evidence. It selects
the union of path-driven and node-declared gates, resolves the exact declared
package manager without installing it, digests declared ignored inputs, binds
results to pre/post commit, tree, and worktree identities, and emits one JSON
evidence set. `MISSING`, `STALE`, `BLOCKED`, or `FAIL` is never a waiver.

An explicitly controller-approved post-merge control-plane repair may verify a
named done slice with `pnpm rebuild:verify -- --recovery-slice <id>`. Recovery
mode refuses to run while another slice is running, uses the done slice's merge
SHA as its base, and turns changes outside that slice's ownership into missing
gates. It is not a substitute for normal running-slice verification.

## Ownership and governance

Every changed path from the running slice's `baseSha` through `HEAD` must equal
an ownership path or descend from an owned directory. Prefix lookalikes do not
count. CR00 owns its graph, tests, reconciliation and verification tooling,
workflow, CODEOWNERS, skills, profiles, scripts, and operating documents.

CODEOWNERS documents the human owner of the control plane, but the file does
not enforce a review by itself.
While the repository has one trusted human maintainer, the authorized ruleset
requires pull requests and the strict `verify` check, blocks deletion and force
pushes, and has no bypass actors. Required approvals remain zero and required
code-owner review remains disabled so the pull-request author is not
self-deadlocked. Automated reviews are advisory and do not impersonate an
independent approval. Dismissal of stale approvals after new pushes remains
enabled and becomes consequential once approvals are required. When a second
trusted human maintainer receives write access, add that maintainer to
CODEOWNERS before enabling one required approval and required code-owner review.
Local implementation does not grant provider mutation authority.

Start every slice from its intended base on a fresh correctly named `codex/*`
branch. The first commit of a new slice reconciles its predecessor. Security,
migration, provider, environment, preview, production, push, and PR decisions
remain controller-approved boundaries. Never record secrets or privileged
provider values as evidence.

## Architecture destination

The roadmap moves toward bounded-context types in `packages/types`, pure rules
in `packages/domain`, ports and use cases in `packages/application`, adapters in
`packages/api-client`, a durable offline queue in `packages/sync`, and apps as
composition roots. UI never accesses Supabase directly, and mobile writes stay
queue-first. CR00 builds only the control plane; it does not implement that
destination or change application, dependency, migration, provider, preview,
environment, or production state.
