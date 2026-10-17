-- Google no proporciona la edad. El perfil y su acceso se habilitan al completar el alta.
begin;

create or replace function public.on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- app_metadata es administrado por Auth; no confiar en user_metadata para el proveedor.
  if new.raw_app_meta_data->>'provider' = 'google' then
    return new;
  end if;
  insert into profiles(id,name,age)
    values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Golfista'),
      (new.raw_user_meta_data->>'age')::integer);
  insert into account_roles(user_id) values(new.id);
  return new;
end $$;

create function public.complete_google_signup(profile_name text, profile_age integer, accepted_terms boolean)
returns void language plpgsql security definer set search_path = public as $$
declare account auth.users;
begin
  select * into account from auth.users where id=auth.uid() for update;
  if not found or account.raw_app_meta_data->>'provider' is distinct from 'google' then
    raise exception 'Inicia sesión con Google para completar el alta';
  end if;
  if exists(select 1 from account_roles where user_id=auth.uid() and suspended) then
    raise exception 'Cuenta no disponible';
  end if;
  -- Reintentar nunca modifica un perfil existente ni sus permisos.
  if exists(select 1 from profiles where id=auth.uid()) then return; end if;
  if accepted_terms is distinct from true then
    raise exception 'Acepta la información de privacidad para continuar';
  end if;
  if profile_age is null or profile_age not between 18 and 100 then
    raise exception 'Debes tener entre 18 y 100 años';
  end if;
  if profile_name is null or length(trim(profile_name)) not between 2 and 80 then
    raise exception 'Escribe tu nombre y apellido (entre 2 y 80 caracteres)';
  end if;
  insert into profiles(id,name,age) values(auth.uid(),trim(profile_name),profile_age);
  insert into account_roles(user_id) values(auth.uid()) on conflict(user_id) do nothing;
end $$;

revoke all on function public.complete_google_signup(text,integer,boolean) from public,anon;
grant execute on function public.complete_google_signup(text,integer,boolean) to authenticated;
commit;
