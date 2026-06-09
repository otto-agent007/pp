# Customer Data Privacy and Retention V1

This document describes Pest Patrol OS privacy boundaries for launch readiness. It is operational guidance, not legal advice. Confirm final retention, deletion, export, and customer notice commitments with counsel before production policy publication.

## Data categories

- Customer contact information: names, emails, phones, account status, and communication preferences.
- Locations and addresses: service addresses, unit labels, property details, and route context.
- Job and service records: schedule, service notes, status, closeout readiness, and account ledger events.
- Photos and media: job photos, signatures, signed URLs, storage metadata, and descriptions.
- Signatures: customer or representative signature captures and signer labels.
- Chemical logs: products, amounts, job linkage, and supporting recordkeeping context.
- Invoices and payments: line items, balances, payment links, provider reconciliation, and manual status changes.
- GPS/location evidence: arrival/departure proof, radius checks, and sync evidence.
- WDO/Escrow documents: readiness records, clearance artifacts, and customer-safe handoff state.
- Portal tokens/sessions: token hashes, session hashes, expiry/revocation state, and access history.
- Notification events: generated reminders, attempts, provider message IDs, and delivery state.
- Technician credentials: license, branch, expiration, archive, and credential-readiness evidence.
- Compliance sources/advisories: source documents, chunks, citations, advisory audits, and staff-only review state.

## Who can see what

- Admins and dispatchers can review operational records needed for scheduling, billing, compliance review, customer support, and closeout handoff.
- Technicians see assigned work and field-capture flows needed to complete service, with offline queue behavior preserved.
- Customers see only customer-safe portal records for their own account/session.
- Service-role/server routes may access privileged data only behind server-only API boundaries.
- Stripe and notification providers receive only the provider payloads needed for payment or delivery workflows.
- Compliance/RAG providers receive compliance prompt/source context only when embeddings/advisory flows are explicitly enabled by operators.

## Customer portal visibility rules

Customer portal may show:

- Customer-safe service history.
- Customer-safe proof photos and signatures.
- Invoices and payment links.
- Service summaries, dates, locations, and customer-facing timeline entries.
- Approved/downloadable customer documents when explicitly supported.

Customer portal must not show:

- Internal compliance warnings or staff-only advisory findings.
- Exact technician GPS coordinates or map links.
- Admin notes, technician private notes, or internal service notes.
- Provider internals, webhook details, Stripe IDs, raw payment records, or provider secrets.
- Raw portal grants, access tokens, session hashes, or token hashes.
- Full chemical compliance internals unless a future approved slice makes them customer-safe.
- Unrelated customer, job, invoice, media, compliance, or technician records.

## Retention recommendations

Initial operational recommendations before legal review:

- Portal grants and sessions should expire or be revocable; revoked sessions should stop customer portal access immediately.
- Photos/media and signatures should be retained for operational proof, dispute support, WDO/Escrow handoff, and customer history until owner-approved retention rules are finalized.
- Invoices, payment records, refunds, and disputes should retain audit history and should not be casually hard-deleted.
- WDO/Escrow and chemical logs need retention review before deletion because they may be regulatory or transaction evidence.
- Compliance advisory audit history should remain staff-only and retained for launch review unless counsel/operator policy says otherwise.
- Notification event history should retain enough attempt state to prevent duplicate customer contact and support manual follow-up.
- Technician credentials should remain reviewable after archive/inactivation until retention policy is finalized.
- Demo data must remain separate from production and must never be seeded into production without explicit approval.

## Deletion and archive model

- Prefer archive/inactive/revoked status over hard delete for operational records.
- Customer deletion requires owner/admin review and should check jobs, invoices, media, signatures, WDO/Escrow, chemical logs, compliance evidence, and payment records.
- Payment records and provider reconciliation should preserve audit history.
- Compliance and WDO records require retention review before deletion.
- Portal sessions/tokens can be revoked when access must stop.

## Export and access requests

Manual process for now:

- Confirm requester identity and account scope through an operator-approved process.
- Gather customer contact, location, service/job, closeout proof, invoice, payment-link, and approved portal document records.
- Exclude internal compliance warnings, exact GPS coordinates, admin notes, technician private notes, provider internals, raw tokens/hashes, and unrelated records.
- Record what was exported, who approved it, and when it was delivered.

## Production launch gate

Production policy commitment is blocked until privacy/retention language is reviewed by the operator and counsel. This V1 doc is a readiness boundary, not a customer-facing legal policy.
