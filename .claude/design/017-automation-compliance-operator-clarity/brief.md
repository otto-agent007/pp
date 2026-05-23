# Automation And Compliance Operator Clarity

## Target Screens

- `apps/web/app/automation`
- `apps/web/app/compliance`

## User Goal

Make dense operator pages easier to scan in the demo flow: status cards, scheduler/provider states, delivery triage, RAG setup state, source readiness, and advisory readiness should read as operational panels rather than loose copy blocks.

## States

- Automation summary, scheduler preview, delivery health, provider fallback, notification triage, and template/rule forms.
- Compliance setup-required, knowledge-base counts, workflow readiness, advisory runtime, latest advisory, citations, and audit states.

## Constraints

- Presentation-only UI polish.
- Reuse existing `@pest-patrol/ui` primitives.
- Keep scheduler, provider, compliance retrieval, audit, and RAG behavior unchanged.
- Keep provider secrets, webhook URLs, env names, raw Supabase relation errors, and provider payloads hidden.

## Non-Goals

- No scheduler/API behavior changes.
- No OpenAI/Supabase/provider setup.
- No migrations, RLS, seed/reset, env, preview, production, or public API/schema changes.
