create unique index payments_provider_payment_id_unique_idx
  on payments(provider, provider_payment_id)
  where provider_payment_id is not null;
