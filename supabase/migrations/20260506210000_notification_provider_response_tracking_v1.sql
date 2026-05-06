alter table notification_events
add column provider_message_id text;

create index notification_events_provider_message_id_idx
  on notification_events(provider_message_id)
  where provider_message_id is not null;
