# Coding Standards
- **UI Updates**: Always use Optimistic UI via React Query so the app feels instant to users.
- **Styling**: TailwindCSS exclusively. Rely on the custom variables (`primary`, `secondary`, `accent`) defined in the central config.
- **Data Fetching**: All Supabase calls must be wrapped in Domain logic (`packages/domain/`) rather than called directly inside React components.