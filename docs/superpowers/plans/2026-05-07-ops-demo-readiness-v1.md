# Ops Demo Readiness V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the signed-in home dashboard into a concise live-data demo command center.

**Architecture:** Keep the workflow contract in `packages/domain/demoReadiness.ts` and render it from `apps/web/app/page.tsx`. The dashboard remains static/presentational and does not introduce Supabase reads, local persistence, or seeded data.

**Tech Stack:** Next.js App Router, React Testing Library, Vitest, Tailwind CSS, shared domain package.

---

### Task 1: Enrich Demo Workflow Contract

**Files:**
- Modify: `packages/domain/demoReadiness.test.ts`
- Modify: `packages/domain/demoReadiness.ts`

- [ ] **Step 1: Write the failing test**

Add `action`, `successSignal`, and `routeLabel` expectations for each workflow step in `packages/domain/demoReadiness.test.ts`.

- [ ] **Step 2: Run focused domain test and verify failure**

Run: `corepack pnpm --filter @pest-patrol/domain test -- demoReadiness.test.ts`

Expected: FAIL because the returned workflow objects do not include the new fields.

- [ ] **Step 3: Implement minimal domain contract**

Add the three fields to `DemoWorkflowStep` and populate them for the five existing workflow steps.

- [ ] **Step 4: Rerun focused domain test**

Run: `corepack pnpm --filter @pest-patrol/domain test -- demoReadiness.test.ts`

Expected: PASS.

### Task 2: Render Demo Command Center

**Files:**
- Modify: `apps/web/app/page.test.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Write the failing UI test**

Assert that `/` renders "Ops demo command center", the live-data reminder, step action text, success-signal text, and existing route links.

- [ ] **Step 2: Run focused page test and verify failure**

Run: `corepack pnpm --filter @pest-patrol/web test -- page.test.tsx`

Expected: FAIL because the command-center copy and new step details do not render yet.

- [ ] **Step 3: Implement minimal dashboard UI**

Update the existing demo workflow section to render action and success-signal details in compact cards. Preserve existing navigation cards and avoid nested cards.

- [ ] **Step 4: Rerun focused page test**

Run: `corepack pnpm --filter @pest-patrol/web test -- page.test.tsx`

Expected: PASS.

### Task 3: Update Tracking Docs And Verify

**Files:**
- Modify: `tasks/in-progress.md`
- Modify: `docs/IMPLEMENTATION_PLAN.md`
- Modify: `README.md`

- [ ] **Step 1: Update docs**

Mark Ops Demo Readiness V1 as the current/completed slice and keep leaked password protection as the remaining dashboard-only security action.

- [ ] **Step 2: Run final checks**

Run:

```powershell
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Expected: all commands exit 0.
