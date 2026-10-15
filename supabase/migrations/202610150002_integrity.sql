begin;
create table public.saved_filters(user_id uuid primary key references public.profiles on delete cascade,filters jsonb not null default '{}');
alter table public.saved_filters enable row level security;
create policy own_filters on saved_filters for all to authenticated using(active_user() and user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on saved_filters to authenticated;
revoke all on saved_filters from anon;
drop policy read_games on games;
create policy read_games on games for select to authenticated using(active_user() and (host_id=auth.uid() or can_see_game(id)));
-- El servidor deriva la verificación de campo, nunca del formulario.
alter table public.rounds add column tee_id uuid references public.tees;
create or replace function public.validate_round() returns trigger language plpgsql set search_path=public as $$ declare h jsonb;n integer:=0;config holes;begin
new.verified:=false;
if new.played_at>(now() at time zone 'America/Mexico_City')::date then raise exception 'La fecha de ronda no puede estar en el futuro';end if;
if jsonb_typeof(new.scores)<>'array' or jsonb_array_length(new.scores)<>new.holes then raise exception 'Tarjeta incompleta';end if;
if new.tee_id is not null then if not exists(select 1 from tees t join courses c on c.id=t.course_id where t.id=new.tee_id and c.club_id=new.club_id) then raise exception 'El tee no pertenece al club';end if;new.verified:=exists(select 1 from tees t join courses c on c.id=t.course_id where t.id=new.tee_id and t.verified and c.verified);end if;
for h in select * from jsonb_array_elements(new.scores) loop n:=n+1;
if (h->>'hole')::integer<>n or ((h->>'par') is not null and (h->>'par')::integer not between 3 and 6) or ((h->>'strokes') is not null and (h->>'strokes')::integer not between 1 and 30) or ((h->>'putts') is not null and (h->>'putts')::integer not between 0 and 30) then raise exception 'Datos de hoyo inválidos';end if;
if new.status<>'draft' and h->>'strokes' is null then raise exception 'Captura todos los hoyos';end if;
if new.tee_id is not null then select * into config from holes where tee_id=new.tee_id and hole=n;if not found or config.par is null then raise exception 'Configuración de campo incompleta';end if;if (h->>'par')::integer is distinct from config.par or (h->>'distance')::integer is distinct from config.distance or (h->>'index')::integer is distinct from config.index then raise exception 'Los datos del campo no coinciden con el tee';end if;end if;
end loop;return new;end $$;
drop policy insert_round on rounds;drop policy update_round on rounds;
create policy insert_round on rounds for insert to authenticated with check(active_user() and user_id=auth.uid());
create policy update_round on rounds for update to authenticated using(active_user() and user_id=auth.uid()) with check(user_id=auth.uid());
-- Una publicación de score sigue siempre el estado y privacidad de su ronda.
create unique index post_round_unique on posts(round_id) where round_id is not null;
create function public.publish_round() returns trigger language plpgsql security definer set search_path=public as $$ declare total integer;begin
if new.status='published' then select sum((x->>'strokes')::integer) into total from jsonb_array_elements(new.scores) x;insert into posts(user_id,round_id,privacy,body) values(new.user_id,new.id,new.privacy,'Ronda de '||new.holes||' hoyos · '||total||' golpes. '||new.notes) on conflict(round_id) where round_id is not null do update set privacy=excluded.privacy,body=excluded.body;
else delete from posts where round_id=new.id;end if;return new;end $$;
create trigger publish_round after insert or update on rounds for each row execute function public.publish_round();
create function public.notification_allowed() returns trigger language plpgsql security definer set search_path=public as $$ begin if exists(select 1 from notification_preferences where user_id=new.user_id and category=new.category and not enabled) then return null;end if;return new;end $$;
create trigger notification_allowed before insert on notifications for each row execute function public.notification_allowed();
create function public.available_profile(other uuid) returns boolean language sql stable security definer set search_path=public as $$select not exists(select 1 from account_roles where user_id=other and suspended)$$;
revoke execute on function public.available_profile(uuid) from public,anon;grant execute on function public.available_profile(uuid) to authenticated;
drop policy read_profiles on profiles;
create policy read_profiles on profiles for select to authenticated using(active_user() and (id=auth.uid() or (visibility<>'private' and not_blocked(id) and available_profile(id))));
-- Evitar que una actualización de membresía cambie las claves de la relación.
revoke update on favorites,blocks from authenticated;
grant update(filters) on saved_filters to authenticated;
-- Se limita el cambio de visibilidad de publicaciones de ronda a través del editor de score.
create function public.protect_round_post() returns trigger language plpgsql set search_path=public as $$ begin if new.round_id is not null and not exists(select 1 from rounds where id=new.round_id and user_id=new.user_id and status='published' and privacy=new.privacy) then raise exception 'La publicación debe respetar la privacidad de la ronda';end if;return new;end $$;
create trigger protect_round_post before insert or update on posts for each row execute function public.protect_round_post();
revoke execute on function public.notification_allowed(),public.publish_round(),public.protect_round_post() from public,anon,authenticated;
commit;
