alter type public.customer_portal_access_event_kind
  add value if not exists 'send_requested';

alter type public.customer_portal_access_event_kind
  add value if not exists 'send_failed';
