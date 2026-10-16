-- Fairway: directorio público y eliminación con contraseña + correo.
-- Ejecutar una vez después de las migraciones anteriores.
begin;

-- Solo la información pública del club queda disponible sin cuenta.
grant select (id, name, city, verified, description, access_info) on public.clubs to anon;
create policy guest_club_directory on public.clubs for select to anon using (true);

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  password_session_id uuid not null,
  requested_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '15 minutes')
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;

-- Los tokens de una cuenta eliminada no conservan acceso a los datos privados.
create or replace function public.active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from account_roles where user_id = auth.uid() and not suspended)
$$;

create function public.begin_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
declare claims jsonb := auth.jwt(); session_uuid uuid; user_email text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar'; end if;
  session_uuid := nullif(claims->>'session_id', '')::uuid;
  select email into user_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if user_email is null then raise exception 'Confirma tu correo antes de solicitar la eliminación'; end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(claims->'amr', '[]'::jsonb)) method
    where method->>'method' = 'password'
      and (method->>'timestamp')::numeric >= extract(epoch from clock_timestamp() - interval '60 seconds')
  ) or not exists (
    select 1 from auth.sessions where id = session_uuid and user_id = auth.uid()
      and created_at >= clock_timestamp() - interval '60 seconds'
  ) then raise exception 'Vuelve a escribir tu contraseña para iniciar la solicitud'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if exists(select 1 from account_deletion_requests where user_id = auth.uid() and requested_at > clock_timestamp() - interval '60 seconds') then
    raise exception 'Espera un minuto antes de volver a solicitar la eliminación';
  end if;
  insert into account_deletion_requests(user_id,email,password_session_id)
    values(auth.uid(),user_email,session_uuid)
  on conflict(user_id) do update set email=excluded.email,password_session_id=excluded.password_session_id,
    requested_at=clock_timestamp(),expires_at=clock_timestamp()+interval '15 minutes';
end $$;

-- El enlace de correo debe crear una sesión posterior a la solicitud, diferente
-- de la sesión con contraseña. Se comprueba una sesión real, no un parámetro URL.
-- Este flujo es para las cuentas actuales de Fairway: correo + contraseña.
create function public.deletion_email_confirmed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from account_deletion_requests r
    join auth.users u on u.id=r.user_id
    join auth.sessions s on s.user_id=r.user_id and s.id=nullif(auth.jwt()->>'session_id','')::uuid
    where r.user_id=auth.uid() and r.expires_at>clock_timestamp()
      and s.id<>r.password_session_id and s.created_at>=r.requested_at
      and lower(u.email)=lower(r.email) and lower(auth.jwt()->>'email')=lower(r.email)
      and u.email_confirmed_at is not null
      and coalesce(u.phone,'')='' and coalesce(auth.jwt()->>'phone','')=''
      and exists (
        select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) method
        where method->>'method' in ('otp','magiclink')
          and (method->>'timestamp')::numeric >= extract(epoch from date_trunc('second',r.requested_at))
      )
  )
$$;

create function public.account_deletion_status()
returns table(expires_at timestamptz,email_confirmed boolean)
language sql stable security definer set search_path = public as $$
  select r.expires_at, public.deletion_email_confirmed()
    from account_deletion_requests r
    where r.user_id=auth.uid() and r.expires_at>clock_timestamp()
$$;

create function public.cancel_account_deletion() returns void
language sql security definer set search_path = public as $$
  delete from account_deletion_requests where user_id=auth.uid()
$$;

-- Sustituye el borrado inmediato anterior: no hay una vía que omita los pasos.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar'; end if;
  perform 1 from account_deletion_requests where user_id=auth.uid() for update;
  if not found or not public.deletion_email_confirmed() then
    raise exception 'La eliminación requiere contraseña y una nueva confirmación por correo';
  end if;
  delete from auth.users where id=auth.uid();
end $$;

revoke all on function public.begin_account_deletion(),public.deletion_email_confirmed(),
  public.account_deletion_status(),public.cancel_account_deletion(),public.delete_my_account()
  from public,anon,authenticated;
grant execute on function public.begin_account_deletion(),public.account_deletion_status(),
  public.cancel_account_deletion(),public.delete_my_account() to authenticated;
commit;
