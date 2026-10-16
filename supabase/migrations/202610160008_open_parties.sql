-- Fairway: parties públicas con incorporación directa y salida del grupo.
-- Ejecutar una vez después de las migraciones anteriores. No cambia las partidas existentes.
begin;

alter table public.games add column join_mode text not null default 'request'
  check (join_mode in ('request','open'));
alter table public.games add constraint open_party_is_public
  check (join_mode <> 'open' or privacy = 'public');

create or replace function public.request_join(g uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare rec public.games%rowtype; existing text; cid uuid; direct boolean;
begin
  if not public.active_user() then raise exception 'Inicia sesión para unirte'; end if;
  -- La misma fila serializa incorporaciones, aprobaciones y salidas: no hay sobrecupo.
  select * into rec from public.games where id=g for update;
  if not found or not public.can_see_game(g) or not public.available_profile(rec.host_id)
    or rec.starts_at<=now() or rec.status not in ('open','full')
    then raise exception 'Partida no disponible'; end if;
  select status into existing from public.game_participants where game_id=g and user_id=auth.uid();
  if existing='confirmed' then return; end if;
  if existing='rejected' then raise exception 'Tu solicitud no fue aceptada por el organizador'; end if;
  if existing='requested' and rec.join_mode='request' then return; end if;
  if rec.status='full' or (select count(*) from public.game_participants where game_id=g and status='confirmed')>=rec.capacity
    then raise exception 'La partida está completa'; end if;
  if exists(select 1 from public.game_participants where game_id=g and status='confirmed' and not public.not_blocked(user_id))
    then raise exception 'No puedes unirte a este grupo'; end if;
  direct := rec.join_mode='open';
  insert into public.game_participants(game_id,user_id,status,access_acknowledged)
    values(g,auth.uid(),case when direct then 'confirmed' else 'requested' end,true)
    on conflict(game_id,user_id) do update set status=excluded.status,access_acknowledged=true;
  if direct then
    select id into cid from public.conversations where game_id=g;
    insert into public.conversation_members(conversation_id,user_id) values(cid,auth.uid()) on conflict do nothing;
    if (select count(*) from public.game_participants where game_id=g and status='confirmed')>=rec.capacity
      then update public.games set status='full' where id=g; end if;
    insert into public.notifications(user_id,category,title) values
      (rec.host_id,'games','Un golfista se unió a tu party.'),
      (auth.uid(),'games','Tu lugar en la party está confirmado. Ya puedes entrar al chat.');
  else
    insert into public.notifications(user_id,category,title) values(rec.host_id,'games','Nueva solicitud para tu partida');
  end if;
end $$;

create function public.leave_game(g uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare rec public.games%rowtype; previous text;
begin
  if not public.active_user() then raise exception 'Inicia sesión para continuar'; end if;
  select * into rec from public.games where id=g for update;
  if not found or rec.starts_at<=now() or rec.status not in ('open','full')
    then raise exception 'Solo puedes salir de una partida futura que siga activa'; end if;
  if rec.host_id=auth.uid() then raise exception 'Como organizador puedes cancelar la partida'; end if;
  select status into previous from public.game_participants where game_id=g and user_id=auth.uid();
  if previous is null then return; end if;
  if previous='rejected' then raise exception 'No tienes un lugar en esta partida'; end if;
  delete from public.conversation_members where user_id=auth.uid()
    and conversation_id in (select id from public.conversations where game_id=g);
  delete from public.game_participants where game_id=g and user_id=auth.uid();
  if rec.status='full' and (select count(*) from public.game_participants where game_id=g and status='confirmed')<rec.capacity
    then update public.games set status='open' where id=g; end if;
  if previous='confirmed' then
    insert into public.notifications(user_id,category,title) values(rec.host_id,'games','Un jugador salió de tu partida. Hay un lugar disponible.');
  end if;
end $$;

revoke all on function public.request_join(uuid),public.leave_game(uuid) from public,anon,authenticated;
grant execute on function public.request_join(uuid),public.leave_game(uuid) to authenticated;
commit;
