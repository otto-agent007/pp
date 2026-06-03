# AGENTS.md

Follow the project instructions in `docs/AGENTS.md`. Keep this root file as the launch checklist and put detailed operating policy in `docs/`.

Before coding or planning changes:
- Read `docs/AGENTS.md`, relevant `docs/` files, and `tasks/in-progress.md`.
- Run `git status --short --branch` and treat existing dirty worktree changes as protected.
- Every new Pest Patrol slice starts on a new correctly named `codex/*` branch from the intended base; do not continue slice work on an old, merged, or mismatched branch.
- For multi-slice, ambiguous, security-sensitive, migration, provider, or production-touching work, use Plan Mode and follow `docs/CODEX_OPERATING_PLAN.md`.
- For Codex, OpenAI API, model, or prompting questions, prefer the OpenAI developer docs MCP when available; otherwise use only official OpenAI domains and cite the source.

Default workflow:
- Keep changes minimal and inside Pest Patrol architecture boundaries.
- Use installed plugins, connectors, and project skills when they remove a real manual loop.
- Ground task prompts in goal, context, constraints, and done-when criteria.
- A Pest Patrol implementation slice is not done until the verified branch is pushed and a draft PR exists, unless the user explicitly says to stop before publishing.
