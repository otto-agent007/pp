alter table notification_events
  add column if not exists generated_key text;

create unique index if not exists notification_events_generated_key_unique_idx
  on notification_events(generated_key)
  where generated_key is not null;
