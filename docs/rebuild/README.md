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

Before marking a slice `done`, the immutable lightweight tag
`rebuild/<lowercase-slice-id>-source` must exist at the canonical pull-request
head. For example, CR00 uses `rebuild/cr00-source`. Never move or reuse a source
tag.

A **write task** — a `kind: "task"` node a slice decomposes into, such as CR09A
— is held to every rule in this runbook that a slice is: the same ownership
boundary, the same `pnpm rebuild:verify` evidence, and its own source tag
(`rebuild/cr09a-source`). It ships its own pull request and is recorded `done`
from its own merge. The only rules it is exempt from are the ones the graph
validator applies to slices alone, because a task need not carry a branch, a
pull request or a merge SHA in order to be `planned`.

The `Rebuild source tag` workflow publishes it automatically when a slice's pull
request merges. It matches the merged pull request against the running node by
**both** its URL and its head branch, because between a slice merging and its
record catching up the default branch still names that slice as running, and a
control-plane pull request merged in that window would otherwise look like it.
The workflow creates the tag and never moves it: if the tag already exists at a
different commit it fails rather than rewriting recorded history. Publish by
hand only if that workflow did not run.
Ordinary clones fetch tags, so completed-slice evidence remains available after
GitHub deletes the source branch. Missing tags fail both offline and live
reconciliation; fetch tags or use live reconciliation to diagnose the recorded
pull-request identity.

## Scheduling model

Only one implementation slice and one slice PR may be active. An explicitly
controller-approved control-plane recovery PR is not another implementation
slice and may coexist only when it names a done slice through recovery
verification; it may not promote a future node. The controller resolves and
reconciles the running node before another slice is promoted.

While slice N is in review, slice N+1 may perform read-only exploration and
draft its promotion specification in an isolated, non-authoritative workspace.
That preparation may not claim ownership, change graph state, open the next
slice PR, or begin implementation. After N merges, refresh the draft against
the reconciled default branch, obtain promotion approval, and start N+1 on a
fresh correctly based branch. Promotion never rests on a predecessor that is
merely green, approved, or waiting for auto-merge.

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
CR10 targets Node 24 LTS, CR11 pnpm 12 stable, CR12 Next.js 16 stable, CR13
Expo SDK 54, CR14 Expo SDK 55, and CR15 the SDK 56-to-57 hop. CR15's final SDK
57 version may not be lower than 57.0.9 because that is the Hermes-fix floor;
CR16 is superseded by CR15. At slice start, refresh the node's declared
constraint to a released stable version at or above any recorded floor, record
controller approval evidence, and freeze that exact version for the slice.
Prereleases are forbidden.

## Deferred work is an edge, not a sentence

A slice that decides some of its work belongs to a later one records that on the
node, in an optional `defers` array:

```ts
defers?: { to: string; summary: string }[];
```

`to` names a live node. It may not be the node itself, a node that does not
exist, an abandoned node, or one superseded into nothing. A node that is not
itself `done` may not defer into a node that is: that work would never be picked
up. A `done` node pointing at a `done` node is history and stays legal.

The validator also reads the node's own prose. If a deliverable or approval says
work is deferred, left unwired, or belongs to a later slice, and the node
records no `defers` entry, that is an error naming the sentence.

This rule exists because of a specific failure. CR05 wrapped the `supabase`
singleton and put removal off; CR06 moved the durable queue and left CR04's
mutation outcome semantics unwired. Both decisions were correct and both were
recorded only as sentences, so no node owned the work, no gate asked for it, and
each following slice rediscovered it. Both are now edges, and the second one has
a node.

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
reconstructs these facts from the deterministic source tag; it never trusts a
retained branch, which may be stale or deleted. Live reconciliation also
requires that tag and proves its commit is the canonical GitHub PR head before
reading the immutable PR commit set and both tree identities from GitHub.
Missing tags, history, credentials, provider data, or network evidence fails
the applicable reconciliation mode.

### Expo native-build evidence

Expo migration slices must prove native-project compatibility even though the
ordinary CI runner does not compile iOS or Android applications. Before
promotion, put the exact Expo Doctor and prebuild commands in the node's
declared checks. The native-build gate accepts successful, commit-bound
`command` evidence for Expo Doctor and clean, no-install prebuild generation
for both iOS and Android. Run prebuild in a disposable clean checkout and
record the exact commands, exit codes, commit SHA, and UTC timestamps; generated
native projects are evidence inputs, not an authorization to commit them.

Where a native compile is required and CI cannot perform it, record one
`github` evidence item per required platform whose URL is the immutable EAS
build page. Its summary must name the platform, build profile, successful
result, and source commit. A dashboard landing page, mutable build list, job
still in progress, failed build, missing platform, mismatched commit, prose-only
claim, or local unrecorded run is `MISSING`, not a waiver. EAS execution and
provider configuration remain separately controller-approved actions; this
policy defines acceptable evidence but does not authorize those actions.

