-- Fairway: solicitudes de amistad con consentimiento de ambas personas.
-- Ejecutar una vez después de la actualización 005.
begin;

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> recipient_id),
  check ((status='pending' and accepted_at is null) or (status='accepted' and accepted_at is not null))
);
create unique index friendships_pair on public.friendships
  (least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index friendships_recipient on public.friendships(recipient_id,status);
create index friendships_requester on public.friendships(requester_id,status);
alter table public.friendships enable row level security;
-- Las escrituras pasan por las funciones; no se puede autoaceptar ni cambiar las partes.
revoke all on public.friendships from public,anon,authenticated;
grant select on public.friendships to authenticated;
create policy own_friendships on public.friendships for select to authenticated using (
  public.active_user() and auth.uid() in (requester_id,recipient_id)
  and public.not_blocked(case when requester_id=auth.uid() then recipient_id else requester_id end)
  and public.available_profile(case when requester_id=auth.uid() then recipient_id else requester_id end)
);

create function public.request_friendship(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.friendships%rowtype;
begin
  if target is not null then
    perform pg_advisory_xact_lock(hashtext(least(auth.uid(),target)::text||greatest(auth.uid(),target)::text));
  end if;
  if not public.active_user() or target=auth.uid() or target is null
    or not public.not_blocked(target) or not public.available_profile(target)
    or not exists(select 1 from public.profiles where id=target and visibility<>'private')
  then raise exception 'No se puede enviar una solicitud a este perfil'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and visibility<>'private')
  then raise exception 'Haz visible tu perfil para miembros antes de enviar una solicitud'; end if;
  select * into existing from public.friendships
    where least(requester_id,recipient_id)=least(auth.uid(),target)
      and greatest(requester_id,recipient_id)=greatest(auth.uid(),target);
  if found then
    if existing.status='accepted' or existing.requester_id=auth.uid() then return; end if;
    raise exception 'Ya tienes una solicitud de esta persona. Acéptala desde Amigos';
  end if;
  if (select count(*) from public.friendships where requester_id=auth.uid() and created_at>now()-interval '1 hour')>=20
  then raise exception 'Has enviado varias solicitudes. Inténtalo más tarde'; end if;
  insert into public.friendships(requester_id,recipient_id) values(auth.uid(),target);
  insert into public.notifications(user_id,category,title)
    values(target,'friends','Tienes una solicitud de amistad. Revísala en Amigos.');
end $$;

create function public.respond_friendship(friendship uuid,action text) returns void
language plpgsql security definer set search_path = '' as $$
declare relation public.friendships%rowtype; other_id uuid;
begin
  if not public.active_user() then raise exception 'Inicia sesión para continuar'; end if;
  select * into relation from public.friendships where id=friendship for update;
  if not found or auth.uid() not in (relation.requester_id,relation.recipient_id)
  then raise exception 'Solicitud no disponible'; end if;
  other_id := case when relation.requester_id=auth.uid() then relation.recipient_id else relation.requester_id end;
  if action='accept' then
    if relation.recipient_id<>auth.uid() or not public.not_blocked(other_id) or not public.available_profile(other_id)
    then raise exception 'Solo la persona destinataria puede aceptar la solicitud'; end if;
    if relation.status='accepted' then return; end if;
    update public.friendships set status='accepted',accepted_at=now() where id=friendship;
    insert into public.notifications(user_id,category,title)
      values(relation.requester_id,'friends','Aceptaron tu solicitud de amistad. Ya aparece en Amigos.');
  elsif action='reject' and relation.recipient_id=auth.uid() and relation.status='pending'
    or action='cancel' and relation.requester_id=auth.uid() and relation.status='pending'
    or action='remove' and relation.status='accepted' then
    delete from public.friendships where id=friendship;
  else raise exception 'Acción de amistad no permitida'; end if;
end $$;

-- El bloqueo elimina solicitudes y amistades en ambas direcciones.
create function public.clear_blocked_friendships() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(least(new.user_id,new.target_id)::text||greatest(new.user_id,new.target_id)::text));
  delete from public.friendships where
    least(requester_id,recipient_id)=least(new.user_id,new.target_id)
    and greatest(requester_id,recipient_id)=greatest(new.user_id,new.target_id);
  return new;
end $$;
create trigger clear_blocked_friendships after insert on public.blocks
  for each row execute function public.clear_blocked_friendships();

revoke all on function public.request_friendship(uuid),public.respond_friendship(uuid,text),
  public.clear_blocked_friendships() from public,anon,authenticated;
grant execute on function public.request_friendship(uuid),public.respond_friendship(uuid,text) to authenticated;
alter publication supabase_realtime add table public.friendships;
commit;
