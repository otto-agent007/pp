alter table automation_rules
  add column template_id uuid references notification_templates(id) on delete set null;

create index automation_rules_template_id_idx
  on automation_rules(template_id);
