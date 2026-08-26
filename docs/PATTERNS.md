# Coding Standards

- **UI Updates**: Use optimistic UI through React Query so the app feels
  immediate to users.
- **Styling**: Use Tailwind CSS and the central `primary`, `secondary`, and
  `accent` variables.
- **Provider adapter boundary**: Domain code expresses provider-independent
  rules. Application ports and use cases coordinate behavior. `api-client`
  adapters own Supabase and other provider SDK calls plus result mapping, and
  apps wire implementations at composition roots. Existing violations are
  tracked debt, not examples to copy.
