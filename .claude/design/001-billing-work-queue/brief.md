# Claude Design Brief: Billing Work Queue V1

## Summary

Create UI/design recommendations for a lightweight office billing work queue that helps dispatch/admin users move completed jobs from closeout review into invoice follow-up. Codex will own implementation, data flow, tests, offline/mobile safety, and architecture; Claude should focus on screen hierarchy, interaction flow, copy, density, and visual states.

## Target Screens

- `/closeouts`: completed job review with field captures and existing "Create invoice" handoff.
- `/payments`: invoice list and create-invoice form.
- Optional shared admin navigation/current-focus cues if Claude sees a low-risk improvement.

## User Goal

Office users need to quickly answer:

- Which completed jobs are ready to bill?
- Which jobs still need field capture review?
- Which jobs already have invoices?
- What is the next billing action?

## Design Ask For Claude

Recommend a compact, operations-focused UI flow for:

- A billing queue view or panel that groups jobs by billing readiness.
- Clear queue states such as ready to invoice, needs closeout review, invoice draft, sent/open, paid, and blocked/missing captures.
- A low-friction handoff from closeout review to invoice creation.
- Concise field-friendly/admin-friendly copy for labels, empty states, and action buttons.
- Dense but readable list rows/cards suitable for repeated daily office use.

## Constraints And Guardrails

- No schema changes, migrations, provider config, Stripe setup, maps, route optimization, or production mutations.
- Preserve current architecture: UI uses hooks/domain helpers; no direct Supabase calls in components.
- Use existing invoice, job, closeout, and payment models.
- Codex may implement with existing data plus query params/domain helpers.
- Keep the experience utilitarian and work-focused, not marketing-like.
- Customer-facing portal changes are out of scope unless Claude notes a follow-up idea separately.

## Expected Claude Output

- Recommended information hierarchy for `/closeouts` and `/payments`.
- Suggested queue sections/status labels and brief explanatory copy.
- Suggested primary/secondary actions per state.
- Notes on empty, loading, error, and already-invoiced states.
- Any visual layout guidance that can be implemented with existing Next/Tailwind patterns.

## Assumptions

Target slice is Billing Work Queue V1 because it is the most UI/design-heavy next candidate. Claude's output is advisory; Codex will adapt it to repo rules, existing components, tests, and no-migration constraints.
