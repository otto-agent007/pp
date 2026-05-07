# Implementation Plan

## Current Priority: Notification Webhook Provider Setup V1

1. Show webhook/manual fallback setup guidance in `/automation`.
2. Keep webhook URL and secret values hidden.
3. Explain which env vars unlock webhook delivery.
4. Preserve current provider delivery behavior.
5. Add focused automation UI tests.
6. Update `tasks/in-progress.md` after each completed slice.

## Guardrails

- UI components must not call Supabase directly.
- Keep mobile write paths offline-safe.
- Shared types belong in `packages/types`.
- Business logic belongs in shared packages, not app components.
