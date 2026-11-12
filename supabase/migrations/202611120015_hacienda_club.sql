-- Completa el registro provisional de La Hacienda con el mismo formato que el resto
-- del catálogo. Actualiza la fila existente (conserva su id y los perfiles que la
-- usan) y solo la crea si no existe ninguna versión. Puede ejecutarse nuevamente.
begin;
lock table public.clubs in share row exclusive mode;
update public.clubs
set name = 'La Hacienda Club de Golf',
    city = 'León',
    description = 'Club de golf en León, Guanajuato. Acceso, tarifas y condiciones de membresía pendientes de confirmar.'
where lower(trim(name)) = lower('La Hacienda Club de Golf')
   or (
     lower(trim(name)) = lower('Club de Golf La Hacienda')
     and not exists (
       select 1 from public.clubs existing
       where lower(trim(existing.name)) = lower('La Hacienda Club de Golf')
     )
   );
insert into public.clubs (name, city, description, verified)
select 'La Hacienda Club de Golf', 'León',
  'Club de golf en León, Guanajuato. Acceso, tarifas y condiciones de membresía pendientes de confirmar.',
  false
where not exists (
  select 1 from public.clubs existing
  where lower(trim(existing.name)) in (lower('La Hacienda Club de Golf'), lower('Club de Golf La Hacienda'))
);
commit;
