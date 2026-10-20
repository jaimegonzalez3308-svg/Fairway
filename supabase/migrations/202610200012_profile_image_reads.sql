-- Fix a correlated-column bug: unqualified name resolved to profiles.name,
-- not the Storage object's path. Uploads worked but signing/reading did not.
-- Keep the bucket private and preserve profile visibility, blocks and suspension.
begin;
alter policy view_images on storage.objects
using (
  bucket_id = 'profile-images'
  and public.active_user()
  and exists (
    select 1 from public.profiles as profile
    where profile.id::text = (storage.foldername(storage.objects.name))[1]
      and (
        profile.id = auth.uid()
        or (
          profile.visibility <> 'private'
          and public.not_blocked(profile.id)
          and public.available_profile(profile.id)
        )
      )
  )
);
commit;
