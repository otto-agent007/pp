# Critique: Portal Send/Resend Boundary V1 (post-implementation)

Reviewed: f8a65c0 (feat: add portal contact readiness). Implementation lives in `apps/web/app/customers/customer-portal-links.tsx` (545 lines in git, 3 hunks changed) and `apps/web/app/customers/customers-client.tsx` (call site at line 612). Tests in `apps/web/app/customers/customer-portal-links.test.tsx` (2 new tests) and `apps/web/app/customers/customers-client.test.tsx` (1 new assertion).

---

## What's correct against the proposal

**Prop signature.** `customerContact?: { email: string | null; phone: string | null }` added exactly as specified. Alphabetical ordering (`customerContact` before `customerId`) is correct.

**`hasContact` derivation.** `Boolean(customerContact.email || customerContact.phone)` at line 119. Defaults to `true` when prop is absent — correct fallback so components that don't pass contact data don't accidentally trigger the no-contact card.

**Priority ordering.** Active-link states (opened, never-opened, multiple active) all correctly dominate. "No contact saved" only surfaces when `active.length === 0` and no error state is present, which is the intent of the codex-review directive.

**No-contact card copy.** Label `"No contact saved"` and body `"This customer has no email or phone on file. Share the link manually."` are exact matches to the proposal's copy bank.

**Call site in `customers-client.tsx`.** `customerContact={{ email: customer.email, phone: customer.phone }}` at line 612 — exactly the approach specified. No new hook, no new API call.

**AGENTS conformance.** No direct Supabase access, no service-role exposure, no migration, no raw token field surfaced, no provider affordances rendered. Zero infra changes — all deferred cleanly.

**All prior behavior preserved.** Generate/copy/revoke/skeleton/error flows, Tailwind class patterns, `revokeConfirmPrompt()`, `tokenExpiryText()`, the revoke focus-return refs — none touched.

**Test coverage for the new path.** Two new tests in `customer-portal-links.test.tsx` cover: (1) no tokens + no contact → "No contact saved", plus that an active token with no contact shows "Shared — not yet opened" instead; (2) no tokens + contact present → "No portal links" (no false positive). The `customers-client.test.tsx` mock verifies `customerContact` is forwarded to the component with phone and email from the customer record.

---

## Visual / copy issues

**1. Loading card body text doesn't match the copy bank.**

Current (`customer-portal-links.tsx` line 244):
```tsx
body: "Checking customer portal access.",
```
Proposal copy bank:
```
"Loading portal status…"
```
The label is correct (`"Loading portal status..."`), but the body diverges. The proposal intended a single, consistent "Loading portal status…" as both label and body was handled together. Low visual impact since the loading state is brief, but it's an explicit copy-bank miss.

