create table if not exists public.ai_prompt_settings (
  key text primary key,
  text text not null check (char_length(text) between 1 and 12000),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by text not null,
  history jsonb not null default '[]'::jsonb check (
    jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 10
  )
);

alter table public.ai_prompt_settings enable row level security;
revoke all on public.ai_prompt_settings from anon, authenticated;
grant select, insert, update on public.ai_prompt_settings to authenticated;

create policy "Active members can read AI prompts"
on public.ai_prompt_settings for select to authenticated
using (exists (
  select 1 from public.workspace_members
  where user_id = (select auth.uid()) and is_active
));

create policy "Admin and ops can insert AI prompts"
on public.ai_prompt_settings for insert to authenticated
with check (exists (
  select 1 from public.workspace_members
  where user_id = (select auth.uid()) and is_active and role in ('admin', 'ops')
));

create policy "Admin and ops can update AI prompts"
on public.ai_prompt_settings for update to authenticated
using (exists (
  select 1 from public.workspace_members
  where user_id = (select auth.uid()) and is_active and role in ('admin', 'ops')
))
with check (exists (
  select 1 from public.workspace_members
  where user_id = (select auth.uid()) and is_active and role in ('admin', 'ops')
));
