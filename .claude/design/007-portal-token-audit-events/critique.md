# Critique: Portal Token Audit Events V1 (post-review)

Reviewed: this is a planning-only slice. No commits implement audit events — confirmed by `git log --all --oneline | grep -iE "audit|007|token-event"` (no matches) and by `grep -rln "CustomerPortalAccessTokenEvent\|access-token-events\|expandedTokenId" apps packages` (no matches). The deliverable under review is `proposal.md` against `codex-review.md`. Existing surface that the proposal targets lives in `apps/web/app/customers/customer-portal-links.tsx` (547 lines), `apps/web/hooks/useCustomerPortalAccess.ts` (75 lines), `packages/api-client/portal.ts`, and `packages/domain/closeouts.ts`. Critique here covers proposal coverage vs. brief, alignment vs. Codex's adopt/adapt/defer/reject, and what the follow-on slice should produce.

## What's correct against the brief

- Brief asked for a "compact information hierarchy for persistent token events without crowding the existing token rows" — proposal answers with a per-row inline drawer, single-row-open policy, and chevron disclosure (`▾ History` / `▴ Hide history`). Codex adopts this in full.
- Brief asked for event labels and copy covering ten lifecycle moments — proposal provides labels, body fragments, ARIA strings, and per-kind dot colors in the copy bank.
- Brief asked for explicit distinction between persisted server events and session-only feedback like "Copied!" — proposal calls this out in its own section, names the specific React state (`copyFlash`, `message`, `latestLink`, the revoke amber card), and enforces the split visually and structurally (no `occurred_at` on session signals).
- Brief asked for empty / loading / error / partial-history states — proposal's state map covers all four plus stale-while-refetching, token-revoked-while-history-open, and server-truncated history.
- Brief asked for actor/channel metadata without service-role leakage — proposal whitelists the metadata fields, names what is forbidden (token hash, raw URL, IP, UA, webhook payload, provider secrets, internal notes, raw user IDs), and routes display name resolution to the server. AGENTS conformance self-check is comprehensive.
- Brief asked for behavior before provider-backed send exists — proposal correctly defines `send_*` and `provider_blocked` as future-fed contract kinds, not features rendered in this slice.
- Brief asked for explicit out-of-scope follow-ups — proposal lists seven follow-up ideas plus ten numbered open questions, each tied to a real decision.

## Proposal vs. Codex review — alignment table

| Proposal element | Codex stance | Assessment |
|---|---|---|
| Row-scoped audit drawer inside `CustomerPortalLinks` | Adopt | Correct — fits existing three-zone architecture from slices 002 and 006. |
| One-row-at-a-time disclosure | Adopt (with V1 caveat) | Correct constraint for V1; revisit when ops use lands. |
| Strict UI metadata whitelist (no raw token, hash, URL, IP, UA, webhook, internal note, raw actor id) | Adopt | Non-negotiable; proposal honors it. |
| Persisted vs. session-only separation (`copyFlash` etc. never persisted) | Adopt | Correct, and well-grounded in the existing component state. |
| Empty / partial-history / truncated states + `truncated_before` signal | Adopt | Strong addition — preserves admin trust on retention boundaries. |
| `generated`, `opened`, `revoked` event kinds | Adapt — V1-only kinds | Codex narrows V1 to server-observable lifecycle. Proposal's broader taxonomy survives as design input. |
| `copied` event with client → server write route | Adapt → effectively reject for V1 | Codex defers until the route is explicitly approved. Proposal's open question #2 anticipated this — Codex's answer is "not yet." |
| `manually_shared` + future "Mark as shared" button | Adapt → defer until separately approved | Matches proposal's open question #3, where the proposal already flagged it as out-of-scope-trigger but in-scope-kind. Codex tightens further. |
| `expired` as discrete persisted event | Adapt → derived-only for V1 | Codex picks proposal option 5(a) implicitly, and goes further: no event row at all, just derived state. Acceptable but means the timeline won't surface "this expired on date X" as a discrete entry. See issue 4 below. |
| `send_*` + `provider_blocked` | Defer until provider boundary exists | Correct — these depend on slice 006's deferred provider work. |
| TypeScript contracts (`CustomerPortalAccessTokenEvent`, `*Kind`, `*ListResponse`) in `packages/types` | Adapt → not in this slice | Codex treats the proposal as design input, not permission to add types now. Reasonable; see issue 1 below. |
| Per-token `GET /api/portal/access-tokens/{tokenId}/events` route | Adapt → check payload size before per-row fanout | Codex raises a real concern about request-fanout when many tokens are visible. Proposal's `enabled: false` default partially mitigates but doesn't fully address bulk-open scenarios. See issue 5 below. |
| Customer-scoped event query alternative | Surfaced by Codex, not by proposal | Real gap in the proposal — see issue 5. |

