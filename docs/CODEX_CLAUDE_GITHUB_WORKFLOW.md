# Codex-Claude-GitHub Workflow

This is the durable collaboration loop for Pest Patrol OS. Codex owns engineering execution, architecture boundaries, verification, git/GitHub stewardship, and repo hygiene. Claude helps with design through committed `.claude/design/*` relay artifacts.

## Default Loop

1. Recon the repo state:
   - Read `docs/AGENTS.md`, `docs/CODEX_OPERATING_PLAN.md`, `tasks/in-progress.md`, `docs/IMPLEMENTATION_PLAN.md`, and README current focus.
   - Run `git status --short --branch` and inspect dirty worktree risk before editing.
   - Treat existing uncommitted work as protected unless the current task explicitly owns it.
2. Use Claude relay for UI-heavy slices:
   - Codex writes `.claude/design/NNN-slug/brief.md`.
   - Claude writes `proposal.md`.
   - Codex reviews the proposal against AGENTS rules before implementation.
   - Claude may write `critique.md` after implementation; Codex verifies claims before changing code.
3. Implement inside Pest Patrol boundaries:
   - UI/hooks use shared domain helpers and `packages/api-client`.
   - Shared contracts live in `packages/types`.
   - Business logic belongs in packages, not app components.
   - Mobile writes stay offline-first, queued, retried, and synced.
4. Verify before completion:
   - Code changes require focused tests when useful plus `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`.
   - Docs-only or skill-only changes require the relevant validator and `git diff --check`.
   - Completion claims must cite checks that ran in the current session.
5. Steward GitHub:
   - Codex may branch, verify, commit, push, open a draft PR, and triage CI for normal slices.
   - Draft PRs are the default shipping container.
   - Codex must inspect diff scope and task docs before staging.

## Claude Contract

Use file relay as the default path. It is more reproducible than browser handoff and keeps the project history greppable.

Codex writes `brief.md` with:
- slice title and user goal
- target screens or surfaces
- current state Claude should assume
- states Claude should cover
- AGENTS constraints
- non-goals and follow-ups
- expected Claude output

Claude writes `proposal.md` with:
- information hierarchy
- layout and density guidance
- copy and state labels
- interaction flow
- empty, loading, error, blocked, selected, queued, synced, and success states when relevant
- self-check notes for AGENTS conformance

Claude may write `critique.md` after implementation. Codex separates valid fixes from deferred follow-ups and rejects advice that would bypass architecture, mobile offline safety, provider boundaries, tests, or approved scope.

## GitHub Stewardship Contract

Codex can run full autopilot for routine verified slices:
- create or use a `codex/*` feature branch
- stage only owned files
- commit verified changes
- push the branch
- open a draft PR
- inspect and summarize CI
- address CI failures or review comments when asked

These actions still require explicit user instruction:
- pushing directly to `main`
- marking PRs ready for review
- merging PRs
- releases or deployments
- migrations or RLS changes not approved in the task
- provider dashboard, secret, environment, or production data mutations

When the worktree is mixed, Codex stages explicit paths only. Broad staging is allowed only when the user has confirmed the whole worktree belongs to the current task.

## Tool Defaults

- File relay: default Codex-Claude collaboration path.
- Local git: branch, diff, stage, commit, and push.
- GitHub CLI or connector: PR creation, PR metadata, CI triage, issues, comments, and review follow-up.
- Browser/computer use: local visual QA, screenshots, and unavoidable UI-only Claude/dashboard workflows.
- Supabase, Stripe, and Vercel dashboards: read-only or operator-assisted unless the user explicitly approves mutation.

## Current Planning Notes

Do not include deferred Supabase Pro hardening as an active dev-plan candidate. Keep active planning focused on product slices such as bilingual field copy, payment reconciliation, portal readiness, customer ledger, and Claude-assisted UI polish.
