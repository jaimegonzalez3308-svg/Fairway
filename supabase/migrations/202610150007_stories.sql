-- Fairway: historias de fotos con vencimiento real a las 24 horas.
-- Ejecutar después de 006. Storage privado; métricas solo para el autor.
begin;

create table public.stories (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null unique,
  caption text not null default '' check (char_length(caption)<=180),
  audience text not null default 'members' check (audience in ('members','friends')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '24 hours'),
  check (expires_at=created_at+interval '24 hours'),
  check (media_path=user_id::text||'/'||id::text||'.jpg')
);
create index stories_expiry on public.stories(expires_at);
create index stories_author on public.stories(user_id,created_at desc);
create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(story_id,user_id)
);
create table public.story_likes (
  story_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(story_id,user_id),
  foreign key(story_id,user_id) references public.story_views(story_id,user_id) on delete cascade
);
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_likes enable row level security;
revoke all on public.stories,public.story_views,public.story_likes from public,anon,authenticated;
grant select on public.stories,public.story_views,public.story_likes to authenticated;

create function public.can_see_story(story uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.active_user() and exists (
    select 1 from public.stories s where s.id=story and s.expires_at>now()
      and public.available_profile(s.user_id) and public.not_blocked(s.user_id)
      and (s.user_id=auth.uid() or (
        exists(select 1 from public.profiles p where p.id=s.user_id and p.visibility<>'private')
        and (s.audience='members' or exists (
          select 1 from public.friendships f where f.status='accepted'
          and least(f.requester_id,f.recipient_id)=least(auth.uid(),s.user_id)
          and greatest(f.requester_id,f.recipient_id)=greatest(auth.uid(),s.user_id)
        ))
      ))
  )
$$;
create policy read_active_stories on public.stories for select to authenticated
  using(public.can_see_story(id));
create policy read_story_views on public.story_views for select to authenticated using(
  public.can_see_story(story_id) and public.not_blocked(user_id) and public.available_profile(user_id)
  and (user_id=auth.uid() or exists(select 1 from public.stories s where s.id=story_id and s.user_id=auth.uid()))
);
create policy read_story_likes on public.story_likes for select to authenticated using(
  public.can_see_story(story_id) and public.not_blocked(user_id) and public.available_profile(user_id)
  and (user_id=auth.uid() or exists(select 1 from public.stories s where s.id=story_id and s.user_id=auth.uid()))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('story-images','story-images',false,5242880,array['image/jpeg']);
create policy upload_story_image on storage.objects for insert to authenticated with check(
  bucket_id='story-images' and public.active_user()
  and name ~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.jpg$')
);
-- El autor conserva acceso a archivos vencidos para limpiar Storage desde su cuenta.
create policy read_story_image on storage.objects for select to authenticated using(
  bucket_id='story-images' and public.active_user() and (
    (storage.foldername(name))[1]=auth.uid()::text
    or exists(select 1 from public.stories s where s.media_path=name and public.can_see_story(s.id))
  )
);
create policy delete_story_image on storage.objects for delete to authenticated using(
  bucket_id='story-images' and public.active_user() and (storage.foldername(name))[1]=auth.uid()::text
);

create function public.publish_story(story uuid, story_caption text default '', story_audience text default 'members') returns uuid
language plpgsql security definer set search_path='' as $$
declare path text := auth.uid()::text||'/'||story::text||'.jpg';
begin
  if not public.active_user() then raise exception 'Inicia sesión para publicar'; end if;
  perform pg_advisory_xact_lock(hashtext('stories:'||auth.uid()::text));
  if story is null or story_audience is null or story_audience not in ('members','friends') or char_length(story_caption)>180
    then raise exception 'Revisa la foto, el texto y la audiencia'; end if;
  if not exists(select 1 from storage.objects where bucket_id='story-images' and name=path)
    then raise exception 'Primero sube la fotografía'; end if;
  if (select count(*) from public.stories where user_id=auth.uid() and expires_at>now())>=20
    then raise exception 'Puedes tener hasta 20 historias activas'; end if;
  insert into public.stories(id,user_id,media_path,caption,audience)
    values(story,auth.uid(),path,coalesce(trim(story_caption),''),story_audience);
  return story;
end $$;

create function public.view_story(story uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.can_see_story(story) then raise exception 'Esta historia ya no está disponible'; end if;
  if exists(select 1 from public.stories where id=story and user_id=auth.uid()) then return; end if;
  insert into public.story_views(story_id,user_id) values(story,auth.uid()) on conflict do nothing;
end $$;

create function public.like_story(story uuid, liked boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.can_see_story(story) or exists(select 1 from public.stories where id=story and user_id=auth.uid())
    then raise exception 'No puedes reaccionar a esta historia'; end if;
  perform pg_advisory_xact_lock(hashtext('story-like:'||story::text||auth.uid()::text));
  if liked then
    perform public.view_story(story);
    insert into public.story_likes(story_id,user_id) values(story,auth.uid()) on conflict do nothing;
  else
    delete from public.story_likes where story_id=story and user_id=auth.uid();
  end if;
end $$;

-- El borrado de la historia revoca nuevos accesos y elimina las métricas en cascada.
create function public.remove_story(story uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.active_user() then raise exception 'Inicia sesión'; end if;
  delete from public.stories where id=story and user_id=auth.uid();
  if not found then raise exception 'Historia no disponible'; end if;
end $$;

revoke all on function public.can_see_story(uuid),public.publish_story(uuid,text,text),
  public.view_story(uuid),public.like_story(uuid,boolean),public.remove_story(uuid) from public,anon,authenticated;
grant execute on function public.can_see_story(uuid),public.publish_story(uuid,text,text),
  public.view_story(uuid),public.like_story(uuid,boolean),public.remove_story(uuid) to authenticated;
commit;
