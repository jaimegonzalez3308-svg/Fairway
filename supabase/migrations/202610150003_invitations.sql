begin;
create table public.game_invitations(game_id uuid references public.games on delete cascade,invitee_id uuid references public.profiles on delete cascade,sender_id uuid not null references public.profiles on delete cascade,created_at timestamptz default now(),primary key(game_id,invitee_id));
alter table public.game_invitations enable row level security;
create policy read_own_invitation on game_invitations for select to authenticated using(active_user() and auth.uid() in(invitee_id,sender_id));
create policy admin_all on game_invitations for all to authenticated using(is_admin()) with check(is_admin());
grant select on game_invitations to authenticated;
revoke all on game_invitations from anon;
create or replace function public.can_see_game(g uuid) returns boolean language sql stable security definer set search_path=public as $$ select active_user() and exists(select 1 from games where id=g and not_blocked(host_id) and (privacy='public' or host_id=auth.uid() or in_game(g) or (privacy='matches' and are_matched(host_id)) or exists(select 1 from game_invitations where game_id=g and invitee_id=auth.uid()))) $$;
create function public.invite_to_game(g uuid,invitee uuid) returns void language plpgsql security definer set search_path=public as $$begin if not active_user() or not not_blocked(invitee) or not exists(select 1 from games where id=g and host_id=auth.uid() and status='open' and starts_at>now()) then raise exception 'Invitación no permitida';end if;insert into game_invitations values(g,invitee,auth.uid(),now()) on conflict do nothing;insert into notifications(user_id,category,title) values(invitee,'games','Te invitaron a una partida. Revisa Partidas para solicitar tu lugar.');end $$;
revoke execute on function public.invite_to_game(uuid,uuid) from public,anon;grant execute on function public.invite_to_game(uuid,uuid) to authenticated;
create function public.game_updates() returns trigger language plpgsql security definer set search_path=public as $$begin if tg_table_name='games' then if new.status is distinct from old.status then insert into notifications(user_id,category,title) select user_id,'games',case new.status when 'cancelled' then 'Una partida fue cancelada' when 'finished' then 'Partida finalizada. Ya puedes evaluar a tus compañeros.' else 'Se actualizó el estado de tu partida' end from game_participants where game_id=new.id and status='confirmed';end if;else if new.status is distinct from old.status then insert into notifications(user_id,category,title) values(new.user_id,'games',case new.status when 'confirmed' then 'Tu solicitud de partida fue aprobada' else 'Tu solicitud de partida no fue aceptada' end);end if;end if;return new;end $$;
create trigger game_updates after update on games for each row execute function public.game_updates();
create trigger participant_updates after update on game_participants for each row execute function public.game_updates();
revoke execute on function public.game_updates() from public,anon,authenticated;
-- Se limita frecuencia de contenido desde el servidor.
create function public.content_rate_limit() returns trigger language plpgsql security definer set search_path=public as $$declare n integer;begin if tg_table_name='posts' then if new.round_id is not null then return new;end if;select count(*) into n from posts where user_id=new.user_id and created_at>now()-interval '1 hour';elsif tg_table_name='comments' then select count(*) into n from comments where user_id=new.user_id and created_at>now()-interval '1 hour';else select count(*) into n from reports where user_id=new.user_id and created_at>now()-interval '1 hour';end if;if n>=30 then raise exception 'Has alcanzado el límite temporal. Intenta más tarde.';end if;return new;end $$;
create trigger posts_rate before insert on posts for each row execute function public.content_rate_limit();
create trigger comments_rate before insert on comments for each row execute function public.content_rate_limit();
create trigger reports_rate before insert on reports for each row execute function public.content_rate_limit();
revoke execute on function public.content_rate_limit() from public,anon,authenticated;
alter table public.profiles add constraint years_valid check(years between 0 and 90),add constraint hand_valid check(hand in('derecha','izquierda'));
create or replace function public.protect_profile() returns trigger language plpgsql set search_path=public as $$declare path text;begin
if new.verified is distinct from old.verified and not is_admin() then raise exception 'Solo administración puede verificar perfiles';end if;
if new.photo<>'' and new.photo not like new.id::text||'/%' then raise exception 'La foto debe pertenecer al usuario';end if;
foreach path in array new.gallery loop if path not like new.id::text||'/%' then raise exception 'La galería debe pertenecer al usuario';end if;end loop;
return new;end $$;
commit;
