# Codex Critique Review: Portal Send/Resend Boundary V1

## Valid fixes

- Verify and restore the working tree before further edits if `apps/web/app/customers/customer-portal-links.tsx` or `apps/web/app/customers/customers-client.tsx` are truncated relative to the committed slice.
- Change the active never-opened readiness body from "A portal link was sent but hasn't been opened." to "A portal link was shared but hasn't been opened." so the UI does not imply provider-backed delivery.
- Restore the portal access subtitle to "Generate links to share with this customer."
- Add focused coverage for the no-active-links plus no-contact branch: expired or revoked tokens with no contact should show "No contact saved"; the same token state with contact present should show "No active links."
- Align loading-state copy with the proposal copy bank where practical.

## Deferred follow-ups

- Decide separately whether zero tokens plus no contact should prefer "No portal links" or "No contact saved." The implemented behavior follows the accepted Codex review direction that contact readiness may surface when no stronger active-link state is dominant, so any change should be treated as a small product-copy decision rather than a bug fix.
- Provider-approved send/resend routes, provider readiness, delivery persistence, delivery polling, retry states, resend throttling, send status rows, and contact edit shortcuts remain future provider-boundary work.

## Rejected/out-of-scope items

- Do not add provider delivery, send/resend buttons, send status fields, migrations, RLS changes, provider configuration, secrets, or production mutations in this critique patch.
- Do not introduce direct Supabase access from UI components or bypass `packages/api-client`.
- Do not persist raw portal links or expose token hashes, service-role data, or internal provider details.

## Verification needed

- Confirm the two customer files are complete before editing.
- Search for residual copy that implies provider delivery, especially "sent but hasn't" and "share the customer portal."
- Run focused customer portal tests after the fixes.
- Run the web test target requested by the critique, `pnpm test --filter web`, or document why a narrower command was used.
