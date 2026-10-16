# Fairway

Aplicación de golf para encontrar compañeros, organizar partidas y registrar scores. Comienza en León, Guanajuato; los clubes y perfiles guardan ciudad para ampliar el catálogo.

**Estado honesto:** el proyecto compila y las reglas críticas tienen pruebas de PostgreSQL. Se configuró el proyecto de Supabase proporcionado por el propietario y se comprobó que Auth responde y las tablas protegidas rechazan el acceso anónimo. Sin variables de entorno aparece una demostración identificada; sus perfiles, reputaciones, partidas y rondas son ficticios. Los likes demo solo cambian la vista durante la sesión. No se simulan conversaciones, registros, mensajes, solicitudes ni guardados reales. Con Supabase configurado desaparecen los datos demo y se usan exclusivamente datos de tu proyecto.

## 1. Abrir en tu computadora

Estos pasos se hacen una sola vez. No necesitas modificar código.

1. Instala la versión LTS de [Node.js](https://nodejs.org/). Cierra y abre Terminal después de instalarla.
2. Abre Terminal y copia estas líneas, una por una:

```bash
cd /Users/rodrigocalderonknight/Matrix/fairway
npx --yes pnpm@10.28.2 install
npx --yes pnpm@10.28.2 dev
```

3. Abre `http://localhost:3000` en tu navegador. Mantén Terminal abierta mientras usas la aplicación. Para detenerla, pulsa `Control + C`.

Para abrirla otra vez, repite `cd ...` y el comando que termina en `dev`. Si el puerto está ocupado, Next.js imprimirá otra dirección.

## 2. Crear y conectar Supabase

Supabase proporciona el inicio de sesión, la base de datos, el almacenamiento privado de fotografías y el chat en tiempo real.

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard), crea una cuenta y pulsa **New project**.
2. Crea el proyecto `Fairway`. Guarda la contraseña de la base de datos en tu gestor de contraseñas. No hace falta compartirla con esta aplicación.
3. Cuando el proyecto esté listo, entra en **SQL Editor → New query**.
4. Abre en tu editor el primer archivo de la lista siguiente, copia **todo** su contenido al editor SQL y pulsa **Run**. Repite con los siguientes archivos en orden. Ejecuta cada archivo una sola vez, en este orden:

   - `supabase/migrations/202610150001_fairway.sql`
   - `supabase/migrations/202610150002_integrity.sql`
   - `supabase/migrations/202610150003_invitations.sql`
   - `supabase/migrations/202610150004_clubs.sql`
   - `supabase/migrations/202610150005_guest_and_account_security.sql`
   - `supabase/migrations/202610150006_friends.sql`
   - `supabase/migrations/202610150007_stories.sql`
   - `supabase/migrations/202610160008_open_parties.sql`

   Si aparece un error, detente y conserva el texto del error. No desactives RLS para solucionarlo. Las migraciones incluyen transacciones para evitar instalaciones parciales.

5. En la configuración del proyecto busca **Project URL** y **API Keys → Publishable key**. En proyectos antiguos, la clave equivalente se llama `anon`.
6. En la carpeta `fairway`, crea el archivo `.env.local`. Puedes duplicar `.env.example` y cambiarle el nombre. Pega los dos valores:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLICA
```

**No uses la clave secret ni service_role.** La clave pública está diseñada para usarse en el navegador; las políticas de PostgreSQL son las que protegen los datos. `.env.local` está excluido de Git.

7. Para la versión publicada actual, usa `https://fairway-leon-golf.honeyring4.chatgpt.site` como **Site URL** y agrega `https://fairway-leon-golf.honeyring4.chatgpt.site/**` a las redirecciones permitidas. Esto es necesario para volver a Fairway al confirmar tu correo o recuperar la contraseña. Para desarrollo, configura inicialmente `http://localhost:3000` como Site URL y agrega `http://localhost:3000/**` a las URL de redirección permitidas. Al publicar, agrega también tu dominio de Vercel y actualiza Site URL.
8. En **Authentication → Providers → Email**, mantén habilitada la confirmación por correo. Antes de un lanzamiento público configura tu propio SMTP, límites de envío y protección antiabuso en Supabase.
9. Detén el servidor con `Control + C` y vuelve a ejecutar `npx --yes pnpm@10.28.2 dev`.
10. Crea una cuenta desde Fairway, confirma el correo y completa tu perfil. El catálogo inicial de clubes estará disponible, pero no habrá personas reales hasta que se registren.

