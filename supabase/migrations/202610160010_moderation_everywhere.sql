-- ============================================================
-- Moderación en TODO el texto que escriben los usuarios
-- Migración NUEVA: no edita ninguna anterior.
--
-- La 0009 solo revisaba send_message. Las publicaciones y comentarios de
-- Comunidad, las historias, el perfil, etc. se escriben por otros caminos
-- (algunos directo desde el navegador), así que no pasaban por el filtro.
--
-- Ahora el filtro es un trigger en cada tabla: se aplica a cualquier
-- insert o update, venga de donde venga.
--   block -> se cancela y la persona ve un aviso
--   flag  -> se guarda y queda registrado en moderation_flags
--
-- Fuera a propósito: reports y verification_requests (un reporte puede
-- citar el texto ofensivo y no debe bloquearse) y textos del sistema
-- (notificaciones, catálogos de campos y tees).
--
-- Documentación: supabase/MODERACION.md
-- ============================================================

-- De dónde vino lo marcado, p. ej. 'posts.body' o 'profiles.bio'.
alter table public.moderation_flags add column if not exists source text;

-- Revisa las columnas que recibe como argumentos (TG_ARGV). En un update
-- solo revisa las que cambiaron, para no volver a marcar el mismo texto
-- cada vez que alguien guarda su perfil.
create or replace function public.moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new  jsonb := to_jsonb(new);
  v_old  jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_col  text;
  v_text text;
  v_sev  text;
  v_cat  text;
  v_hits jsonb := '[]';
begin
  foreach v_col in array tg_argv loop
    continue when v_old is not null and v_new -> v_col is not distinct from v_old -> v_col;
    v_text := case jsonb_typeof(v_new -> v_col)
      when 'array' then (select string_agg(e, ' ') from jsonb_array_elements_text(v_new -> v_col) e)
      else v_new ->> v_col
    end;
    continue when coalesce(v_text, '') = '';

    select m.severity, m.category into v_sev, v_cat
    from public.moderation_check(v_text) m;
    continue when v_sev is null;

    if v_sev = 'block' then
      raise exception '%', case tg_table_name
        when 'messages' then 'Tu mensaje no se envió porque no cumple las reglas de la comunidad. Si crees que es un error, escríbelo de otra forma.'
        else 'Tu texto no se publicó porque no cumple las reglas de la comunidad. Si crees que es un error, escríbelo de otra forma.'
      end;
    end if;
    v_hits := v_hits || jsonb_build_object('col', v_col, 'cat', v_cat, 'text', left(v_text, 300));
  end loop;

  -- Solo llegan aquí los 'flag': un 'block' ya canceló todo arriba.
  insert into public.moderation_flags (user_id, conversation_id, severity, category, excerpt, source)
  select coalesce(auth.uid(), case when tg_table_name = 'profiles' then (v_new ->> 'id')::uuid end),
         (v_new ->> 'conversation_id')::uuid,
         'flag', h ->> 'cat', h ->> 'text', tg_table_name || '.' || (h ->> 'col')
  from jsonb_array_elements(v_hits) h;

  return null;
end
$$;

revoke all on function public.moderation_guard() from public, anon, authenticated;

-- AFTER para que, en un perfil nuevo, la fila ya exista cuando se guarda la marca.
drop trigger if exists moderation_guard on public.messages;
create trigger moderation_guard after insert or update on public.messages
  for each row execute function public.moderation_guard('body');

drop trigger if exists moderation_guard on public.posts;
create trigger moderation_guard after insert or update on public.posts
  for each row execute function public.moderation_guard('body');

drop trigger if exists moderation_guard on public.comments;
create trigger moderation_guard after insert or update on public.comments
  for each row execute function public.moderation_guard('body');

drop trigger if exists moderation_guard on public.stories;
create trigger moderation_guard after insert or update on public.stories
  for each row execute function public.moderation_guard('caption');

drop trigger if exists moderation_guard on public.profiles;
create trigger moderation_guard after insert or update on public.profiles
  for each row execute function public.moderation_guard('name', 'bio', 'city', 'occupation', 'additional_clubs');

drop trigger if exists moderation_guard on public.games;
create trigger moderation_guard after insert or update on public.games
  for each row execute function public.moderation_guard('description', 'access_conditions');

drop trigger if exists moderation_guard on public.reviews;
create trigger moderation_guard after insert or update on public.reviews
  for each row execute function public.moderation_guard('body');

drop trigger if exists moderation_guard on public.rounds;
create trigger moderation_guard after insert or update on public.rounds
  for each row execute function public.moderation_guard('notes', 'course');

drop trigger if exists moderation_guard on public.clubs;
create trigger moderation_guard after insert or update on public.clubs
  for each row execute function public.moderation_guard('name', 'description', 'access_info');

-- send_message vuelve a su forma original: el trigger de messages ya revisa
-- el texto y, si también lo revisara aquí, cada 'flag' quedaría doble.
create or replace function public.send_message(c uuid, content text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not can_chat(c) then
    raise exception 'Conversación no autorizada';
  end if;

  if (select count(*) from messages
      where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Espera un momento antes de enviar más mensajes';
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (c, auth.uid(), trim(content));

  insert into notifications (user_id, category, title)
  select user_id, 'messages', 'Tienes un nuevo mensaje'
  from conversation_members
  where conversation_id = c and user_id <> auth.uid();
end
$function$;