Net: Codex's review is consistent with the brief and tightens scope correctly. The proposal's only structural overreach is presenting the contracts as design-ready when the brief explicitly says schema/RLS/types/routes are future-slice work.

## Proposal issues to address before any implementation slice

1. **Proposal stages contracts as if approved, even though brief defers them.** The brief states explicitly: "Shared contracts must live in `packages/types`" *as a constraint when implementation happens*, and "Treat schema/RLS changes as a future explicit implementation decision requiring approval and security review." The proposal's "Data shape at the UI boundary" section publishes a TypeScript interface (`CustomerPortalAccessTokenEvent`), a route path, an api-client helper signature, a domain helper signature, and a hook signature — all of which Codex's "Adapt" column re-classifies as design input only. Recommend the proposal label that whole section as **"Proposed contract sketch — not authorized to land"** so future readers don't mistake it for an approved interface. Without that framing, a downstream Codex pass could accidentally treat the shape as already-blessed.

2. **`copied` is over-specified for a slice that can't write it.** The proposal devotes a full row of the event taxonomy table to `copied`, walks through a future `/api/portal/access-tokens/{id}/events/copied` route, and lists `Link copied` in the copy bank. Codex rejects writing the event from the current clipboard-only flow. Net effect: if Codex's V1 implementation lands `generated` + `opened` + `revoked` only, the `Link copied` label, dot color, and the body-copy fragment `by [Actor Name]` for `copied` become dead inventory. Recommend marking `copied` (and `manually_shared`) in the copy bank as **deferred-kind copy** so the V1 implementation slice doesn't ship strings that have no event source.

3. **No commentary on what a V1-only timeline looks like.** Given Codex's narrowing, the realistic first timeline has exactly three event kinds: `generated`, `opened`, `revoked`. The proposal's wireframe shows four events (`generated`, `copied`, `manually_shared`, `opened`) for an active token — none of which match the V1 ship. Recommend adding a "V1 reduced timeline" section with a wireframe like:
   ```
   ● May 1, 9:14 AM   Opened by customer
                      via portal link
   ● Apr 28, 4:01 PM  Link generated
                      by Otto Mendez · expires May 31
   ```
   so the implementation slice has an unambiguous V1 target.

