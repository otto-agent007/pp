# Coding Standards

- **UI Updates**: Use optimistic UI through React Query so the app feels
  immediate to users. For mobile writes, create the optimistic projection only
  after the durable offline queue accepts the intent; optimism never replaces
  durable enqueue.
- **Mobile write ownership**: The planned `sync` package persists stable intent
  identity and state, recovers and replays after restart, schedules retry and
  backoff, and durably records state transitions. Application ports and use
  cases define provider-independent conflict and terminal-failure policy.
  `api-client` adapters map provider requests, responses, and errors and use
  the stable identity for idempotent delivery, including replay after an
  ambiguous response. Mobile composition and presentation wire the
  implementations, show terminal failures, and provide user recovery UI;
  replay never creates a second logical write identity.
- **Styling**: Use Tailwind CSS and the central `primary`, `secondary`, and
  `accent` variables.
- **Provider adapter boundary**: Domain code expresses provider-independent
  rules. Application ports and use cases coordinate behavior. `api-client`
  adapters own Supabase and other provider SDK calls plus result mapping, and
  apps wire implementations at composition roots. Existing violations are
  tracked debt, not examples to copy.
