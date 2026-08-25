# Elite Codex Operating Plan

This is the default operating model for Pest Patrol OS agent work. It optimizes for safe shipping, strong review, and useful parallelism without losing control of architecture boundaries.

For the Codex-Claude-GitHub collaboration loop, use `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` as the project-level source of truth. Codex owns implementation, verification, GitHub stewardship, and architecture boundaries; Claude contributes design guidance through `.claude/design/*` relay files.

For controlled-rebuild work, `docs/rebuild/graph.json` is the authoritative
multi-slice scheduler and `docs/rebuild/README.md` is its operating contract.
This plan does not duplicate that runbook's scheduling, lifecycle, evidence,
or reconciliation algorithms. Those rules do not grant security, migration,
provider, environment, preview, production, push, or PR authority.

## Default Mode

- Ship safely before optimizing for speed.
- Use approved multi-slice batches only when each slice is small, testable, and has non-overlapping ownership.
- Keep the main Codex session responsible for architecture, integration, final review, verification, task docs, commits, PRs, and production-facing work.
- Use Claude as a design partner through the file relay in `.claude/design/*` for UI-heavy slices; treat Claude output as advisory until Codex reviews it against AGENTS rules.
- Use `pest-patrol-rebuild-orchestrator` when selecting, reconciling, or preparing one controlled-rebuild node; use `pest-patrol-architecture-guard` for read-only architecture and boundary review; and use `pest-patrol-verification-gate` before verification, completion, or PR-readiness claims. Follow `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` for the existing Claude design relay.
- Use subagents mostly as narrow scouts, test investigators, and reviewers. Use worker subagents only for isolated implementation scopes with explicit file or package ownership.
- Treat active uncommitted work as protected. Do not overwrite, clean up, stash, revert, or merge it unless explicitly asked.
- Treat the active branch as protected, but every new Pest Patrol slice must
  start on a fresh correctly named `codex/*` branch from the intended base.
  Do not continue new slice work on an old, merged, unrelated, or mismatched
  branch. Do not delete, force-push, merge, or rebase branches unless the
  current task explicitly calls for that Git action or the user approves it.

## Batch Workflow

1. Recon:
   - Read `docs/AGENTS.md`, relevant `docs/` files, `tasks/in-progress.md`, and `git status --short --branch`.
   - Identify dirty worktree risks before editing.
   - For controlled rebuilds, follow `docs/rebuild/README.md`.
   - Spawn explorer agents for independent read-only subsystem mapping when it will reduce uncertainty.
2. Plan:
   - State the slice goal, likely files/packages, data flow, tests, risks, and rollback or follow-up notes.
   - Call out production, secrets, migration, auth, payment, and RLS risks before implementation.
3. Implement:
   - Prefer TDD for code changes.
   - Preserve project data flow: UI/hooks -> domain -> api-client -> Supabase.
   - Keep shared types in `packages/types`, business logic in packages, and mobile writes offline-first.
4. Review:
   - Main Codex reviews all subagent work before integration.
   - Check for direct Supabase UI calls, duplicated logic, secret exposure, broken schema compatibility, and non-queued mobile writes.
   - Use Codex Security before major auth, portal, payment, webhook, RLS, or scheduler changes.
5. Verify:
   - Run focused tests first.
   - For code batches, run `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm build` unless the change scope or environment makes a check impractical.
   - For docs-only changes, run at least `git diff --check`.
   - For controlled-rebuild work, run the canonical runbook's graph,
     reconciliation, and verification commands.
6. Ship:
   - Commit grouped changes, push the verified branch, open a draft PR,
     summarize verification, update task docs, and name the next recommended
     slice. Do not call an implementation slice done before the draft PR
     exists unless the user explicitly asked to stop before publishing.

## Subagent Rules

- Good explorer tasks:
  - Map one bounded subsystem such as `apps/web`, `apps/mobile`, `packages/api-client`, `packages/domain`, `supabase`, payments, automation, or auth.
  - Trace one workflow such as admin auth, portal token access, scheduler runs, Stripe payments, or mobile offline sync.
  - Audit one rule such as no direct Supabase in UI, provider secrets server-only, mobile queue-first writes, or shared types in `packages/types`.
- Safe worker tasks:
  - One route, hook, package module, test file cluster, or docs update.
  - Disjoint write ownership defined before dispatch.
  - Required return summary: changed files, rationale, tests run, and boundary risks.
- Coordinator-only work:
  - Cross-package wiring, shared exports, task docs, PR descriptions, merge strategy, final verification, and production smoke actions.
- Do not delegate:
  - Live credentials, production data actions, schema or RLS migration decisions, auth/token trust boundaries, Stripe webhook security, cron secrets, or ambiguous cross-system bugs.

## Tool Defaults

- Supabase connector: read-only project and migration inspection by default. Apply migrations, branch operations, and production mutations only with explicit approval.
- Browser Use: local app verification, screenshots, DOM checks, and UI smoke tests. External dashboard automation is conditional because external navigation may depend on a Codex app-server bridge.
- Claude relay: file-first through `.claude/design/*`; use browser/computer use only when file relay is unavailable or a visual/UI-only flow needs it.
- GitHub: local git plus GitHub CLI or connector for branch, PR, CI, issue, and review-comment stewardship. Draft PRs are the default shipping container for verified slices.
- Codex Security: security review for auth, portal, payment, webhook, RLS, scheduler, and provider-secret changes.
- Expo: mobile, offline, native, and deployment workflow planning and verification.
- Stripe: payment design, webhook, and test-mode readiness work.
- GitHub and Vercel: PR readiness, CI/deployment checks, environment variable name checks, and release flow.
- Controlled rebuild: `docs/rebuild/README.md` is the sole detailed operating
  contract. GitHub, provider, environment, preview, production, push, and PR
  decisions remain controller-approved.

## Production Boundaries

- Keep production smoke testing operator-assisted when credentials, reset links, portal tokens, Stripe secrets, Supabase dashboard access, or cron secrets are involved.
- Never paste or store credentials, recovery links, service-role keys, Stripe secrets, webhook secrets, or cron secrets in docs, task files, tests, logs, commits, or chat.
- Do not mutate migrations, production data, environment variables, or provider configuration unless the task explicitly asks for that mutation.
