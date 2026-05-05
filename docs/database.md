# Database Overview (Supabase/Postgres)

## Core Tables

### profiles
- id (auth.users)
- role (admin, dispatcher, technician)

### customers
- id, name, property_type

### locations
- id, customer_id, address, lat/lng

### jobs
- id, customer_id, assigned_tech_id
- status: scheduled | en_route | in_progress | completed

### job_media
- job_id, image_url, description

### forms
- job_id, form_type, form_data (JSONB)

### chemical_inventory
- name, epa_number, current_stock

### chemical_logs
- job_id, chemical_id, amount_used

## Key Behavior

### Chemical Deduction
Trigger:
- On chemical_logs insert
→ subtract from inventory
→ log movement

### Offline Sync
- All mobile writes go into queue
- Sync when online

### RLS
- Technicians → only assigned jobs
- Admin/dispatcher → full access
- Customers → portal token access only