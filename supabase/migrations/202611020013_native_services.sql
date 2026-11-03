-- App services are opt-in. Apply after previous migrations; no client may enable them.
begin;
create table public.native_service_configuration (
  singleton boolean primary key default true check(singleton),
  apple_ready boolean not null default false,
  push_ready boolean not null default false
);
insert into public.native_service_configuration(singleton) values(true);
alter table public.native_service_configuration enable row level security;
revoke all on public.native_service_configuration from anon, authenticated;

create function public.native_service_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('apple', apple_ready, 'push', push_ready)
  from public.native_service_configuration where singleton
$$;
revoke all on function public.native_service_status() from public;
grant execute on function public.native_service_status() to anon, authenticated;

-- Neither identity provider attests the adult age required by Fairway.
create or replace function public.on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_app_meta_data->>'provider' in ('google','apple') then return new; end if;
  insert into profiles(id,name,age)
    values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Golfista'),
      (new.raw_user_meta_data->>'age')::integer);
  insert into account_roles(user_id) values(new.id);
  return new;
end $$;

create function public.complete_apple_signup(profile_name text, profile_age integer, accepted_terms boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare account auth.users;
begin
  select * into account from auth.users where id=auth.uid() for update;
  if not found or account.raw_app_meta_data->>'provider' is distinct from 'apple' then
    raise exception 'Inicia sesión con Apple para completar el alta';
  end if;
  if exists(select 1 from public.account_roles where user_id=auth.uid() and suspended) then
    raise exception 'Cuenta no disponible';
  end if;
  if exists(select 1 from public.profiles where id=auth.uid()) then return; end if;
  if accepted_terms is distinct from true then raise exception 'Acepta la información de privacidad para continuar'; end if;
  if profile_age is null or profile_age not between 18 and 100 then raise exception 'Debes tener entre 18 y 100 años'; end if;
  if profile_name is null or length(trim(profile_name)) not between 2 and 80 then raise exception 'Escribe tu nombre y apellido (entre 2 y 80 caracteres)'; end if;
  insert into public.profiles(id,name,age) values(auth.uid(),trim(profile_name),profile_age);
  insert into public.account_roles(user_id) values(auth.uid()) on conflict(user_id) do nothing;
end $$;
revoke all on function public.complete_apple_signup(text,integer,boolean) from public, anon;
grant execute on function public.complete_apple_signup(text,integer,boolean) to authenticated;

-- The legacy email path must not leave Apple's grant active. The native Edge
-- Function validates a fresh Apple code, revokes the grant, then uses Admin Auth.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar'; end if;
  if exists(select 1 from auth.users where id=auth.uid() and
    (raw_app_meta_data->>'provider'='apple' or coalesce(raw_app_meta_data->'providers','[]'::jsonb) @> '["apple"]'::jsonb)) then
    raise exception 'Confirma el borrado con Apple desde Fairway para iPhone';
  end if;
  perform 1 from public.account_deletion_requests where user_id=auth.uid() for update;
  if not found or not public.deletion_email_confirmed() then raise exception 'La eliminación requiere contraseña y una nueva confirmación por correo'; end if;
  delete from auth.users where id=auth.uid();
end $$;

create table public.native_push_devices (
  installation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  secret_hash text not null,
  environment text not null check(environment in ('sandbox','production')),
  updated_at timestamptz not null default now()
);
alter table public.native_push_devices enable row level security;
revoke all on public.native_push_devices from anon, authenticated;
create function public.register_native_push(installation uuid, device_token text, revocation_secret text, apns_environment text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.active_user() then raise exception 'Cuenta no disponible'; end if;
  if not exists(select 1 from public.native_service_configuration where singleton and push_ready) then raise exception 'Avisos no disponibles'; end if;
  if length(device_token) not between 32 and 512 or device_token !~ '^[0-9a-f]+$' or length(revocation_secret) not between 32 and 200 or apns_environment not in ('sandbox','production') then
    raise exception 'Registro de dispositivo no válido';
  end if;
  -- Possession of the per-installation secret is required even after an account change.
  if exists(select 1 from public.native_push_devices where installation_id=installation
      and secret_hash<>encode(sha256(convert_to(revocation_secret,'UTF8')),'hex')) then raise exception 'Dispositivo no válido'; end if;
  -- APNs may keep the token across reinstall. Its possession permits a new
  -- installation to replace an obsolete registration, without reading it.
  delete from public.native_push_devices where token=device_token and installation_id<>installation;
  if not exists(select 1 from public.native_push_devices where installation_id=installation) and
     (select count(*) from public.native_push_devices where user_id=auth.uid())>=10 then raise exception 'Límite de dispositivos alcanzado'; end if;
  insert into public.native_push_devices(installation_id,user_id,token,secret_hash,environment)
    values(installation,auth.uid(),device_token,encode(sha256(convert_to(revocation_secret,'UTF8')),'hex'),apns_environment)
  on conflict(installation_id) do update set user_id=excluded.user_id,token=excluded.token,environment=excluded.environment,updated_at=now();
end $$;

-- An offline logout can revoke later without recreating the user's session.
create function public.revoke_native_push(installation uuid, revocation_secret text)
returns void language sql security definer set search_path = '' as $$
  delete from public.native_push_devices where installation_id=installation
    and secret_hash=encode(sha256(convert_to(revocation_secret,'UTF8')),'hex')
$$;
revoke all on function public.register_native_push(uuid,text,text,text), public.revoke_native_push(uuid,text) from public;
grant execute on function public.register_native_push(uuid,text,text,text) to authenticated;
grant execute on function public.revoke_native_push(uuid,text) to anon, authenticated;

create table public.native_push_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  installation_id uuid not null references public.native_push_devices(installation_id) on delete cascade,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique(notification_id,installation_id)
);
alter table public.native_push_outbox enable row level security;
revoke all on public.native_push_outbox from anon, authenticated;
create function public.enqueue_native_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.native_service_configuration where singleton and push_ready) then
    insert into public.native_push_outbox(notification_id,installation_id)
      select new.id,d.installation_id from public.native_push_devices d
      where d.user_id=new.user_id and d.updated_at>now()-interval '90 days';
  end if;
  return new;
