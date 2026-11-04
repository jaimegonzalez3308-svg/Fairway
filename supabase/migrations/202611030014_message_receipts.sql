-- Delivery is acknowledged only after a recipient client receives messages.
-- Existing member-only SELECT and own-row UPDATE policies continue to apply.
begin;
alter table public.conversation_members
  add column if not exists last_delivered_at timestamptz;
grant update (last_delivered_at) on public.conversation_members to authenticated;
-- Realtime honors the existing member-only SELECT policy.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'conversation_members'
  ) then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end $$;
commit;
