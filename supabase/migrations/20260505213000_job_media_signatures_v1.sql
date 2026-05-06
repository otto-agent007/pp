alter table public.job_media
drop constraint if exists job_media_media_type_check;

alter table public.job_media
add constraint job_media_media_type_check
check (media_type in ('photo', 'signature'));