end $$;
create trigger native_push_after_notification after insert on public.notifications for each row execute function public.enqueue_native_push();

create function public.claim_native_push()
returns table(delivery_id uuid,device_id uuid,device_token text,apns_environment text,category text,badge_count integer)
language sql security definer set search_path = '' as $$
  with pending as (
    select o.id from public.native_push_outbox o
    join public.native_push_devices d on d.installation_id=o.installation_id
    join public.notifications n on n.id=o.notification_id and n.user_id=d.user_id
    join public.account_roles a on a.user_id=d.user_id and not a.suspended
    where o.delivered_at is null and o.attempts<5 and o.available_at<=now()
      and n.created_at>now()-interval '24 hours' and not n.read
      and exists(select 1 from public.native_service_configuration where singleton and push_ready)
      and not exists(select 1 from public.notification_preferences p where p.user_id=d.user_id and p.category=n.category and not p.enabled)
    order by o.available_at limit 50 for update of o skip locked
  ), claimed as (
    update public.native_push_outbox o set attempts=o.attempts+1,available_at=now()+interval '5 minutes'
    from pending p where o.id=p.id returning o.*
  )
  select c.id,d.installation_id,d.token,d.environment,n.category,
    (select least(999,count(*))::integer from public.notifications unread where unread.user_id=d.user_id and not unread.read)
    from claimed c
    join public.native_push_devices d on d.installation_id=c.installation_id
    join public.notifications n on n.id=c.notification_id and n.user_id=d.user_id
$$;
revoke all on function public.claim_native_push(), public.enqueue_native_push() from public, anon, authenticated;
grant execute on function public.claim_native_push() to service_role;
grant all on public.native_push_devices, public.native_push_outbox, public.native_service_configuration to service_role;
commit;
