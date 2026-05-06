# In Progress

## Task: Notification Delivery Retry Policy V1

Goal:
Define a clear retry policy for failed notification deliveries so admins can see which reminders are still safe to retry and which need manual review.

Steps:
- [ ] Add a domain helper that classifies notification retry state
- [ ] Treat `not_sent` and low-attempt `failed` reminders as retryable
- [ ] Treat over-attempt failed reminders as manual review
- [ ] Show retry state on `/automation` notification cards
- [ ] Keep provider calls and scheduler behavior unchanged
- [ ] Add focused domain and UI tests

Status:
Planned after Notification Delivery Attempt Summary V1.
