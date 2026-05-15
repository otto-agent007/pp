# AGENTS.md

## Project
Pest Patrol OS — pest control operations platform replacing PestPac.

## Stack
- Monorepo: Turborepo
- Web: Next.js (App Router, Tailwind, React Query)
- Mobile: Expo React Native
- Backend: Supabase (Postgres + RLS)
- Payments: Stripe
- Maps: Google Maps / Mapbox

## Operating Docs
- Use this file for durable project rules.
- Use `docs/CODEX_OPERATING_PLAN.md` for multi-slice, agentic, security-sensitive, provider, migration, or production-touching work.
- Use `docs/CODEX_CLAUDE_GITHUB_WORKFLOW.md` for Codex-Claude-GitHub handoffs, draft PR stewardship, CI follow-up, and design relay work.
- Keep task prompts grounded in goal, context, constraints, and done-when criteria.

## Architecture Rules
- ALL database access goes through /packages/api-client
- NEVER query Supabase directly inside UI components
- Shared types MUST live in /packages/types
- Business logic belongs in /packages, not apps
- Mobile MUST be offline-first
- All writes must support retry + sync

## Data Rules
- Use React Query for all server state
- Use optimistic updates for mutations
- Never break schema compatibility
- Forms use JSONB (flexible schema)

## Mobile Rules
- All actions must work offline
- Queue mutations in offline sync system
- No blocking UI on network

## UI/UX Rules
- Fast, minimal, field-friendly
- Large tap targets (mobile)
- No multi-step friction unless necessary

## Forbidden
- Do NOT duplicate logic across apps
- Do NOT bypass api-client
- Do NOT hardcode API calls in components
- Do NOT modify migrations without explicit task

## Commands
- dev: pnpm dev
- build: pnpm build
- lint: pnpm lint
- typecheck: pnpm tsc --noEmit

## Capability Trigger Matrix
- OpenAI docs MCP: use for current Codex, OpenAI API, model, and prompting guidance when available. If unavailable, use only official OpenAI domains and cite sources.
- Supabase: use for schema, RLS, database, migration, and Edge Function inspection. Read-only by default; mutate only when explicitly approved.
- Vercel: use for deployment, preview, environment, CI, hosting, Next.js platform, and production-readiness questions. Keep provider and env mutations approval-gated.
- GitHub: use for branch, PR, issue, CI, review-comment, and release-flow stewardship. Draft PRs are the default shipping container for verified slices.
- Codex Security: use before auth, RLS, portal-token, payment, webhook, cron, provider-secret, scheduler, or production-risk changes.
- Expo: use for mobile, native, offline-first, sync, app store, or EAS work.
- Stripe: use for payment, checkout, billing, reconciliation, Connect, and webhook work.
- Browser or Chrome: use for local UI verification, screenshots, DOM checks, authenticated browser-only flows, and dashboard-only workflows.
- Pest Patrol skills: use architecture guard, slice runner, collaboration steward, design relay, next-slice planner, relay watcher, and verification gate when their triggers match the task.

## Task Workflow
1. Read `docs/AGENTS.md`, relevant `docs/`, `tasks/in-progress.md`, and `git status --short --branch`.
2. Identify dirty worktree risk before editing; never overwrite, clean, stash, revert, or stage unrelated user or prior-agent work.
3. For ambiguous, multi-slice, agentic, security-sensitive, migration, provider, or production-touching work, use Plan Mode and follow `docs/CODEX_OPERATING_PLAN.md`.
4. Before implementation, state the goal, files or packages likely to change, data flow, tests, and boundary risks.
5. Implement step-by-step inside the approved scope.
6. Verify according to scope: code changes require focused checks when useful plus `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and `git diff --check`; docs-only changes require at least `git diff --check`.
7. Update task docs only when the current slice status actually changes.

## Output Rules
- Keep changes minimal
- Do not create unnecessary files
- Prefer clarity over cleverness
