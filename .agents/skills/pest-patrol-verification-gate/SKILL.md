---
name: pest-patrol-verification-gate
description: Use when deciding whether a Pest Patrol slice may claim verification, completion, or PR readiness, especially after changes, failed checks, or unavailable tooling.
---

# Pest Patrol Verification Gate

Verify read-only: report evidence and a verdict; never fix failures or create
authority.

## Select the gates

For completion or PR readiness, require a clean relevant worktree. Record
`HEAD` and `HEAD^{tree}` before and after the gate set. If relevant tracked or
untracked paths are dirty, final-tree evidence is `MISSING` and no completion or
PR `PASS` is possible until a clean final tree exists.

Inventory changed paths from merge-base/base-to-`HEAD`; apply the union of all
matching rules:

- executable, source, or test path: owning-package focused tests;
- package manifest or lockfile: frozen install and applicable dependency/security checks;
- rebuild graph or validator: graph unit test and CLI check;
- changed skill: official `quick_validate.py` for each skill;
- TOML: parser/schema assertions; and
- docs or config: diff, link, schema, or static checks.

If a path has no direct mapped check, record the gap `MISSING` and refuse `PASS`
until the applicable plan or controller supplies one. Add every required
plan/project command; an explicitly named gate remains applicable regardless of
the diff. Neither the verifier nor an ad hoc external exception/exemption can
waive it: it remains required until the authoritative plan/policy is amended.

## Execute and classify

Resolve the repository-declared package manager/version or mark affected gates
`BLOCKED` with isolation evidence. For every gate, record exact command, exit
code, result, timestamp, and tested worktree plus `HEAD`/`HEAD^{tree}`.

| Status | Meaning |
|---|---|
| `PASS` | Exit 0 on the recorded tested tree. |
| `FAIL` | The project check started and returned nonzero. |
| `BLOCKED` | It could not execute due to isolated tooling/infrastructure. A nonzero shell result is `BLOCKED` only when evidence proves the project check never started or reached assertions and a bounded independent control isolates that cause; otherwise `FAIL`. |
| `MISSING` | Required command was not run, or a claimed run lacks any required provenance field. |
| `STALE` | Provenance proves an older or different relevant tree/worktree. |

Relevant changes invalidate affected evidence. Do not call an environmental
failure `PASS` or invent a waiver.

## Verdict

Emit `PASS` only when the worktree is clean, pre/post `HEAD` and tree identities
match, and every applicable required gate is fresh `PASS`. Emit `FAIL` for any
required `FAIL`, `MISSING`, or `STALE`; otherwise emit `BLOCKED` for required
`BLOCKED`. Any non-`PASS` blocks verification, completion, and PR-readiness:
list each blocker and the required next evidence, without suggesting a waiver.