Realtime queda preparado por las migraciones para `messages` y `notifications`. Si se modificó la configuración de publicación, confirma que ambas tablas estén incluidas en `supabase_realtime`. Las imágenes usan un bucket **privado**, URLs temporales y políticas por usuario.

## 3. Qué está implementado

- Registro con correo y contraseña, confirmación, login, recuperación y cambio de contraseña mediante Supabase Auth. Alta limitada a 18+ tanto en formulario como en base de datos.
- Perfil editable, foto y galería de hasta 6 imágenes, club declarado, handicap declarado opcional, disponibilidad, modalidades, estilos y preferencias.
- Descubrimiento con filtros combinables y guardados en base de datos, búsqueda, favoritos y decisiones persistentes. Un perfil decidido deja de aparecer en recomendaciones; sigue siendo accesible desde favoritos si se guardó.
- Compatibilidad determinista de 0 a 100 y razones visibles. Club: 30; al menos un día compartido: 30; misma modalidad: 20; diferencia de handicap de hasta 8: 10; mismo estilo: 10. Los factores desconocidos no suman puntos.
- Match mutuo atómico, conversación privada y mensajes en tiempo real. Los clientes no pueden insertar matches, participantes o mensajes directamente para saltarse las reglas.
- Partidas de 2 a 4 jugadores, solicitudes, aprobación/rechazo por el organizador, control transaccional del cupo, estados y chat grupal de participantes confirmados.
- Partidas públicas, para matches o por invitación. El organizador envía una invitación desde el detalle; el destinatario ve la partida y solicita su lugar. La invitación de Fairway no autoriza acceso al club ni reserva tee times.
- Scorecard de 9 o 18 hoyos, ida y vuelta, golpes, par, índice, distancia, putts, fairway y GIR opcionales. Borrador, finalización, edición, publicación y privacidad por ronda. Los resultados se normalizan además en `hole_scores`.
- Configuración de recorridos, tees y hoyos desde administración. Si se elige un tee configurado, PostgreSQL comprueba par, distancia e índice contra el catálogo. En captura manual los datos quedan no verificados; los pars vacíos no se inventan.
- Historial y estadísticas calculadas desde rondas finalizadas: promedio, mejor/peor ronda, birdies, pars, promedio por tipo de par, putts, GIR, fairways y rendimiento por club, con gráfica y filtros temporales.
- Evaluaciones por puntualidad, respeto, ritmo y convivencia. Solo pueden evaluar participantes confirmados de una misma partida finalizada; la pareja no puede evaluarse dos veces para esa partida.
- Base de comunidad: publicaciones de texto y scores, comentarios, reacciones, solicitud de seguimiento y aprobación de seguidores. Orden por fecha; filtros de feed por siguiendo, club y ciudad.
- Notificaciones en la aplicación de matches, mensajes, solicitudes y cambios de partidas; categorías configurables. Disponibilidad temporal consultada solo antes de su vencimiento y calendario de partidas.
- Bloqueo, reportes, privacidad de perfil y scores, eliminación de cuenta y limpieza previa de imágenes desde Storage.
- Panel administrativo con comprobación de rol en PostgreSQL para clubes, recorridos, tees, hoyos, reportes, verificación, publicaciones y suspensión. Los formularios de configuración avanzada usan JSON para esta primera versión.

## 4. Crear tu administrador

Primero registra y confirma tu cuenta normalmente. Después, **solo desde SQL Editor de Supabase**, ejecuta esto reemplazando el correo por el tuyo:

```sql
update public.account_roles
set is_admin = true
where user_id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

Actualiza Fairway. Aparecerá Administración en el menú lateral. Nunca otorgues permisos administrativos desde una pantalla pública. Un usuario normal no puede cambiar sus roles ni autoverificarse.

Los clubes están precargados como **no verificados**. Club de Golf La Hacienda tiene ciudad pendiente de confirmación; el nombre no implica que se haya verificado su ubicación en León. No hay direcciones, tarifas, distancias o pars oficiales inventados. Las imágenes de clubes son ilustrativas.

Para cargar un campo real: agrega un recorrido con el `club_id`, agrega un tee con el `course_id` y luego cada hoyo con su `tee_id`. Usa únicamente datos proporcionados o confirmados por el campo. Marca recorrido y tee verificados solo después de comprobarlos. Las membresías de jugadores permanecen declaradas hasta definir y aplicar un procedimiento de verificación real.

## 5. Publicar en Vercel

1. Sube esta carpeta a un repositorio de GitHub. Si no conoces Git, puedes usar la aplicación [GitHub Desktop](https://desktop.github.com/) para agregar una carpeta existente y publicarla. No incluyas `.env.local` ni `node_modules`.
2. En [Vercel](https://vercel.com/new), selecciona **Add New → Project** e importa el repositorio.
3. Si el repositorio contiene la carpeta Matrix completa, selecciona `fairway` como **Root Directory**. Si contiene solo este proyecto, usa la raíz del repositorio.
4. Deja Next.js como framework. La compilación es `pnpm build`. El proyecto produce una exportación `out` que se comunica con Supabase. No necesita un servidor Next para guardar información.
5. Antes del primer despliegue, añade en **Environment Variables** las mismas dos variables del archivo `.env.local`.
6. Pulsa Deploy. Copia el dominio resultante a **Authentication → URL Configuration** de Supabase y permite el dominio con `/**` como redirección.
7. Si cambias las variables, vuelve a desplegar: las variables públicas se incorporan durante la compilación, no después.

La versión de Sites en `https://fairway-leon-golf.honeyring4.chatgpt.site` es pública. Los datos privados siguen protegidos por Supabase y requieren iniciar sesión.

## 6. Comprobar que funciona

En Terminal, dentro de la carpeta del proyecto:

```bash
npx --yes pnpm@10.28.2 typecheck
npx --yes pnpm@10.28.2 test
npx --yes pnpm@10.28.2 build
```

Las pruebas de PostgreSQL usan PGlite local y esquemas de prueba para `auth` y `storage`. Verifican migraciones, mayoría de edad, escalamiento de permisos, matches, chats, solicitudes, cupos, evaluaciones, privacidad de scores, bloqueos y acceso anónimo. **No sustituyen una prueba contra tu instancia real de Supabase**, su correo, Storage ni Realtime.

Prueba de aceptación con Supabase:

1. Crea dos cuentas de prueba mayores de edad con correos que controles; confirma ambos correos y completa sus perfiles.
2. Desde la primera cuenta da like a la segunda. Todavía no debe haber conversación. Devuelve el like desde la segunda; ambas verán el match y podrán escribir.
3. Crea una partida futura desde la primera cuenta. La segunda solicita unirse y permanece pendiente hasta aprobación. Al aprobarla aparece el chat grupal.
4. Registra una ronda privada con 9 hoyos. No debe ser visible desde la otra cuenta. Publica una ronda pública y confirma que aparece en Comunidad.
5. Tras la hora de una partida realmente compartida, su organizador la finaliza. Los participantes confirmados podrán evaluarse una sola vez.
6. Bloquea a un participante y confirma que desaparecen su perfil y el acceso al chat mutuo.
7. Prueba recuperación de contraseña por correo, carga de fotos, cambio de visibilidad y eliminación de una cuenta exclusivamente de prueba.

## 7. Arquitectura y archivos

- `app/`: Next.js App Router, metadatos y estilos con variables de diseño.
- `components/fairway-app.tsx`: estructura, navegación adaptable y composición de pantallas.
- `components/forms.tsx`: registro, perfil, partidas y evaluaciones.
- `components/scorecard.tsx`: captura de hoyos y selección de configuración real.
- `components/stats.tsx`: métricas y gráfica Recharts.
- `components/community.tsx`, `settings.tsx`, `ui.tsx`: comunidad, ajustes, administración y primitivas reutilizables. Los diálogos accesibles usan Radix.
- `lib/domain.ts`: tipos, validación Zod, compatibilidad, filtros y cálculos puros.
- `lib/use-fairway.ts`: sesión, carga de datos, operaciones y suscripciones.
- `lib/supabase.ts`: cliente público con RLS; no utiliza claves privilegiadas.
- `lib/demo.ts`: ejemplos claramente separados de datos reales.
- `supabase/migrations/`: esquema relacional, funciones transaccionales y políticas.
- `tests/`: cálculos y reglas de seguridad verificadas con PostgreSQL.

El frontend usa una entrada App Router y navegación por fragmentos (`#descubrir`, `#partidas`, etc.). Los registros viven en PostgreSQL, nunca solamente en localStorage. Supabase administra la persistencia de la sesión. Esta versión usa React, TypeScript, formularios React Hook Form/Zod, Radix, Lucide y Recharts. El diseño se implementa con CSS modular por componentes y tokens; Tailwind está disponible como dependencia, sin ser necesario para compilar estos estilos. Está preparado para Vercel y para hosting estático con Supabase externo.

## 8. Límites y trabajo posterior

El núcleo del MVP está implementado y probado localmente. Supabase ya está configurado. Falta ejecutar la aceptación real con dos cuentas, incluyendo confirmación por correo, Storage y Realtime. La revisión visual de escritorio se realizó en Chrome; la revisión interactiva completa y móvil no pudo completarse por indisponibilidad del control de ventanas durante esta sesión.

Antes de un lanzamiento público: completar el aviso de privacidad con datos del responsable y canal ARCO; configurar SMTP y protección antiabuso en Auth; verificar el catálogo de clubes y campos; definir operación de moderación y verificación; hacer revisión de seguridad contra el proyecto real. El consentimiento actual explica el uso básico de datos y no sustituye ese aviso completo.

Quedan para fases posteriores: Google OAuth, retos, push, recomendaciones avanzadas, integración con clubes, subida de fotos a publicaciones, guardado de publicaciones, compartir perfiles/invitaciones dentro del chat, evolución histórica del handicap declarado y filtros de descubrimiento por hora, experiencia o múltiples clubes. La disponibilidad rápida sí permite fechas y horarios. El directorio no anuncia conteos totales públicos: solo perfiles visibles bajo RLS. Los logros actuales son Primera ronda, 10 rondas y Primer birdie, derivados de registros.

La membresía declarada no concede acceso a un club. No existe integración con World Handicap System ni cálculo de un handicap oficial. El handicap declarado se mantiene separado de las estadísticas internas.

Fotos de demostración e imágenes ilustrativas: Unsplash. No representan a usuarios registrados ni verifican la identidad o membresía de nadie.

Referencias técnicas: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Catálogo adicional: Los Naranjos, El Molino y Villaseca

Se agregaron Club de Golf Los Naranjos, El Molino Golf Club y Villaseca Hotel & Golf. Se consultaron los sitios oficiales de [Los Naranjos](https://clublosnaranjos.com.mx/), [El Molino](https://www.elmolinogolfclub.com/quienes-somos) y [Villaseca](https://www.villaseca.com.mx/). Se conserva `verified = false`: consultar un sitio web no verifica membresías, autorización de acceso ni la configuración de tees y hoyos. Villaseca figura como Alrededores de León mientras se confirma su ubicación exacta.

Para una base ya instalada, ejecuta **solo** `supabase/migrations/202610150004_clubs.sql` en SQL Editor. Es idempotente: no duplica nombres existentes ni sobrescribe su información. No vuelvas a ejecutar el instalador inicial en un proyecto que ya tiene tablas. Las pantallas de perfil, filtros, partidas, disponibilidad y scores toman las opciones de la misma tabla `clubs`; actualizar esa tabla actualiza el catálogo para todos al recargar.

## Si el correo abre localhost o dice otp_expired

El ajuste de destino del correo se hace en **Supabase → Authentication → URL Configuration**; no se cambia con SQL ni publicando el frontend:

- Site URL: `https://fairway-leon-golf.honeyring4.chatgpt.site`
- Redirect URLs: agregar `https://fairway-leon-golf.honeyring4.chatgpt.site/` y `https://fairway-leon-golf.honeyring4.chatgpt.site/**` sin borrar destinos que todavía utilices.
- Guardar los cambios. Mantener activada la confirmación por correo.

Fairway pasa `emailRedirectTo` en el alta y al reenviar confirmaciones, y `redirectTo` en la recuperación. Supabase debe permitir esos destinos. Un enlace anterior no se corrige retroactivamente: entra en la web pública, escribe el mismo correo y pulsa **Reenviar correo de confirmación**. Abre solo el mensaje más reciente. Si la cuenta ya se confirmó antes de caer en localhost, puedes iniciar sesión directamente con tu contraseña. No hace falta borrar la cuenta ni registrarla de nuevo.

El error `otp_expired` puede indicar un enlace vencido o que ya se utilizó. La app muestra ese caso y permite solicitar otra confirmación; no muestra tokens ni usa mensajes arbitrarios de la URL. Los fragmentos de sesión tampoco se interpretan como pantallas de navegación.

Si personalizaste la plantilla **Confirm signup**, revisa que use el enlace de verificación de Supabase (`{{ .ConfirmationURL }}`) y no un enlace directo a localhost. No desactives Confirm Email como solución. Referencias: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Reenviar confirmación](https://supabase.com/docs/reference/javascript/auth-resend).

## Acceso público y eliminación segura de cuenta

Sin cuenta se puede abrir Inicio, Descubrir (presentación de las funciones), Clubes y Privacidad. Las demás secciones muestran un diálogo con fondo difuminado y opciones para iniciar sesión o crear una cuenta. Los perfiles y conversaciones requieren autenticación. El directorio público consulta solo las columnas públicas de clubes; si faltan permisos muestra un catálogo de referencia claramente identificado.

El menú de la cuenta y Configuración incluyen Cerrar sesión y Eliminar mi cuenta. La eliminación requiere contraseña actual, un nuevo enlace de correo y confirmación final escribiendo ELIMINAR. El enlace no elimina nada por sí solo. La solicitud vence en 15 minutos. La base de datos comprueba sesiones reales y evidencia firmada de autenticación; la validación no depende solo del navegador. Este flujo admite las cuentas actuales de correo y contraseña, sin teléfono asociado.

**Base ya instalada:** ejecutar solo `supabase/migrations/202610150005_guest_and_account_security.sql` (también disponible en Matrix como `Actualizar acceso y seguridad Fairway.sql`). No volver a ejecutar el instalador inicial. Mientras no se ejecute esta actualización, la nueva interfaz no permite iniciar una eliminación; la función anterior del servidor aún debe sustituirse con esta migración.

En Supabase → Authentication → URL Configuration deben estar permitidos el sitio público y `https://fairway-leon-golf.honeyring4.chatgpt.site/**`, incluido el regreso `/?delete_account=1`. Mantener habilitados Email y Magic Link, con la plantilla Magic Link usando `{{ .ConfirmationURL }}`. Supabase envía su correo de enlace de acceso para verificar la identidad; Fairway explica el propósito antes y después del envío.

Las pruebas locales cubren permisos de columnas del directorio, solicitudes de eliminación, contraseña reciente, sesiones antiguas, sesiones de otro usuario, correo cambiado, teléfono, vencimiento, cancelación, borrado completo y pérdida de acceso de tokens antiguos. No se han enviado correos ni eliminado cuentas reales para probar este flujo. Falta probarlo con una cuenta desechable en la instancia real tras instalar la migración. Referencias: [Sesiones de Supabase](https://supabase.com/docs/guides/auth/sessions), [campos del JWT](https://supabase.com/docs/guides/auth/jwt-fields), [enlaces de acceso por correo](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

## Amigos y QR del perfil

La sección **Amigos** requiere cuenta y permite buscar por nombre (al menos dos letras), ver el perfil, enviar una solicitud, aceptar o rechazar las recibidas, cancelar las enviadas y eliminar una amistad confirmada. Las búsquedas consultan Supabase y no dependen de likes, favoritos ni filtros de compatibilidad; muestran hasta 30 coincidencias por consulta. La amistad se confirma solo cuando acepta la persona destinataria. No cambia el acceso a mensajes, partidas ni scores.

Los participantes ven únicamente sus relaciones. Los perfiles privados, suspendidos y bloqueados siguen protegidos por RLS, también al abrir enlaces directos. Para enviar solicitudes el propio perfil debe ser visible para miembros. Bloquear elimina las solicitudes y amistades entre las dos personas. Las notificaciones de solicitudes y aceptación se controlan con la categoría Amigos en Ajustes.

**Activación en una base existente:** ejecutar solo `supabase/migrations/202610150006_friends.sql`, también disponible en Matrix como **Agregar amigos Fairway.sql**. Usar SQL Editor → + → Create a new snippet → pegar todo → Run. No ejecutar otra vez Instalar Fairway.sql. Si todavía falta la migración, la búsqueda y el QR siguen disponibles, pero la interfaz avisa que las solicitudes aún no están activadas.

En **Mi perfil → Mi código QR** se genera un QR PNG localmente con `qrcode`; no se envía el enlace a servicios de QR. Se puede descargar, copiar el enlace o usar Compartir en dispositivos compatibles. El enlace contiene únicamente el ID del perfil: `/?golfista=UUID#amigos`, sin credenciales. La persona que lo abra inicia sesión y ve el perfil si su privacidad lo permite. El registro y su confirmación por correo conservan el destino del perfil compartido. Un perfil privado muestra un aviso al compartirlo. El ID no es un permiso de acceso.

Pruebas adicionales con PostgreSQL: solicitudes duplicadas o cruzadas, autoaceptación, participantes ajenos, escrituras directas, aceptación, cancelación, rechazo, bloqueo en ambas direcciones, perfiles privados/suspendidos, búsqueda literal por nombre y cascada de eliminación. Un decodificador independiente (`jsQR`) comprueba que el QR generado contiene el enlace esperado. Falta probar solicitudes entre dos cuentas reales y escanear el QR con un teléfono tras aplicar la migración. Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones de base de datos](https://supabase.com/docs/guides/database/functions), [qrcode](https://github.com/soldair/node-qrcode).

La revisión visual de estas pantallas queda pendiente: el control nativo de Chrome devolvió `cgWindowNotFound`. El servidor local sí respondió HTTP 200; TypeScript, la compilación y las pruebas de permisos y QR se comprobaron por separado.

## Historias de 24 horas

En **Comunidad → Crear historia** y **Mi perfil → Publicaciones** se puede seleccionar una foto JPG, PNG o WebP (hasta 10 MB), revisar la vista previa, añadir hasta 180 caracteres y compartir con miembros o solo con amistades aceptadas. El navegador normaliza la foto a JPEG de hasta 1600 px y 5 MB antes de subirla. Esta primera versión admite fotografías; todavía no admite video.

Las historias se agrupan por persona con anillo para las no vistas y orden cronológico dentro de cada grupo. El visor vertical tiene barras de progreso, avance automático de siete segundos, pausa, botones y flechas del teclado. Se pausa al ocultar la pestaña y al consultar actividad. Los estados vacíos y los errores son reales; no se inventan historias, vistas ni likes. El listado se actualiza cada 30 segundos y la actividad abierta cada 15 segundos.

El autor abre **Ver actividad** para consultar las personas que vieron o dieron like. Cada persona cuenta una sola vez; el autor no genera su propia vista ni puede darse like. La vista se registra cuando carga la imagen, con la pestaña visible. Los likes son reversibles. Los visitantes solo consultan sus propias interacciones; únicamente el autor tiene acceso a la lista completa. Los perfiles privados no publican historias a otras personas mientras su perfil siga privado. Bloqueos y suspensiones también restringen historias y métricas.

**Activación en una base existente:** ejecutar una sola vez `supabase/migrations/202610150007_stories.sql`, después de las migraciones 001–006. La actualización añade tablas, funciones protegidas y el bucket privado `story-images`. No ejecutar de nuevo el instalador inicial. Mientras falte esta migración, la app permite ver el formulario y su vista previa, pero informa que las historias estarán disponibles pronto y no permite publicar.

Las fechas las asigna PostgreSQL: las historias dejan de ser consultables por la API al cumplir exactamente 24 horas, también si el navegador manipula el reloj. La interfaz retira las historias vencidas cada segundo. Las fotos usan URLs firmadas de hasta 60 segundos, limitadas al tiempo restante; un enlace ya emitido puede seguir funcionando hasta su vencimiento aunque después cambien los permisos. Como con cualquier imagen compartida, no se pueden retirar copias ya descargadas. El autor conserva acceso de Storage para limpiar sus propios archivos.

La caducidad no necesita un cron. La limpieza física de las fotos vencidas se intenta al volver a abrir historias con la cuenta del autor, en lotes de hasta 100 archivos; no se promete borrado físico inmediato al cumplirse 24 horas. Las filas vencidas permanecen inaccesibles bajo RLS hasta eliminarlas o borrar la cuenta. Eliminar una historia elimina sus métricas en cascada e intenta borrar la foto por la API de Storage. El flujo de eliminación de cuenta también limpia el bucket de historias antes de borrar la cuenta.

Pruebas con PGlite: expiración, fechas controladas por servidor, acceso anónimo, escrituras directas rechazadas, vistas únicas, autor excluido, likes idempotentes y reversibles, métricas privadas, audiencia de amistades aceptadas, bloqueo, privacidad, suspensión, políticas de Storage y cascadas. Tras aplicar la migración, falta comprobar la subida y las interacciones desde dos cuentas reales. La revisión visual del nuevo visor no pudo completarse porque el control nativo del navegador no devolvió una pantalla utilizable y el navegador integrado no está disponible.

Referencias: [RLS de Storage](https://supabase.com/docs/guides/storage/security/access-control), [archivos privados y URLs firmadas](https://supabase.com/docs/guides/storage/serving/downloads).

## Parties abiertas y planes a futuro

**Partidas → Crear party** permite organizar una ronda para cualquier fecha futura. El formulario sugiere dentro de una semana y tiene accesos a mañana, una semana y dos semanas. Incluye campo, hora de León, 9/18 hoyos, 2–4 jugadores contando al organizador, formato, descripción y condiciones de acceso.

- **Party abierta:** visible para todos los miembros con cuenta. Se unen directamente hasta llenar el grupo, quedan confirmados y entran al chat de la partida. No requiere match ni aprobación del organizador.
- **Con aprobación:** conserva el flujo anterior de solicitudes. Puede ser pública, para matches o por invitación. Las partidas ya existentes mantienen este comportamiento.
- **Explorar partidas:** muestra planes futuros, con filtros por campo, hoy, próximos siete días, días 7–14 o una fecha exacta. El filtro inicial muestra solo lugares disponibles. También hay vista de calendario.
- **Mis planes:** reúne las partidas organizadas y las solicitudes o lugares propios. Incluye planes anteriores cuando el filtro es cualquier fecha.
- Los participantes pueden salir de una partida futura activa o cancelar una solicitud. Salir libera el cupo y retira el acceso al chat; una party llena se reabre. El organizador cancela su partida en lugar de salir.

**Activación:** ejecutar una sola vez `supabase/migrations/202610160008_open_parties.sql` después de las migraciones anteriores. Se proporciona también como **Agregar parties abiertas Fairway.sql** en Matrix. No volver a ejecutar el instalador inicial. La interfaz comprueba que exista `games.join_mode`: si falta, sigue funcionando la creación de partidas futuras con aprobación y muestra que la incorporación directa aún no está activada.

El control de cupo y los cambios de membresía ocurren en PostgreSQL con bloqueo de la fila de la partida. Los clientes no escriben participantes ni miembros del chat directamente. Las incorporaciones son idempotentes, respetan bloqueos y cuentas suspendidas y se cierran al comenzar/cancelar/finalizar. Una solicitud rechazada no puede convertirse en incorporación directa. Unirse a Fairway no reserva tee times ni autoriza el acceso al club: cada jugador confirma que gestionará su acceso.

La sección vuelve a consultar las partidas cada 30 segundos mientras esté visible y al volver a la pestaña; también tiene Actualizar. No depende de agregar tablas a Realtime. Las pruebas de PostgreSQL cubren incorporación para dentro de una semana sin match, cupo lleno, duplicados, aprobación anterior, rechazo, invitaciones, suspensión, bloqueos, salidas, reapertura y acceso al chat. Se comprueban las fechas y límites de filtros en la zona de León, también cerca de medianoche y al cambiar de año. Falta la aceptación con cuentas reales tras activar la migración.
