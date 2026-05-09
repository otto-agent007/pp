# In Progress

## Task: Bilingual Field Copy V1

Goal:
Add English/Spanish technician-facing field copy to the mobile capture workflow so field techs can switch language while preserving offline-first queue behavior.

Steps:
- [x] Expand shared `@pest-patrol/i18n` English/Spanish copy for field status, location, chemical, photo, signature, and treatment capture surfaces
- [x] Wire mobile field capture components and route status labels through the existing language store
- [x] Add a compact technician language toggle in the mobile header
- [x] Add focused mobile coverage for Spanish field status copy
- [x] Run final full repository verification

Follow-up candidates:
- [ ] Portal readiness polish
- [ ] Customer ledger
- [ ] Revisit Supabase leaked password protection if the project moves to Supabase Pro

Status:
Implementation and final full verification are complete locally.
