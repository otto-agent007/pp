---
name: pest-patrol-verification-gate
description: Use when deciding whether a Pest Patrol slice may claim verification, completion, or PR readiness, especially after changes, failed checks, or unavailable tooling.
---

# Pest Patrol Verification Gate

Verify read-only: report evidence and a verdict; never fix failures, install,
or create authority.

## Identity and gate set

Read the approved slice base from the active plan/graph. It must unambiguously
resolve and `git merge-base --is-ancestor "$base" HEAD` must exit 0; otherwise
base identity is `MISSING`. Inventory exactly
`git diff --name-only "$base...HEAD"`.

For completion/PR readiness, `git status --porcelain --untracked-files=all`
must be clean for all tracked and non-ignored untracked source inputs. Inventory
each ignored gate input (dependency, generated input, environment, or fixture),
not ignored outputs; a consumed input without stable identity is `MISSING`.

Create one evidence-set ID containing worktree, approved base, pre/post UTC
timestamps, pre/post `HEAD` and `HEAD^{tree}`, clean status, and pre/post
consumed-ignored-input version/content digests. Relevant changes invalidate
affected evidence.

Consumed ignored directories require matching deterministic pre/post digests of
the full sorted tree: relative file/symlink paths and file contents/symlink
targets. Lockfiles, manifests, runtime versions, selected files, metadata-only
listings, or other subsets are not directory digests; no referencing gate can
`PASS`.

Apply the union of changed-path rules:

- source/test/executable: nearest owning package's declared focused test command, or `MISSING`;
- manifest/lockfile: fresh controller/provisioner frozen-install evidence and exact active-plan security commands; do not install;
- graph/validator: `$PNPM exec vitest run tooling/rebuild-graph.test.ts` and `$PNPM rebuild:graph:check`;
- changed skill: `CODEX_SKILL_VALIDATOR="${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py"; test -f "$CODEX_SKILL_VALIDATOR" && git diff --name-only "$base...HEAD" -- '.agents/skills/*/SKILL.md' | sort | xargs -r -n1 dirname | sort -u | xargs -r -n1 python3 "$CODEX_SKILL_VALIDATOR"`; the resolved official validator must exist before changed-skill validation;
- TOML: `git diff --name-only "$base...HEAD" -- '*.toml' | sort | xargs -r -n1 python3 -c 'import sys,tomllib; tomllib.load(open(sys.argv[1],"rb"))'`, plus task-plan-named assertions only;
- docs/config: `git diff --check "$base...HEAD"`, plus exact active-plan/package-script commands only.

An unmatched path or missing prerequisite is `MISSING`. Add every
plan/project-named gate; neither the verifier nor an ad hoc exception can waive
one before the authoritative plan/policy is amended.

## Record and classify

Resolve the declared package manager/version. If `pnpm` is absent from `PATH`
but an exact cached launcher exists, set `$PNPM` to its absolute path; every
intended/executed pnpm gate, including `MISSING`/`STALE`, uses that resolved
command, never bare `pnpm`. If unavailable, affected gates are `BLOCKED` with
isolation evidence. Each row requires: gate, fully resolved exact command, exit,
status, and evidence-set ID. A gate cannot `PASS` without its complete matching
evidence set.

Classify in this order:

1. Incomplete provenance: `MISSING`, regardless of claimed result. “Before/after
   commits” proves only age; without a complete historical evidence set it is
   `MISSING`, not `STALE`.
2. `STALE` only when complete historical provenance exists and identity
   comparison proves older/different.
3. Complete current provenance; process cannot launch; bounded independent control isolates tooling/infrastructure: `BLOCKED`.
4. Complete current provenance; project process started; nonzero exit: `FAIL` (precedence).
5. Complete current provenance and exit 0: `PASS`.

Emit `PASS` only when inputs are clean, all pre/post identities match, and every
required gate is fresh `PASS`; otherwise `FAIL` for any `FAIL`/`MISSING`/`STALE`,
else `BLOCKED`. Non-`PASS` refuses completion/PR readiness and lists needed
evidence, never a waiver.
