create or replace function private.sync_workspace_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.workspace_members
  set email = new.email
  where user_id = new.id and email is distinct from new.email;
  return new;
end;
$$;

revoke all on function private.sync_workspace_email() from public, anon, authenticated;

create trigger target_sync_workspace_email
after update of email on auth.users
for each row
when (new.email is not null and old.email is distinct from new.email)
execute function private.sync_workspace_email();
