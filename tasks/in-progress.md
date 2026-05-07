# In Progress

## Task: Live Admin Smoke Test V1

Goal:
Run the deferred production smoke checklist once admin credentials are ready.

Steps:
- [x] Reset or confirm the first admin password privately
- [x] Sign in to the production admin shell
- [x] Create a real customer with one active service location
- [ ] Invite a technician from `/technicians` after the `/technician-login` invite redirect is deployed
- [ ] Create a scheduled job against that customer/location and assigned technician
- [ ] Generate portal access and verify token-protected portal loading
- [ ] Run the scheduler smoke path and confirm `/payments` setup guidance is visible
- [ ] Record smoke-test results without storing credentials or secrets

Status:
Technicians Admin V1 is merged, migrated, and deployment-ready. Continue the smoke path after the technician invite redirect fix is deployed.
