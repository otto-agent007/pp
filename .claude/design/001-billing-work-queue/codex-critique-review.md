# Codex Critique Intake: Billing Work Queue V1

## Valid fixes for a future patch

- Use precise multi-missing capture pill copy, preferably through the existing `joinMissing` helper.
- Add paid-date copy to the paid invoice next-action text if the invoice/payment data shape exposes a reliable `paid_at`.
- Add a small `/payments?job_id=` arrival cue so users know they arrived from a closeout handoff.
- Clear selected job state when the queue filter changes to avoid a stale detail flash.

## Deferred follow-ups

- Improve closeouts loading and error states with skeleton rows and an explicit retry action.
- Move `NextActionCard` into a cleaner panel-top region only if sticky detail behavior becomes useful.
- Consider URL persistence for selected job, optional closeouts nav badges, section-collapse persistence, invoiced section paging, and a `decisions.md` note for the aggregate-readiness choice.

## Rejected or out of scope

- Stripe setup banner changes remain outside the billing work queue critique patch.
- Removing the "Other jobs" status-filter behavior is a product-scope decision, not an automatic critique fix.

## Verification needed

- Confirm precise missing-capture copy reads naturally for two and three missing captures.
- Confirm paid invoice date data is available through the existing `useInvoices` shape before changing paid copy.
- Verify queue filter changes no longer flash the previously selected job detail.
