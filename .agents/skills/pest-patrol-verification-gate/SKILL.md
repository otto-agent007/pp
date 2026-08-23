---
name: pest-patrol-verification-gate
description: Use when deciding whether a Pest Patrol slice may claim verification, completion, or PR readiness, especially after changes, failed checks, or unavailable tooling.
---

# Pest Patrol Verification Gate

Verify read-only. Report evidence and a verdict; never fix failures, grant an
exception, or create authority.

## Establish the gate set

1. Identify the exact tested state: worktree, `HEAD` (or other tree identity),
   relevant dirty paths, and evidence timestamp. Resolve the repository-declared
   package manager and exact version. If it cannot be executed, record the
   isolation evidence and mark the affected gate `BLOCKED`; do not substitute a
   different tool or waive it.
2. Select focused checks plus every repository-required command from the
   applicable plan and project policy. An explicitly required command remains
   required even if the diff appears docs-only or dependencies appear unchanged.

## Execute and record

For every applicable gate, record its exact command, exit code, result,
evidence timestamp, tested-tree identity, and one status:

| Status | Meaning |
|---|---|
| `PASS` | Executed with exit 0 on the tested tree. |
| `FAIL` | Executed and exited nonzero. |
| `BLOCKED` | Could not execute because evidence isolates an infrastructure or environment cause. |
| `MISSING` | Required but not run. |
| `STALE` | Evidence is older than, or from a different relevant tree/worktree state. |

After a relevant code, configuration, dependency, generated-output, or
worktree-state change, invalidate affected evidence and mark it `STALE` until
rerun. A claimed pass without the recorded command, exit code, timestamp, and
tree identity is not fresh evidence.

Classify an environmental failure as `BLOCKED` only after logs or a bounded,
independent reproduction isolates the environment from the project. It is never
`PASS`, and the verifier cannot create a waiver or exception.

## Verdict and claims

Emit `PASS` only when every applicable required gate is a fresh `PASS` on the
tested tree. Emit `FAIL` when any required gate is `FAIL`, `MISSING`, or
`STALE`; otherwise emit `BLOCKED` when a required gate is `BLOCKED`.

Only an overall `PASS` permits a verification, completion, or PR-readiness
claim. For `FAIL` or `BLOCKED`, list the blocking gates and required next
evidence; for `MISSING` or `STALE`, refuse the claim and state the rerun needed.
