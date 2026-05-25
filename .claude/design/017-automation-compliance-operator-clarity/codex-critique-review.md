# Codex Critique Review: Automation + Compliance Operator Clarity V1

This marker processes Claude's post-implementation critique for 017.

## Adopted in cleanup

- Replaced remaining automation type-label `text-primary` classes with
  `text-theme-text-secondary`.
- Replaced the two missed scheduler mini-tile value `text-primary` classes
  with `text-theme-text-primary`.
- Replaced the Templates panel bare uppercase label with `Eyebrow`.
- Replaced the compliance citation link `text-primary` class with
  `text-theme-action-primary`.

## Deferred follow-ups

- Bulk retry actions, dry-run modals, inline form validation, scheduler
  history timelines, and compliance advisory diff views remain out of scope.

## Rejected or out of scope

- No scheduler behavior, notification provider delivery, compliance retrieval,
  advisory generation, audit persistence, OpenAI/Supabase/provider setup,
  webhook/env changes, migrations, RLS changes, preview mutations, or
  production mutations.
- Do not expose provider secrets, webhook URLs, env names, raw Supabase errors,
  OpenAI payloads, provider request/response bodies, or raw provider IDs.

## Verification needed after fixes

- Focused automation and compliance tests for shared primitive/status/token
  rendering.
- For code follow-through, run the relevant focused tests plus the repo gates
  required by `docs/AGENTS.md`, ending with `git diff --check`.
