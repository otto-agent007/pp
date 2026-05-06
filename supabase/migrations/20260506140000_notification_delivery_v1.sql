alter table notification_events
add column delivery_status text not null default 'not_sent'
  check (delivery_status in ('not_sent', 'sending', 'sent', 'failed')),
add column delivery_provider text
  check (delivery_provider in ('manual', 'webhook')),
add column delivery_attempts integer not null default 0
  check (delivery_attempts >= 0),
add column delivered_at timestamptz,
add column last_delivery_error text;

create index notification_events_delivery_status_idx
  on notification_events(delivery_status);
create index notification_events_delivery_provider_idx
  on notification_events(delivery_provider);
