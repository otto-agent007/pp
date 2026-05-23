# Codex Review: Automation + Compliance Operator Clarity V1

## Adopt

- Use the proposal as presentation-only polish for
  `apps/web/app/automation/automation-client.tsx` and
  `apps/web/app/compliance/compliance-client.tsx`.
- Replace legacy text, border, and focus classes with semantic tokens while
  preserving scheduler, provider fallback, notification queue, compliance RAG,
  advisory, audit, and form behavior.
- Use `Eyebrow` for page and section labels where it improves hierarchy
  without adding extra instructional text.
- Replace inline due-preview duplicate/new badges with `StatusPill` using
  local tone mapping.
- Clarify the automation delivery section with separate labels for delivery
  health counts and delivery breakdown pills.
- Replace rule status badges with `StatusPill` using a local pure
  `ruleStatusTone` helper based on the actual rule status union.
- Migrate template preview stripe, form labels, and focus states to semantic
  design tokens.
- For compliance, migrate advisory output and audit-card headings to
  `text-theme-text-primary`, and keep setup-required, runtime, audit, and
  advisory empty states unchanged.

## Adapt

- `@pest-patrol/ui` does not expose `Button variant="outline"`. Use an actual
  variant such as `ghost`, `subtle`, or `text` based on the existing control
  hierarchy, and keep `type="button"` or `type="submit"` explicit.
- `Button` does not provide a loading state by itself. Preserve existing
  pending copy and disabled logic when replacing hand-rolled buttons.
- `StatTile` renders as a `Card`. Use it only where it replaces an entire
  standalone metric tile or where the surrounding layout is not already a card.
  For compact in-card scheduler or portal-style mini metrics, prefer a small
  tokenized local metric row instead of creating card-inside-card chrome.
- Confirm scheduler metric values before wiring them into `StatTile`; some are
  strings such as last-run status, while others are numeric counts.
- Keep `ruleStatusTone` and compliance readiness tone helpers local to the
  component. Do not move presentation tone unions into `packages/types`.
- The live compliance helpers may already return semantic status classes; if
  `statusTone` and `evaluationTone` no longer contain raw Tailwind primitives,
  avoid churn and only replace remaining non-semantic classes.
- If compliance readiness does not expose a clean numeric count for an area,
  preserve the current explanatory copy and use `StatusPill` for the readiness
  state rather than forcing a misleading count tile.

## Defer

- Bulk notification retry, dismiss, or selection flows.
- Automation rule dry-run modal work.
- Inline validation UX for automation forms.
- Scheduler run-history timelines.
- Compliance advisory diff views or persisted previous-run comparison.
- Source-readiness refactors where the current `StatusPill` pattern is already
  correct.
- Any OpenAI, Supabase, scheduler API, provider setup, webhook, env, seed/reset,
  migration, RLS, preview, production, or public API/schema changes.

## Reject

- Direct Supabase access from UI components.
- Any change that alters scheduler execution, notification provider delivery,
  compliance retrieval, advisory generation, audit persistence, or RAG setup
  behavior.
- Any UI surface that reveals provider secrets, webhook URLs, env names, raw
  Supabase relation errors, OpenAI payload details, provider request/response
  bodies, or raw provider identifiers.
- Adding new dependencies, provider SDKs, migrations, RLS changes, or
  production/preview mutations under the cover of UI polish.

## Implementation recommendation

Do this only after the current dirty demo-flow worktree scope is explicit:

1. Add focused automation tests for due-preview pills, rule status pills,
   button replacements, and scheduler metric rendering.
2. Add focused compliance tests for advisory readiness rendering, semantic
   status/evaluation classes, form focus tokens, and advisory/audit headings.
3. Implement token and primitive swaps without changing data fetches,
   mutations, scheduler calls, provider calls, compliance advisory calls, or
   audit writes.
4. Browser-check `/automation` and `/compliance` at desktop and narrow widths
   with fixture data.
5. Run focused tests plus the repo gates required by `docs/AGENTS.md`.

## Implementation risks Codex must test

- Invalid shared UI variants, especially the proposed non-existent
  `Button variant="outline"`.
- Form submit buttons must keep submit behavior; row action buttons must stay
  non-submit buttons.
- Status tone mappings must cover the actual rule, scheduler, advisory, and
  evaluation states without falling back to misleading success or danger tones.
- Metric replacements must not create nested-card clutter or horizontal
  overflow on dense operator pages.
- Sanitized setup/provider/runtime copy must remain sanitized and must not leak
  secrets, env names, raw relation errors, or provider payloads.
