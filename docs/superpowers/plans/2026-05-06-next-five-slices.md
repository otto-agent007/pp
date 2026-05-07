# Next Five Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the next five small Pest Patrol OS slices in reviewable increments after Notification Delivery Retry Policy V1.

**Architecture:** Each slice keeps business rules in `packages/domain` when behavior needs reuse, keeps UI rendering inside `apps/web`, and avoids new migrations unless the slice explicitly needs schema work. The first track is demo readiness, followed by production smoke guidance, notification provider setup clarity, and Stripe test readiness.

**Tech Stack:** Next.js App Router, Tailwind CSS, React Query, Vitest, React Testing Library, Supabase-backed existing APIs.

---

## Slice Order

1. **Customer/Ops Demo Readiness V1**
   - Add a domain-backed demo workflow checklist and show it on the admin home page.
   - Tests: domain workflow contract and home page rendering.

2. **Demo Data Entry Helpers V1**
   - Add concise "next action" helper copy/links on customer and job admin flows.
   - Tests: customer/job UI helper rendering.

3. **Production Smoke Checklist V1**
   - Add a docs-backed smoke checklist surface for validating production without seeding data.
   - Tests: smoke checklist helper contract.

4. **Notification Webhook Provider Setup V1**
   - Make `/automation` provider setup state clearer when webhook env is missing.
   - Tests: automation UI provider setup messaging.

5. **Stripe Test Mode Readiness V1**
   - Improve payment test-mode readiness messaging without exposing secrets.
   - Tests: payments UI setup/readiness rendering.

## Per-Slice Execution Rules

- [ ] Start each slice from clean `main`.
- [ ] Create a branch named `codex-<slice-name>`.
- [ ] Write failing focused tests before production code.
- [ ] Implement the minimum code to pass.
- [ ] Run focused tests, then `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm build`.
- [ ] Update `tasks/done.md`, `tasks/in-progress.md`, `tasks/lessons.md`, `README.md`, and `docs/IMPLEMENTATION_PLAN.md` as needed.
- [ ] Commit, push, open PR, wait for Vercel, merge, sync `main`, and delete the merged branch.

## Slice 1 Files

- Create: `packages/domain/demoReadiness.ts`
- Modify: `packages/domain/index.ts`
- Test: `packages/domain/demoReadiness.test.ts`
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/app/page.test.tsx`
- Docs/tasks: `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `tasks/done.md`, `tasks/in-progress.md`, `tasks/lessons.md`

## Slice 1 Steps

- [ ] Write a failing domain test that expects five ordered demo steps: customer, job, dispatch, closeout, portal/payment follow-up.
- [ ] Run the domain test and verify it fails because `getDemoWorkflowSteps` is missing.
- [ ] Add `packages/domain/demoReadiness.ts` with a typed `getDemoWorkflowSteps` helper.
- [ ] Export the helper and types from `packages/domain/index.ts`.
- [ ] Run the domain test and verify it passes.
- [ ] Write a failing home page test that expects the demo workflow section, route cards, and no seeded-data promise.
- [ ] Run the home page test and verify it fails because the section is missing.
- [ ] Render the demo workflow on `apps/web/app/page.tsx`.
- [ ] Run the focused web test and verify it passes.
- [ ] Run full verification and update docs/tasks.