4. **`expired` handling is ambiguous after Codex narrows it to derived state.** The proposal lists `expired` as one of ten event kinds with a dot color (gray), a label (`Expired`), and a body fragment (`system`). Codex's adapt position is "derived token state for V1 unless a later scheduler/sweep design is approved." That leaves two questions the proposal doesn't answer:
   - Does the V1 timeline render a *synthetic* `expired` row at the appropriate timestamp from `expires_at`, or is `expired` simply absent from the timeline (with the row's collapsed-state line 2 carrying the only "expired" signal)?
   - If absent, do admins reading the timeline lose the sense of *when* an active token transitioned to expired, or is the proposal's stance "look at line 2 of the collapsed row instead"?
   Proposed fix: pick one (recommend "absent from the timeline; row line 2 carries the only signal until a sweep job is approved"), document it in the state map, and update the dot-color table to mark `expired` as "not rendered in V1."

5. **No answer to Codex's payload-size concern about per-token fanout.** Codex flags: "Prefer a customer-scoped event query or token-list enrichment only after performance and payload size are checked; avoid per-token request fanout if many rows are visible." The proposal's `useCustomerPortalAccessTokenEvents(tokenId)` with `enabled: false` means each opened row triggers its own request — fine for one-row-at-a-time, but the constraint is enforced only by the single-row-open policy, not by the data layer. If a future multi-row expansion happens, fanout explodes. Recommend the proposal add a brief "Why per-token instead of customer-scoped" note that:
   - Acknowledges the customer-scoped alternative (`GET /api/portal/customers/{customerId}/access-token-events`).
   - Notes that single-row policy bounds fanout at N=1 for V1.
   - Names the trigger for revisiting (e.g., "if multi-row expansion is approved, switch to customer-scoped").

6. **Open question #4 (opened-event derivation) hides a real implementation decision.** The proposal recommends option (b) — discrete `opened` event rows per access — but Codex's adopt-list endorses `opened` as a "server-observable lifecycle event" without explicitly resolving whether the existing `last_used_at` write also emits an event row. If V1 derives a single synthetic `opened` event from `last_used_at`, the proposal's timeline rendering (`Opened by customer / via portal link`) still works, but a customer who opened the portal six times only shows once. Recommend the proposal call this out as "the answer to open question #4 will determine timeline density — both modes are renderable with the same UI."

7. **Copy bank uses an em dash in one footer fragment but plain hyphens elsewhere.** The partial-history footer `History before [date] isn't recorded.` and the empty state `No recorded history yet.` are fine. But slice 002's critique flagged em-dash drift in implementation. Recommend the proposal pre-empt the same drift by either (a) using plain hyphens / commas throughout the audit copy or (b) adding an explicit "preserve em dashes" callout. Currently the copy bank has no em dashes — that's fine, but worth confirming intent before V1 lands.

8. **ARIA region label couples to `created` date with no fallback.** The proposed ARIA label `Event history for portal link created [date]` assumes a formatted date is always available. If `created_at` is somehow null or the locale renders empty, the label becomes `Event history for portal link created `. Trivial fix: the proposal should specify the fallback (`Event history for portal link` is safe).

## Proposal strengths worth preserving on the next pass

- Single-row-open policy with explicit `expandedTokenId` state lives in component, not URL — correct trade-off for an audit drawer.
- The session-vs-persisted table is the kind of artifact that prevents future drift; keep it verbatim in the V1 implementation slice.
- The metadata whitelist + `actor_display_name` server-side resolution is the right answer to the brief's "no service-role exposure" constraint. Codex's "Adopt" should be read as endorsing this exact contract, even though the contract itself remains unblessed for now.
- The dot color scheme (green/red/grey/amber, three buckets) is dense but readable; preserve when implementation lands.
- The `truncated_before` field is a genuinely good design instinct — preserves admin trust on retention boundaries without exposing what was dropped.

## Scope drift

- **Proposal section "Data shape at the UI boundary" reaches further than the brief asked.** The brief is explicit that this is a *planning* slice — UI hierarchy, copy bank, state map, AGENTS check, follow-ups. Concrete TypeScript signatures, route paths, and api-client/domain/hook scaffolds are scope-adjacent and easy to mistake for a green light. Codex's "Adapt — move into shared code only when implementation begins" correctly catches this. Recommend retitling the section to make its non-binding status explicit (see issue 1).
- **Proposal mentions slice 006 line-3 retry behavior as if reading slice 006's outputs.** "Slice 006 already specifies a line-3 failure callout — this slice confirms that callout maps to the latest `send_failed` event…" This forward-coupling is fine for design continuity but means slice 007 will need a small adjustment if slice 006 ships differently. Acceptable; flag it.

## Out of scope (parked, OK)

- Schema, RLS, indexes, retention rules, event-write routes, migrations, security review — all explicitly Codex-owned and correctly deferred per the brief.
- CSV/PDF export, aggregate per-customer audit view, filterable timeline, per-event admin notes, deep-link event IDs, webhook-driven `opened` events — proposal's follow-up list. Codex agrees in the "Defer" column.
- Customer-visible audit history (proposal open question #7) — out of scope for the admin slice, flagged for a future product decision.
- Mobile rendering of the timeline — explicitly out per the brief.
- Provider-backed `send_*` and `provider_blocked` — deferred until slice 006's provider boundary exists.

## Verification needed before the V1 implementation slice begins

- Confirm Codex's intended V1 event set with an explicit decision record (`generated` + `opened` + `revoked` only?), and update the proposal's wireframe + copy bank to match.
- Confirm whether `opened` is one-event-per-access or one-synthetic-event-from-`last_used_at` (proposal open question #4 — pick before schema work).
- Confirm `expired` rendering: absent from timeline (recommended) or synthetic from `expires_at`.
- Confirm payload-size verdict (per-token endpoint vs. customer-scoped enrichment).
- Confirm retention window (proposal open question #1) so `truncated_before` behavior has a concrete trigger.
- Confirm that any types added in the implementation slice land in `packages/types` per AGENTS, even if the names differ from the proposal's sketch.
- Once implementation lands, re-run this critique against actual code and re-format under the standard post-implementation template.

## Suggested ordering

This is a design slice, so the "fixes" are edits to `proposal.md` and decisions, not code:

1. **Highest leverage, lowest cost** — issues 1 and 2: relabel the contracts section as a sketch and tag `copied` / `manually_shared` copy as deferred-kind. Five-minute edits that prevent downstream confusion.
2. **Required before any implementation slice begins** — issues 3, 4, 5, 6: add a V1 reduced wireframe, resolve `expired` rendering, document the per-token-vs-customer-scoped choice, and resolve `opened` derivation. Each is a decision plus a paragraph.
3. **Polish** — issues 7 and 8: copy-bank consistency callout and ARIA fallback.
4. **Then, separately** — the schema/RLS planning slice Codex recommends in its "Next Codex Implementation-Plan Recommendation" section. That slice owns retention, expiry materialization, `opened` granularity, and security review. Slice 007's proposal becomes the UI input to that slice; this critique becomes the gap list.

No code changes are warranted from this critique. The work is to tighten the design artifact before it becomes the basis for any schema or implementation slice.
