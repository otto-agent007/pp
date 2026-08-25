---
name: pest-patrol-architecture-guard
description: Use when reviewing Pest Patrol designs, plans, or diffs for architecture, offline-write, contract, schema-compatibility, or secret-boundary risk.
---

# Pest Patrol Architecture Guard

Review only; do not edit code. Lead with verified risks, not a narrative of the review.

## Review method

1. Declare the evidence boundary: static repository, local runtime/test, or authorized live target. Never promote static inference to a live claim.
2. Trace each affected workflow end to end:
   `UI -> domain/application -> api-client/adapters -> persistence/provider`.
   For mobile writes, also trace:
   `UI -> durable offline queue -> optimistic projection -> sync/retry -> api-client -> provider`.
3. Check every boundary below before issuing a verdict. Cite concrete `path:line` evidence for each finding; if evidence is absent or uncertain, say so.

## Required invariants

- UI must not query Supabase or another persistence provider directly. Business behavior belongs in domain/application packages; provider access stays behind `packages/api-client` or an adapter.
- Mobile writes durably enqueue **before** the optimistic projection. A network-first attempt with queue-after-failure is not offline-first: crashes and ambiguous responses can lose or duplicate intent. Verify persistence, restart recovery, retry, conflict, and terminal-failure behavior.
- Shared and UI contracts remain intentional types independent of generated database/provider row shapes. Translate provider rows at the adapter boundary.
- Schema and API evolution is additive and staged. Preserve old readers/writers and queued mobile payloads until backward compatibility and queued-client drain criteria are demonstrated; destructive renames/removals require a later approved slice.
- Public client configuration may contain intentionally public endpoints and client-safe keys. Server-only secrets, service-role credentials, signing keys, and privileged tokens must never enter web/mobile public variables, bundles, logs, fixtures, or reports.
- Migration, provider, environment, preview, or production inspection and mutation are separate controller-authorized scopes. Without explicit authority, use only supplied/static repository evidence and recommend the required live check.

## Output contract

Return findings first, ordered `Critical`, then `Important`. For each finding include:

- severity and affected boundary;
- evidence label (`static`, `local`, or `live`) plus `path:line` or authorized target evidence;
- concrete failure/security consequence;
- safe architectural direction;
- proportionate focused and integration tests.

Then state the overall decision and unresolved evidence gaps. If no Critical or Important finding exists, say so explicitly and list residual risks. Do not modify files, migrations, providers, environments, previews, or production.
