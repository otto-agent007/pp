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

## Task Workflow
1. Read /docs and current task
2. Propose plan BEFORE coding
3. List files to modify
4. Implement step-by-step
5. Run lint + typecheck
6. Update task file

## Output Rules
- Keep changes minimal
- Do not create unnecessary files
- Prefer clarity over cleverness