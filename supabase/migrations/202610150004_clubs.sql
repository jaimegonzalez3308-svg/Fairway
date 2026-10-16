-- Catálogo adicional solicitado por el propietario. Puede ejecutarse nuevamente.
-- Fuentes de nombres y ubicación general: ver README, apartado Catálogo.
begin;
lock table public.clubs in share row exclusive mode;
insert into public.clubs (name, city, description, verified)
select seed.name, seed.city, seed.description, false
from (values
  ('Club de Golf Los Naranjos', 'León', 'Club de golf en León, Guanajuato. Acceso, tarifas y condiciones de membresía pendientes de confirmar.'),
  ('El Molino Golf Club', 'León', 'Club de golf en León, Guanajuato. Acceso, tarifas y condiciones de membresía pendientes de confirmar.'),
  ('Villaseca Hotel & Golf', 'Alrededores de León', 'Hotel y golf en las cercanías de León. Ubicación exacta y condiciones de acceso al campo pendientes de confirmar.')
) as seed(name, city, description)
where not exists (
  select 1 from public.clubs existing
  where lower(trim(existing.name)) = lower(trim(seed.name))
);
commit;
