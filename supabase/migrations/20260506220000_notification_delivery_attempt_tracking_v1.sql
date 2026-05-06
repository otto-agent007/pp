alter table notification_events
add column last_delivery_attempted_at timestamptz;

create index notification_events_last_delivery_attempted_at_idx
  on notification_events(last_delivery_attempted_at)
  where last_delivery_attempted_at is not null;
