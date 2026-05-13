# Implementation Plan

## Current Priority: Portal Send Provider V1

1. Implement the approved session-link portal send route using `PORTAL_DELIVERY_WEBHOOK_URL` and `PORTAL_DELIVERY_WEBHOOK_SECRET`.
2. Keep V1 send limited to freshly generated links while the raw portal URL is still available in the admin session.
3. Keep row-level resend, encrypted token storage, persistent send events, delivery receipts, schema/RLS changes, and production migration application out of scope.
4. Leave `tools/` untouched because it is unrelated local MCP/tooling scratch.

## Next Decision Points

1. Decide whether V2 resend should generate a fresh token or store encrypted token material.
2. Decide whether provider send attempts should become durable audit events after the session-only V1 proves useful.
3. If Claude drops a critique for slice 009, process it through the relay watcher markers before moving on.