Fix: change `body` to `"Loading portal status…"` (or omit the body for the loading state, rendering label only — which is closer to the "Loading portal status…" treatment implied by the proposal's single-string entry).

**2. "Shared — not yet opened" body says "sent" instead of "shared" — implies delivery.**

Current (line 294):
```tsx
body: "A portal link was sent but hasn't been opened.",
```
Proposal copy bank:
```
"A portal link was shared but hasn't been opened."
```
This is the most material copy issue. The word "sent" implies active delivery (email/SMS), which is exactly what this slice is not doing and the brief explicitly says not to imply. An admin seeing "A portal link was sent" would reasonably believe the system sent a message to the customer. "shared" is neutral and was chosen deliberately.

Fix: change `"sent"` → `"shared"`.

**3. Section subtitle drifted.**

Current (line 320):
```tsx
Generate links to share the customer portal.
```
Proposal copy bank:
```
Generate links to share with this customer.
```
Minor, but the prior slice (002) established this subtitle and the copy bank explicitly lists `"Generate links to share with this customer."` This appears to be a revert of an earlier copy decision.

Fix: `"Generate links to share with this customer."`.

**4. Loading label uses ASCII ellipsis (`...`) vs Unicode ellipsis (`…`).**

Current (line 245): `"Loading portal status..."` (three dots)
Proposal: `"Loading portal status…"` (single `…` character)

Very minor typographic inconsistency — other labels in the file use `…` style implicitly through none at all. Low priority.

---

## Interaction / state issues

**5. No-contact state at `tokens.length === 0` takes precedence over "No portal links".**

Current logic (lines 258–272):
```tsx
if (tokens.length === 0) {
  if (!hasContact) {
    return { label: "No contact saved", ... };
  }
  return { label: "No portal links", ... };
}
```
The proposal's "contact readiness ordering" note says: *"check contact state last (lowest priority)"* and lists the no-contact state as appearing when "no other active-link state is dominant (i.e., no tokens, **or** no active links)". The implementation shows "No contact saved" *instead of* "No portal links" when there are zero tokens. An admin generating their first link for a contact-free customer will see "No contact saved" rather than "No portal links" — which may confuse them about whether they need to add contact info before generating.

The proposal's state map lists "Empty (no tokens)" → *"Audit list hidden"* and "No contact saved" as separate rows, suggesting they can coexist or that "No portal links" remains the dominant signal. The codex-review is ambiguous here ("when there is no stronger active-link state") — "no tokens" could be read as a weak state that contact-absence overrides.

Recommended fix (lower priority, discussion first): Swap the check order in the zero-token branch — show "No portal links" when `tokens.length === 0` regardless of contact, and surface "No contact saved" only in the `active.length === 0 && tokens.length > 0` branch. This matches "check contact last" literally. If the current behavior is intentional (admins with no contact should fix that before generating), document it explicitly in the proposal's state map.

---

## Scope drift

None. The implementation is a precise, minimal execution of the codex-review's "Next Codex Implementation Recommendation" — contact prop, readiness state, tests, no provider work. No new routes, helpers, or domain abstractions were added. The `hasContact` derivation is a one-liner in the component, correctly classified as a display concern.

---

## Out of scope (parked, OK)

All deferred items from the proposal are correctly absent:
- No `[Send link]`, `[Send]`, `[Resend]`, `[Retry]` buttons anywhere in the rendered output.
- No `providerReady` prop, feature flag, or send-readiness endpoint.
- No send status labels (`Not sent`, `Sent [date]`, `Send failed`) in token rows.
- No persistent send-event log, audit table, or delivery-status polling.
- No contact edit shortcut, no-expiration send warning, or resend throttle.

---

## Verification needed after fixes

1. **Critical — restore truncated working-tree files.** Both `apps/web/app/customers/customer-portal-links.tsx` and `apps/web/app/customers/customers-client.tsx` are currently truncated in the working tree relative to the committed `f8a65c0` objects (437 lines vs 545 committed; `customers-client.tsx` ends mid-tag at `"<div className="rounded-md border border`). Run `git restore apps/web/app/customers/customer-portal-links.tsx apps/web/app/customers/customers-client.tsx` before any further edits. The committed code is correct — the working tree is broken.

2. **Copy fixes.** After fixing items 1–3 above, search for `"sent but hasn't"` and `"share the customer portal."` to confirm no residual copies elsewhere in the file.

3. **Manual test — no-contact card.** Open a customer with no email or phone. Confirm "No contact saved" appears. Generate a link — confirm the token row appears and "No contact saved" is replaced by "Shared — not yet opened".

4. **Manual test — contact present.** Open a customer with email or phone. Confirm "No portal links" (not "No contact saved") appears when no tokens exist.

5. **Test coverage gap — no-active-links + no-contact branch.** The branch at lines 300–306 of the committed file (active.length === 0, tokens.length > 0, !hasContact → "No contact saved") has no test. Add a test: expired/revoked tokens present + no contact → "No contact saved"; expired/revoked tokens present + contact present → "No active links".

6. **Run existing test suite** after restoring working tree files: `pnpm test --filter web` to confirm no regressions.

---

## Suggested ordering

1. **Restore working tree** (`git restore` the two truncated files) — unblocks all further work and tests.
2. Fix copy item 2 ("`sent`" → "`shared`") — highest semantic impact, prevents send confusion.
3. Fix copy item 3 (subtitle) — restores prior slice copy decision.
4. Add missing test for no-active-links + no-contact branch.
5. Fix copy item 1 (loading body) — low visibility but copy-bank compliance.
6. Discuss / decide item 5 (priority ordering at zero tokens) — may be intentional; confirm with a decision note in the proposal.
7. Fix copy item 4 (ellipsis character) — optional polish.
