---
name: pest-patrol-verification-gate
description: Use when deciding whether a Pest Patrol slice may claim verification, completion, or PR readiness, especially after changes, failed checks, or unavailable tooling.
---

# Pest Patrol Verification Gate

Verify read-only: report evidence and a verdict; never fix failures, run an
install, or create authority.

## Establish identity and gate set

Read the approved slice base from the active plan/graph. It must resolve and
`git merge-base --is-ancestor "$base" HEAD` must exit 0; otherwise base identity
is `MISSING`; an absent, ambiguous, unresolved, or non-ancestor base is
`MISSING`. Inventory exactly `git diff --name-only "$base...HEAD"`.

For completion/PR readiness, `git status --porcelain --untracked-files=all`
must be clean for all tracked and non-ignored untracked source inputs. Record
`HEAD` and `HEAD^{tree}` before/after all gates. Inventory each ignored path
consumed as a gate input (dependency, generated input, environment, or fixture)
and record a deterministic version/content digest before/after. Ignored outputs
not consumed as inputs need no identity. A consumed ignored input without a
stable identity is `MISSING`.

Apply the union of these changed-path rules:

- source/test/executable: nearest owning package's declared focused test command, or `MISSING` if none/nothing is named;
- manifest/lockfile: fresh controller/provisioner frozen-install evidence and exact active-plan security commands; the verifier never installs;
- graph/validator: `pnpm exec vitest run tooling/rebuild-graph.test.ts` and `pnpm rebuild:graph:check`;
- changed skill: `git diff --name-only "$base...HEAD" -- '.agents/skills/*/SKILL.md' | sort | xargs -r -n1 dirname | xargs -r -n1 python3 /home/user1/.codex/skills/.system/skill-creator/scripts/quick_validate.py`;
- TOML: `git diff --name-only "$base...HEAD" -- '*.toml' | sort | xargs -r -n1 python3 -c 'import sys,tomllib; tomllib.load(open(sys.argv[1],"rb"))'`, plus only task-plan-named assertions;
- docs/config: `git diff --check "$base...HEAD"`, plus only exact active-plan or package-script commands.

A changed path with no matching rule, or missing prerequisite evidence, is
`MISSING`. Add every plan/project-named gate:
neither the verifier nor an ad hoc exception/exemption can waive one; it remains
required until the authoritative plan/policy is amended.

## Execute and classify

Resolve the repository-declared package manager/version or mark affected gates
`BLOCKED` with isolation evidence. For every gate, record exact command, exit
code, result, timestamp, tested worktree, `HEAD`, `HEAD^{tree}`, and input
digests.

| Status | Meaning |
|---|---|
| `PASS` | Exit 0 on the recorded tested tree. |
| `FAIL` | The exact command's project runner/process started and returned nonzero, even before assertions; this takes precedence. |
| `BLOCKED` | The project process could not launch at all and a bounded independent control isolates tooling/infrastructure. |
| `MISSING` | Required command was not run, or a claimed run lacks any required provenance field. |
| `STALE` | Provenance proves an older or different tree/worktree or input digest. |

Relevant changes invalidate affected evidence. Do not call an environmental
failure `PASS` or invent a waiver.

## Verdict

Emit `PASS` only when source inputs are clean, all pre/post identities match,
and every applicable required gate is fresh `PASS`. Emit `FAIL` for any required
`FAIL`, `MISSING`, or `STALE`; otherwise `BLOCKED` for required `BLOCKED`. Any
non-`PASS` blocks verification, completion, and PR readiness: list the blocker
and required evidence, without suggesting a waiver.
