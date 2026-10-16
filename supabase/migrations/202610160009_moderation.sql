-- ============================================================
-- Moderación de mensajes del chat — Fairway / JR
-- Migración NUEVA: no edita ninguna anterior.
--
-- Qué hace:
--   1) Guarda una lista de patrones (moderation_terms) que solo ven los admins.
--   2) Revisa cada mensaje DENTRO de send_message(), en la base de datos
--      (nadie se la salta desde el navegador):
--        block -> el mensaje NO se envía y la persona ve un aviso
--        flag  -> el mensaje se envía, pero queda registrado para revisión
--   3) Registra lo marcado en moderation_flags (solo admins).
--
-- Proyecto de Supabase: zmahtiecioxiflbblofa
-- Documentación: supabase/MODERACION.md
-- ============================================================

-- ---------- Tablas ----------
create table if not exists public.moderation_terms (
  id          bigint generated always as identity primary key,
  pattern     text not null unique,   -- regex POSIX sobre el texto YA normalizado
  severity    text not null check (severity in ('block','flag')),
  category    text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.moderation_flags (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete set null,
  conversation_id  uuid references public.conversations(id) on delete set null,
  severity         text not null check (severity in ('block','flag')),
  category         text not null,
  excerpt          text not null check (char_length(excerpt) <= 300),
  created_at       timestamptz not null default now()
);

create index if not exists moderation_flags_user_idx
  on public.moderation_flags (user_id, created_at desc);

-- Solo admins leen o escriben. La lista NO se expone a usuarios normales
-- para que no sea fácil esquivarla.
alter table public.moderation_terms enable row level security;
alter table public.moderation_flags enable row level security;

drop policy if exists admin_all on public.moderation_terms;
create policy admin_all on public.moderation_terms
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.moderation_flags;
create policy admin_all on public.moderation_flags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Normalización ----------
-- minúsculas, sin acentos, ñ->n, números/símbolos usados como letras
-- (0->o 1->i 3->e 4->a 5->s 7->t @->a $->s), letras repetidas 3+ veces -> 1,
-- y la puntuación se vuelve espacio.
-- OJO al escribir patrones nuevos: escribe "que", no "qué"; "manana", no "mañana".
create or replace function public.moderation_normalize(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        translate(lower(coalesce(t, '')), 'áéíóúüñ013457@$', 'aeiouunoieastas'),
        '(.)\1{2,}', '\1', 'g'),
      '[^a-z0-9]+', ' ', 'g')
  );
$$;

-- Devuelve la coincidencia más grave (block gana sobre flag), o ninguna fila.
create or replace function public.moderation_check(p_text text)
returns table(severity text, category text)
language sql
stable
security definer
set search_path = ''
as $$
  with n as (select public.moderation_normalize(p_text) as x)
  select t.severity, t.category
  from public.moderation_terms t, n
  where t.active and n.x ~* t.pattern
  order by (t.severity = 'block') desc, t.id
  limit 1
$$;

-- Solo send_message (que corre como dueño) las usa; los clientes no.
revoke all on function public.moderation_normalize(text) from public, anon, authenticated;
revoke all on function public.moderation_check(text) from public, anon, authenticated;

-- ---------- Reglas iniciales (español de México) ----------
insert into public.moderation_terms (pattern, severity, category) values
  -- BLOQUEAR: el mensaje no se envía
  ('\y(nudes?|desnud[oa]s?|encuerad[oa]s?|sexting|cibersexo|ciber sexo|onlyfans|porno|pornografia)\y', 'block', 'sexual_explicito'),
  ('\y(sexo (casual|oral|anal|sin compromiso)|tener sexo|hacer el amor)\y',                          'block', 'sexual_explicito'),
  ('\y(coger (contigo|conmigo|rico|rica|toda la noche)|te quiero coger|quiero cogerte|cogerte)\y',   'block', 'solicitud_sexual'),
  ('\y(cuanto cobras|escort|prepago|sugar (daddy|baby|mommy)|servicios sexuales|sexo por dinero)\y', 'block', 'comercial_sexual'),
  -- REVISAR: el mensaje se envía, pero queda registrado
  ('\y(quiero|queremos|vamos a|ganas de|podemos) coger\y(?! (el|la|los|las|un|una|unos|unas|mi|tu|su) )', 'flag', 'solicitud_ambigua'),
  ('\y(puta|puto|putas|putos|perra|zorra|pendej[oa]s?|hdp|ctm|hijo de (tu )?(puta|perra|chingada))\y', 'flag', 'insulto'),
  ('\y(tetas?|nalgas?|chichis|pezones?|pene|vagina|cachond[oa]s?)\y',                                'flag', 'vulgar_sexual'),
  ('\y(menor(es)? de edad|pornografia infantil|abuso infantil|abuso de menores)\y',                  'flag', 'menores')
on conflict (pattern) do nothing;

-- ---------- send_message con moderación ----------
-- Igual que la versión actual (autorización, límite de 20 mensajes por minuto,
-- insert y notificación) con la revisión añadida.
create or replace function public.send_message(c uuid, content text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_body text := trim(content);
  v_sev  text;
  v_cat  text;
begin
  if not can_chat(c) then
    raise exception 'Conversación no autorizada';
  end if;

  if (select count(*) from messages
      where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Espera un momento antes de enviar más mensajes';
  end if;

  select m.severity, m.category into v_sev, v_cat
  from moderation_check(v_body) m;

  if v_sev is not null then
    -- Solo los 'flag' quedan guardados: un 'block' termina en error y la
    -- transacción se revierte (ver supabase/MODERACION.md).
    insert into moderation_flags (user_id, conversation_id, severity, category, excerpt)
    values (auth.uid(), c, v_sev, v_cat, left(v_body, 300));
  end if;

  if v_sev = 'block' then
    raise exception 'Tu mensaje no se envió porque no cumple las reglas de la comunidad. Si crees que es un error, escríbelo de otra forma.';
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (c, auth.uid(), v_body);

  insert into notifications (user_id, category, title)
  select user_id, 'messages', 'Tienes un nuevo mensaje'
  from conversation_members
  where conversation_id = c and user_id <> auth.uid();
end
$function$;

-- ---------- Cómo usarlo (admins, en el SQL Editor) ----------
-- Revisar lo marcado:
--   select created_at, user_id, severity, category, excerpt
--   from moderation_flags order by created_at desc limit 50;
-- Pasar una categoría de bloquear a solo revisar:
--   update moderation_terms set severity = 'flag' where category = 'solicitud_sexual';
-- Apagar una regla:
--   update moderation_terms set active = false where id = 3;
-- Agregar una regla (recuerda: texto normalizado, sin acentos):
--   insert into moderation_terms (pattern, severity, category)
--   values ('\ypalabra\y', 'flag', 'insulto');
