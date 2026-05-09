# Design desk

Shared workspace for Codex ↔ Claude design relay. Low ceremony on purpose. This file relay is the default handoff path; browser/computer use is reserved for visual QA, screenshots, or unavoidable UI-only handoffs.

## Layout

```
.claude/design/
  README.md                       this file
  NNN-slug/                       one folder per slice
    brief.md                      Codex writes — target screens, user goal, states, constraints, non-goals
    proposal.md                   Claude writes — UI hierarchy, copy, flow, state map, AGENTS-conformance pre-check
    critique.md                   Claude writes after Codex implements — review against the proposal (optional)
    decisions.md                  Either side appends — open questions resolved during the slice (optional)
```

## Conventions

- **Slice folders** are zero-padded (`001-`, `002-`, …) + kebab-case slug. Numbers come from Codex's slicing plan.
- **`brief.md` is the contract.** Claude's proposals stay scoped to what's in the brief. Anything outside scope goes under `## Out of scope` or `## Follow-ups` in the proposal.
- **Proposals self-check against [AGENTS.md](../../docs/AGENTS.md)** so Codex's review is fast: no direct Supabase from UI, mobile offline-safe, business logic in shared packages, testable state boundaries.
- **Claude advises; Codex decides.** Claude may shape visual hierarchy, density, copy, states, and interaction flow. Codex owns architecture, data access, implementation, tests, verification, GitHub hygiene, and final scope control.
- **No provider or production work.** Claude briefs and proposals must not ask for migrations, provider config, secrets, dashboard mutations, direct Supabase UI calls, or production data changes unless the approved slice explicitly includes them.
- **No frontmatter, no required headings.** Markdown is the API. If a slice doesn't need a critique, don't write one.
- **Authorship is implicit by filename.** No `author:` fields. If you need to argue, add a section.
- **Done slices stay** — don't archive. Future briefs reference past proposals by path.
- **`.claude/design/` is committed; the rest of `.claude/` is not.** Per-slice artifacts are durable history (greppable across slices, reviewable in PRs). Local agent settings, transcripts, and per-machine config stay out via `.gitignore` (`.claude/*` ignored, `!.claude/design/` re-included).

## Lanes

| | Codex | Claude |
|---|---|---|
| Briefs | ✅ writes | reads |
| Proposals | reads + reviews | ✅ writes |
| Implementation + tests | ✅ owns | proposes only |
| Critiques (post-merge) | reads | ✅ writes if asked |
| AGENTS rules | ✅ enforces | self-checks |
| GitHub + CI stewardship | ✅ owns | not involved |

## Review Pattern

Codex classifies Claude recommendations before implementation:

- **Adopt** when the idea fits scope and AGENTS rules.
- **Adapt** when the design intent is useful but needs Codex-owned data flow, tests, or a smaller implementation.
- **Defer** when the idea is valid but outside the slice.
- **Reject** when it violates architecture, offline safety, provider boundaries, production safety, or approved scope.