Tree identity requires the source branch to contain the current default-branch
tree at merge time. Bring it up to date before merging, either by rebasing or
by merging the default branch into the source branch. If the default branch
advances again, rerun the required checks against the new head.

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
CI does not infer a recovery slice when no node is running, so a recovery PR
must report this mechanical evidence explicitly; no-running-slice ownership
remains a review boundary until a durable CI selector is designed.

## Ownership and governance

Every changed path from the running slice's `baseSha` through `HEAD` must equal
an ownership path or descend from an owned directory. Prefix lookalikes do not
count. In addition to its declared ownership, every selected slice implicitly
owns the exact files `docs/rebuild/graph.json`, `tasks/in-progress.md`, and
`pnpm-lock.yaml`, plus its own Markdown plan under
`docs/superpowers/plans/` when the filename contains that slice ID as a
lowercase hyphen-delimited token. It does not own another slice's plan or a
prefix lookalike. The reconciler enforces this standing policy for the running
slice, and recovery verification enforces it for the explicitly selected done
slice. Thus the root lockfile belongs mechanically to whichever slice is
running, or to the controller-selected recovery slice during an approved
post-merge repair; it is never ownerless shared scope. CR00 additionally owns
its tests, reconciliation and verification tooling, workflow, CODEOWNERS,
skills, profiles, scripts, and operating documents.

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

## Merge authorization checklist

Before merging a slice or recovery PR:

1. Freeze the reviewed PR head and prove it is based on the current reconciled
   default branch.
2. Run the applicable clean-tree rebuild verifier on that head and require
   every selected gate to pass.
3. Complete external adversarial pre-review. Under solo-maintainer governance
   this review is advisory rather than a fabricated independent approval, but
   every Critical or Important finding must be resolved or explicitly rejected
   with reproducible evidence.
4. Require all repository ruleset checks to be green and record controller
   approval for that PR to merge.
5. For a normal slice, confirm the immutable source tag exists at the frozen
   canonical PR head before later recording the node as done. The
   `Rebuild source tag` workflow publishes it on merge; confirm rather than
   assume, and publish by hand if the workflow did not run.

Recorded controller merge approval plus green required checks constitutes merge
authorization. Enable GitHub auto-merge under that authorization; do not issue
a synchronous merge command and do not wait in-session for the merge event.
The next controller cycle reads live GitHub state, reconciles the merge and
source evidence into the graph, and only then promotes a dependent slice.

Start every slice from its intended base on a fresh correctly named `codex/*`
branch. Security, migration, provider, environment, preview, production, push,
and PR decisions remain controller-approved boundaries. Never record secrets or
privileged provider values as evidence.

## Reconcile a merged slice before promoting the next one

A slice's pull request becomes merged at the one moment when no pull request is
open to record it, so the graph is necessarily one step behind for a while. That
window is expected. Reconciliation records the merge SHA and moves the node to
`done`; it may travel in the next slice's first commit, or in its own
control-plane pull request when nothing else is queued.

The window is not urgent because nothing depends on the record being fresh
until a dependent is promoted, and `pnpm rebuild:graph:check` already refuses
that while the predecessor is not `done`. Reconciliation is therefore the first
thing the next slice does, and promotion still never rests on a predecessor
that is merely merged.

Reconciliation does not turn the default branch red. When a running slice's
pull request is merged **and** that merge commit is an ancestor of the default
branch, the reconciler skips the node's remaining running-slice checks and says
so on stdout. Those checks — base ancestry, changed-path ownership, evidence
against HEAD — all ask whether the slice is still in flight, and none of them
are answerable once it has merged and other work has landed on top. The node is
validated in full, and more strictly, once it is recorded as `done`.

Two neighbouring states stay hard errors, because neither is that window:

- a pull request **closed without merging**, which moves the slice to `blocked`
  as described above; and
- a pull request reported merged whose merge commit **has not landed** on the
  default branch, which means the recorded pull request is not the one that
  produced the default branch's history.

This replaces an earlier rule that required a dedicated reconciliation pull
request immediately after every slice. That rule existed because the merged
window used to fail the default branch's own CI: CR10 and CR11 each left it red
for hours, and CR11's window also failed an unrelated pull request. The
unrelated-pull-request half was fixed by treating an inherited graph as out of
scope; this is the other half.

A branch that leaves `docs/rebuild/graph.json` exactly as the default branch
wrote it is not held to a running slice it merely inherited. The reconciler
skips that node's pull-request state, base ancestry, evidence, and ownership
checks for such a branch and logs that it did, because none of them are
answerable there and failing them takes down every unrelated pull request. The
default branch itself, and any branch that does change the graph, are still
validated in full, so an outstanding reconciliation still turns the default
branch red.

## Architecture destination

The roadmap moves toward bounded-context types in `packages/types`, pure rules
in `packages/domain`, ports and use cases in `packages/application`, adapters in
`packages/api-client`, a durable offline queue in `packages/sync`, and apps as
composition roots. UI never accesses Supabase directly, and mobile writes stay
queue-first. CR00 builds only the control plane; it does not implement that
destination or change application, dependency, migration, provider, preview,
environment, or production state.
