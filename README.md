# Fairway

Para clonar el proyecto y trabajar en equipo, consulta [la guía de colaboración](CONTRIBUTING.md).

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
   - `supabase/migrations/202610160009_moderation.sql`
   - `supabase/migrations/202610160010_moderation_everywhere.sql`
   - `supabase/migrations/202610170011_google_auth.sql`

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

- Registro con correo y contraseña, confirmación, login, recuperación y cambio de contraseña mediante Supabase Auth. Acceso con Google al activar el proveedor, con nombre, edad y consentimiento antes de habilitar el perfil. Alta limitada a 18+ tanto en formulario como en base de datos.
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

Quedan para fases posteriores: retos, push, recomendaciones avanzadas, integración con clubes, subida de fotos a publicaciones, guardado de publicaciones, compartir perfiles/invitaciones dentro del chat, evolución histórica del handicap declarado y filtros de descubrimiento por hora, experiencia o múltiples clubes. La disponibilidad rápida sí permite fechas y horarios. El directorio no anuncia conteos totales públicos: solo perfiles visibles bajo RLS. Los logros actuales son Primera ronda, 10 rondas y Primer birdie, derivados de registros.

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

## Recuperación de contraseña y regreso con sesión activa

Fairway espera a que Supabase termine de recuperar la sesión antes de mostrar una pantalla. Los visitantes ven la portada y los miembros entran a la aplicación, también al abrir `#inicio`. Los enlaces a partidas, amigos y otras pantallas mantienen su destino.

**Olvidé mi contraseña** abre un formulario de correo independiente: valida la dirección, muestra el progreso, permite reintentar después de 60 segundos y comunica errores reales del proveedor. El enlace vuelve a `/?recovery=1`. La app conserva la intención de recuperación antes de que Supabase consuma el fragmento de la URL y escucha `PASSWORD_RECOVERY`. La pantalla de contraseña tiene prioridad sobre el perfil y el onboarding, exige una sesión y dos contraseñas coincidentes de al menos 10 caracteres, y solo anuncia éxito si `updateUser` termina sin error. Un enlace inválido o vencido permite pedir otro. Terminar o cancelar limpia los parámetros de autenticación sin borrar un perfil compartido.

Los formularios de alta y reenvío de confirmación conservan `emailRedirectTo` al dominio público. Iniciar sesión acepta la contraseña existente aunque tenga menos de 10 caracteres; el mínimo de 10 se exige al crear o cambiar una contraseña. Los fallos de conexión liberan el botón para reintentar.

La entrega depende también de **Supabase → Authentication → Email / SMTP Settings**. El [SMTP predeterminado de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) solo envía a direcciones del equipo del proyecto y tiene límites de prueba; para enviar a usuarios públicos hay que configurar SMTP propio. Las plantillas Confirm signup, Reset password y Magic Link deben usar `{{ .ConfirmationURL }}`. No deben contener enlaces fijos ni seguimiento que modifique el enlace. Mantener la confirmación de correo activada.

La verificación del backend público confirmó que Email y Google están habilitados y que un enlace de recuperación inválido regresa al dominio público con `recovery=1` y el error correspondiente. Las pruebas de regresión cubren rutas con sesión activa, limpieza del callback, solicitud real del SDK con transporte simulado, fallos de entrega y validación de la nueva contraseña. Un HTTP 200 al solicitar un correo no prueba que llegó a la bandeja: confirmar recepción, abrir el mensaje más reciente y cambiar la contraseña requiere una prueba con el propietario. No se almacenan contraseñas ni enlaces de recuperación en el repositorio.

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

## Calendario mensual de parties

**Partidas** abre ahora un calendario mensual de lunes a domingo. Puedes avanzar o retroceder meses, regresar a Hoy y filtrar por campo o por lugares libres. Por defecto muestra todas las parties visibles para tu cuenta durante el mes, incluidas las completas, anteriores y canceladas, con estados diferenciados. **Mis planes** aplica el filtro de organización o participación al calendario. La vista Tarjetas conserva los filtros por periodos.

Seleccionar un día abre debajo su agenda completa. Las celdas de escritorio muestran hasta dos parties y un enlace con el número restante; la agenda nunca corta la lista del día. En móvil, las celdas muestran conteos y puntos de estado y la agenda presenta horarios, campo, organizador, descripción y cupos. Seleccionar una party abre el detalle existente, desde el cual puedes unirte si está activa y hay cupo, solicitar aprobación cuando corresponda o abrir tu grupo si ya participas.

**Crear para este día** abre el formulario con la fecha elegida. La fecha se conserva en el calendario y, tras publicar, se abre el chat de la party. La fecha seleccionada también se conserva al consultar o unirse a una party. El calendario admite flechas para moverse por días o semanas, Page Up/Down para cambiar de mes y Home/End para los extremos de la semana.

Esta actualización no añade tablas ni requiere SQL nuevo. Consulta los eventos del mes por páginas de 200 registros bajo las mismas políticas RLS, con actualización cada 30 segundos al estar visible; no depende del límite de la lista general de partidas. Los detalles se consultan por ID y se actualizan mientras están abiertos. Las nuevas pruebas cubren semanas completas, meses de 28/35/42 celdas, años bisiestos, cambio de año, orden de eventos y límites de mes en la zona horaria de León. La compilación local y la respuesta HTTP se verifican por separado de la revisión visual; el control nativo de Chrome no respondió a la navegación de prueba.

## Chat automático de cada party

La creación de una partida y la de su chat privado ocurren en la misma transacción mediante el trigger `init_game`. El organizador entra inmediatamente; cada participante confirmado se añade al mismo chat, ya sea al unirse directamente a una party abierta o cuando el organizador aprueba su solicitud. Las personas con solicitud pendiente o rechazada no acceden a la conversación. Salir del grupo retira el acceso al chat con las reglas de la migración 008. Cada partida tiene un único chat y conserva su propio historial.

Al publicar una party, Fairway abre su chat. Al unirse directamente también se abre el grupo. La pantalla de detalles incluye **Abrir chat de la party** para volver a entrar. El acceso consulta la conversación por `game_id` bajo RLS, por lo que no depende de que el chat ya figure en la caché de Mensajes. Si no puede abrirlo, muestra un aviso y conserva la party creada o la incorporación confirmada.

En **Mensajes** los grupos se distinguen de los matches, muestran campo y fecha, lista de participantes y autor de cada mensaje. Los chats recién creados muestran un estado vacío real, sin mensajes inventados. Se actualiza la lista de conversaciones cada 20 segundos al estar la página visible, además del Realtime existente de mensajes y notificaciones. Las actualizaciones en segundo plano y el envío de mensajes conservan la pantalla montada para no interrumpir la escritura. Cambiar de conversación limpia el borrador para evitar enviarlo al grupo equivocado.

No requiere SQL nuevo: utiliza la creación y las membresías de chat ya instaladas. Las pruebas de PostgreSQL comprueban chat único desde la creación, organizador incluido, historial compartido entre confirmados, separación de historiales entre parties, incorporación tras aprobación y rechazo de acceso para terceros o participantes que ya salieron. La consulta anidada de conversaciones con datos de la partida se comprobó contra la API real sin credenciales de usuario: Supabase reconoce las relaciones y rechaza el acceso anónimo. Falta la aceptación de la interfaz y Realtime con dos cuentas reales; no se han publicado parties ni enviado mensajes reales para probar esta mejora.


## Acceso con Google

El botón **Continuar con Google** está disponible tanto en Iniciar sesión como en Crear cuenta. Usa Supabase Auth y vuelve al mismo dominio, conservando el perfil compartido por QR cuando existe. En la primera visita se piden nombre, edad de 18 a 100 años y aceptación de privacidad. Google no proporciona la edad: no se inventa una ni se crea un perfil público antes de completar este paso. Hasta entonces no existe un rol activo y RLS bloquea el acceso a los perfiles y la actividad de miembros. Los registros por correo conservan su flujo actual.

Para activarlo en la instancia publicada:

1. Ejecuta **una sola vez** `supabase/migrations/202610170011_google_auth.sql`, después de las migraciones anteriores. Si tu base ya está actualizada hasta 010, ejecuta únicamente 011. No vuelvas a ejecutar el instalador inicial.
2. En [Google Auth Platform](https://console.cloud.google.com/auth/overview), configura la aplicación Fairway (branding, público y datos de contacto). Solicita solo `openid`, correo y perfil. Si está en modo Testing, agrega las cuentas de prueba; para abrirlo al público, cambia el estado de publicación según los requisitos de Google.
3. Crea un cliente OAuth de tipo **Web application**. Agrega como origen `https://fairway-leon-golf.honeyring4.chatgpt.site` y, para desarrollo, `http://localhost:3000` (también `http://127.0.0.1:3000` si lo utilizas).
4. En **Supabase → Authentication → Sign In / Providers → Google**, copia la URL de callback (`https://TU-PROYECTO.supabase.co/auth/v1/callback`) y agrégala en **Authorized redirect URIs** del cliente de Google. Esta URL pertenece a Supabase, no al frontend.
5. Copia **Client ID** y **Client Secret** de Google en ese proveedor de Supabase, habilítalo y guarda. El secreto se configura solo en Supabase: no lo agregues al código, a Git ni a variables `NEXT_PUBLIC_*`.
6. En **Supabase → Authentication → URL Configuration**, mantén la web pública como Site URL y permite `https://fairway-leon-golf.honeyring4.chatgpt.site/**`, además de los orígenes locales que utilices. Publica el frontend actualizado.
7. Prueba con una cuenta nueva de Google: selección de cuenta, regreso a Fairway, rechazo de edades menores de 18, aceptación de privacidad, perfil, cierre de sesión y nuevo acceso. Prueba también cancelar el consentimiento y abrir un QR antes de entrar. Si existe una cuenta con el mismo correo verificado, comprueba que Supabase vincula la identidad y conserva el perfil existente.

Antes de activar el proveedor, el botón muestra un aviso y permite seguir usando correo y contraseña. La configuración de Google Cloud/Supabase y un acceso real requieren las cuentas del propietario; las pruebas locales no activan el proveedor ni publican la aplicación.

Para eliminar una cuenta creada con Google, crea primero una contraseña desde **Ajustes → Crear o cambiar contraseña**. Después utiliza Eliminar mi cuenta: se mantienen la verificación de contraseña reciente, el enlace nuevo por correo y la confirmación final escribiendo ELIMINAR.

Referencias: [Google con Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirecciones](https://supabase.com/docs/guides/auth/redirect-urls), [vinculación de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking).


## Landing pública de Fairway

La portada para visitantes (`/`, `#descubrir` y `#inicio`) usa una composición editorial independiente de la interfaz de miembros: tipografía amplia, crema con grano de papel, verde profundo y un acento amarillo de lápiz, fotografía ilustrativa en WebP y una vista interactiva que permite combinar 9/18 hoyos, estilo y momento para jugar. El plan es un ejemplo claramente identificado; no crea partidas ni realiza reservas. El directorio utiliza la consulta pública existente. Las llamadas a crear cuenta e iniciar sesión abren los formularios actuales, incluido Google. Al reabrir la web, Fairway espera a recuperar la sesión antes de mostrar la portada. Una sesión activa entra a Descubrir incluso si el enlace contiene `#inicio`; las demás pantallas enlazadas se conservan.

Incluye navegación móvil, enlace para saltar al contenido, controles de selección con `aria-pressed`, resultados anunciados con `aria-live`, preguntas desplegables nativas y animaciones breves. Las entradas al hacer scroll usan IntersectionObserver; la información sigue visible cuando no hay soporte. `prefers-reduced-motion` desactiva el movimiento. No se agregaron dependencias ni cambios en Supabase.

La portada conserva el titular con serif únicamente en el hero. El resto usa preguntas y detalles concretos, sin cejas numeradas ni columnas de iconos. Una nota de Fer y una tarjeta de nueve hoyos sin anotar reemplazan esa estructura. Fer, Ana, Mau y sus partidas son ejemplos ficticios, identificados como tales. La referencia a una guacamaya después de jugar se basa en la [gastronomía tradicional documentada por el municipio de León](https://www.leon.gob.mx/comida-tipica.php).

Criterios consultados: [NNGroup: principios de una homepage](https://www.nngroup.com/articles/homepage-design-principles/), [web.dev: animaciones eficientes](https://web.dev/articles/animations-guide), [web.dev: preferencias de movimiento reducido](https://web.dev/articles/prefers-reduced-motion), [W3C: pausar, detener u ocultar movimiento](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html).

Fotografía principal: [Keith Tanner en Unsplash](https://unsplash.com/photos/aerial-view-of-a-beautiful-golf-course-4WSLeNydrlo). Fotografía de swing: imagen de Unsplash ya utilizada por Fairway (`photo-1535131749006-b7f58c99034b`). Son imágenes ilustrativas; no representan un club de León ni miembros reales. Se sirven desde `public/images` en WebP para evitar descargas de terceros durante la visita.


Validación de la landing: TypeScript y compilación estática correctos, 92 pruebas aprobadas y respuesta HTTP 200 de la portada local. La inspección visual e interacción en navegador de escritorio/móvil quedan sin verificar: el control de Chrome no respondió durante esta actualización. No se simularon inicios de sesión ni se crearon partidas reales como prueba.

## Accesibilidad

Los controles usan formas según su función: las acciones principales conservan la silueta de píldora; los botones secundarios usan rectángulos de esquinas suaves, y las acciones discretas o de borrado tienen esquinas más rectas. Este criterio se mantiene en ambos modos visuales.

El diseño anterior es el predeterminado. En **Ajustes → Accesibilidad → Modo de accesibilidad** se puede activar mayor contraste, texto más legible e indicadores de foco destacados. También hay un control en la página pública y en recuperación de contraseña. La preferencia se guarda en este navegador, se aplica antes de mostrar la página y se sincroniza entre pestañas; no depende de la cuenta.

Las etiquetas/errores de formularios, navegación por teclado, anuncios del chat y resultados, estados de controles, tablas de scores y preferencias del sistema de movimiento/colores forzados permanecen activos en ambos modos. Consulta el [informe de accesibilidad](docs/accessibility.md) para las mediciones del modo activado, comprobaciones automatizadas y pruebas manuales pendientes. La revisión no equivale a una declaración de conformidad WCAG del sitio completo.

## Metadatos, rastreo y publicación

La identidad pública y URL canónica viven en `lib/site.ts`. La portada incluye título/descripción en español, canonical, Open Graph/Twitter con una imagen propia de 1200×630 y datos estructurados `WebSite`. Se generan `/robots.txt` y `/sitemap.xml`; este último solo enumera la portada pública. Los perfiles, chats y enlaces de recuperación no se incluyen. Los estados de la app usan fragmentos y no son páginas independientes para buscadores.

La página 404 tiene texto en español, una acción para volver a Fairway y `noindex`. La comprobación de sesión mantiene un encabezado y descripción útiles en el HTML inicial, sin mostrar la app privada antes de autenticar. El contenido completo y las funciones de Fairway requieren JavaScript. Se conserva el retorno directo de usuarios con sesión iniciada.

Las estadísticas y Recharts se cargan bajo demanda. Los mapas de código fuente del navegador están desactivados para producción. Los títulos de las pantallas de la app siguen actualizándose; al volver a la portada se restaura el título público. El favicon y las descripciones de imágenes existentes se mantienen; las imágenes decorativas conservan `alt=""`.

Después de compilar, ejecutar `node scripts/check-site-output.mjs` para validar el HTML exportado, canonical, metadatos sociales, dimensiones de la imagen, JSON-LD, 404, sitemap, robots y ausencia de `.map`. `node scripts/generate-social-image.mjs` regenera la imagen pública sin usar datos de miembros ni servicios externos.

No se inventa una dirección de negocio ni se usa schema `LocalBusiness`: Fairway es una plataforma de golf, no un club físico. Conectar un dominio propio requiere elegir/proporcionar el dominio y acceso a su DNS; después se debe actualizar `lib/site.ts` y las URLs autorizadas de autenticación. No se añadieron `llms.txt` ni páginas artificiales para los estados privados. El navegador controlable no estuvo disponible: quedan pendientes la consola real, navegación móvil/escritorio y comprobar la respuesta HTTP 404 del hosting para una ruta inexistente. Las comprobaciones de compilación no sustituyen estas pruebas.

Referencias: [Next.js: metadatos y OG](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [Google: nombres de sitio y WebSite](https://developers.google.com/search/docs/appearance/site-names), [Google: estructura de URLs y fragmentos](https://developers.google.com/search/docs/crawling-indexing/url-structure).

## Biografía del perfil

En **Mi perfil**, la biografía aparece bajo la cabecera y permanece visible al cambiar de pestaña. **Añadir bio / Editar bio** abre un editor de hasta 500 caracteres con contador, saltos de línea y opción de dejarla vacía para eliminarla. El guardado rápido actualiza únicamente `profiles.bio`, sin exigir completar los demás campos del perfil. También se puede editar desde el formulario completo. Los perfiles de otros jugadores muestran su biografía cuando existe, respetando las reglas de visibilidad y bloqueos del perfil. Se conserva el campo existente y su límite en Supabase, sin migración nueva.

## Calificaciones de compañeros

En **Partidas**, el organizador abre su partida y selecciona **Finalizar partida** cuando ya ocurrió. Los participantes confirmados pueden abrirla y usar **Califica a tus compañeros** para elegir de 1 a 5 estrellas, con comentario opcional. El aviso de calificaciones pendientes permite llegar a las partidas finalizadas sin buscarlas en el calendario. Al enviar una calificación, se vuelve a la partida para poder calificar al resto del grupo.

El perfil propio y el perfil de cada compañero visible muestran las estrellas, el promedio y la cantidad de calificaciones recibidas. Sin votos se muestra «Sin calificaciones todavía». Los promedios se vuelven a consultar al abrir un perfil o regresar a la pestaña. Las tarjetas del directorio conservan el resumen numérico con su etiqueta accesible.

La base de datos permite una sola calificación por pareja de personas y partida, entre participantes confirmados de partidas finalizadas; rechaza autoevaluaciones, valores fuera de 1–5 y duplicados. La interfaz también bloquea envíos repetidos y muestra «Calificado» cuando corresponde. Se respetan la visibilidad de perfiles y los bloqueos existentes. La app comprueba los registros de participación, no verifica físicamente que la ronda se haya jugado.

Este cambio utiliza `reviews` y `rating_summary()` existentes, sin migración SQL nueva. El selector global guarda el mismo valor en las cuatro categorías históricas para que el cálculo actual del servidor produzca exactamente la estrella elegida; las reseñas anteriores y su promedio se conservan. Las pruebas cubren permisos y promedios en PostgreSQL/PGlite, elegibilidad, límites, estados sin votos y controles de estrellas con radios nativos. El recorrido con cuentas reales y la revisión visual en navegador siguen pendientes; no se insertaron calificaciones de prueba en producción.

## Elementos del campo en la interfaz

El planificador ilustrativo de la landing incluye **tee box, fairway, rough, bunker, green y hazards**. Sus seis botones permiten resaltar cada parte y leer una explicación breve en español; la selección usa `aria-pressed`, foco visible y un anuncio de estado. Es una ilustración de ejemplo, no el plano real de un club.

Los mismos iconos SVG aparecen de forma puntual en la app: tee box para crear una partida, fairway en el descubrimiento, rough en el panel de juego para hoy, bunker en resultados vacíos de partidas, green junto al resumen de scores y calificaciones tras jugar, y hazards en la sección de eliminación de cuenta. Los nombres de las acciones siguen siendo explícitos. No se añadieron campos de datos de bunker/rough/penalizaciones a las tarjetas ni se modificaron reglas de puntuación.

Los gráficos se dibujan en SVG, sin imágenes externas nuevas. Las pruebas comprueban los controles, su estado inicial, la explicación asociada y la independencia de identificadores entre diagramas. La ilustración se revisó mediante un render del SVG; la composición final y las interacciones en navegador de escritorio/móvil siguen pendientes de verificación.

El elemento seleccionado del menú lateral usa una silueta verde orgánica con franjas de fairway y un pequeño green con bandera. El tratamiento sigue la selección en las secciones principales, scores, estadísticas, clubes, ajustes/privacidad, administración y el acceso a juego para hoy. Los contadores de notificaciones tienen prioridad sobre la bandera para mantener espacio legible. El fondo es un SVG ligero compartido; en colores forzados se usa el resaltado del sistema. El texto claro supera 6.5:1 sobre todos los colores del dibujo. La composición en un navegador real sigue sin verificar.

Las calificaciones incluyen un pequeño vaso de cerveza junto a las estrellas y al promedio, tanto en las tarjetas de jugadores como en los perfiles. El nivel corresponde al promedio dividido entre cinco: 1 estrella = 20 %, 2.5 = 50 % y 5 = 100 %. Sin calificaciones el vaso aparece vacío con el texto habitual. Es una representación visual del mismo dato; no añade un criterio ni modifica el cálculo de las calificaciones. El SVG es decorativo para lectores de pantalla y conserva el promedio numérico como alternativa. Las pruebas cubren niveles, valores ausentes/inválidos e identificadores independientes al mostrar varios vasos. Se revisaron renders de los cinco niveles; falta comprobar la composición en un navegador real.

## Estados de interacción

Los acentos azules usan `--accent-blue`, `--accent-blue-wash` y `--accent-blue-line`: enlaces de acción, botones secundarios de encabezados/ubicación/Google, el selector de ciudad y pequeñas marcas de sección. La portada los incorpora en las cejas, la flecha circular y la tarjeta del planificador. El crema y verde siguen siendo la base, con sus acciones principales y el campo del menú lateral. El texto azul tiene entre 6.29:1 y 7.02:1 sobre los fondos usados, y los bordes azules entre 3.32:1 y 3.70:1. Son cálculos de colores declarados; la composición visual en navegador sigue pendiente.

La referencia deportiva se incorpora de forma puntual: dos títulos de la portada con mayor peso y un acento lima bajo una palabra, fotografías con esquinas más suaves y una flecha circular delineada dentro de la acción principal. En la app, las cejas de los títulos reciben una pequeña marca azul. Se mantienen la base crema/verde y las estructuras existentes; los acentos son decorativos.

`app/interactions.css` unifica el feedback de botones principales/secundarios, iconos, pestañas, navegación lateral, acciones de tarjetas, contactos del chat, menús de cuenta, acciones sociales, calendario, campos editables y enlaces. Los botones reciben un movimiento de 1 px y sombra corta; las tarjetas se acentúan al interactuar con sus acciones; los enlaces usan subrayado. Se conserva el dibujo de campo del elemento lateral seleccionado y los estados ya elegidos de pestañas y filtros.

El foco de teclado recibe feedback equivalente sin exigir ratón. Las mejoras de hover se limitan a dispositivos con hover y puntero fino; las preferencias de movimiento reducido suprimen el desplazamiento, y los botones deshabilitados no reciben el tratamiento de hover de botones activos. El CSS de accesibilidad continúa cargándose al final. La conexión de interfaz del navegador agotó su tiempo de espera durante esta revisión, por lo que queda pendiente la inspección visual de los estados en escritorio y móvil.

## Ciudad y ubicación opcional

El formulario para completar o editar el perfil permite escribir la ciudad, con León como valor inicial y sugerencias de ciudades. Se abre al completar el alta cuando aún no se ha indicado disponibilidad. También se accede desde **Mi perfil → Editar**, **Ajustes → Editar perfil, ciudad y privacidad**, o el botón de ciudad de la barra superior. Se utiliza `profiles.city`, que ya existe y permite que cada usuario actualice su propio perfil; no hace falta una migración ni claves nuevas.

La pregunta **¿En qué ciudad sueles jugar?** también aparece al crear una cuenta por correo y al completar el alta con Google, con entrada manual y el botón de ubicación opcional. La ciudad elegida se conserva en los metadatos privados de Auth como `signup_city`, por lo que no se pierde al confirmar el correo más tarde o desde otro dispositivo. En la primera carga autenticada se copia a `profiles.city` únicamente si el perfil sigue con la ciudad inicial León y aún no tiene disponibilidad. La actualización comprueba ambas condiciones de forma atómica; no reemplaza ciudades personalizadas ni perfiles ya completados. Google guarda la misma elección antes de activar el perfil y aplica la ciudad al terminar. Se mantienen el RPC de edad/consentimiento y las reglas de acceso existentes, sin una migración SQL nueva.

Si falla el guardado inicial de ciudad, la carga de la cuenta continúa con un aviso y acceso a Editar perfil para corregirla; el error no bloquea el acceso a la cuenta.

Al abrir **Tu perfil de golfista** para completar un perfil nuevo se solicita permiso de ubicación automáticamente una vez por cuenta y navegador. Si se acepta, la ciudad se rellena y sigue siendo editable; si se rechaza o falla, se muestra la entrada manual con sugerencias. Se guarda un marcador sin ciudad ni coordenadas para evitar nuevas solicitudes al reabrir el formulario; si el almacenamiento está bloqueado, la protección dura mientras la página siga abierta. Los perfiles ya completados y la vista demo no activan la solicitud automática. En el registro por correo y Google se conserva el botón opcional **Usar mi ubicación**; no se pide permiso automáticamente en esas pantallas.

La detección obtiene una ubicación puntual, sin seguimiento. Las coordenadas se redondean a dos decimales antes de enviarlas desde el navegador a BigDataCloud. En el perfil nuevo el resultado rellena el campo; en los demás formularios la sugerencia se acepta o descarta. Guardar conserva únicamente la ciudad en Supabase. No se guardan coordenadas en Fairway. Si se niega el permiso, falla el proveedor o se agota el tiempo, se mantiene la entrada manual y no se consulta la ubicación por IP. Se puede cancelar la espera y elegir la ciudad; una respuesta tardía no reemplaza lo escrito manualmente. El aviso del proveedor aparece en el formulario, y la información de privacidad describe este uso.

El club principal y los clubes adicionales del formulario se filtran según la ciudad elegida o detectada. Las ciudades del catálogo alimentan las sugerencias, de modo que añadir clubes de más ciudades en Supabase actualiza estas opciones sin cambiar código. Se conservan los clubes ya elegidos aunque pertenezcan a otra ciudad, y «Ver también clubes de otras ciudades» permite elegirlos. No se selecciona una membresía por ubicación. Si no hay clubes en la ciudad, se puede guardar el perfil sin club.

**Ciudad para explorar** empieza en «Mi ciudad» y se comparte entre Descubrir, Partidas y Clubes; permite ver las demás ciudades presentes en el directorio o «Todas las ciudades» sin cambiar el perfil. La barra superior muestra el filtro activo. Descubrir filtra jugadores por su ciudad; las partidas, su calendario mensual y la disponibilidad temporal se clasifican por la ciudad del campo. Favoritos, la agenda propia y las calificaciones pendientes conservan el acceso a personas y partidas de otras ciudades. Comunidad sustituye la pestaña fija León por «Mi ciudad».

La comparación ignora mayúsculas y acentos y unifica los nombres habituales de León. Los clubes de «Alrededores de León» comparten esa categoría; «Por confirmar» queda sin clasificar y se muestra al consultar todas las ciudades. La agrupación usa nombres de ciudad, no distancias ni límites municipales verificados. Viajar no cambia automáticamente la ciudad. Las horas de las partidas conservan la zona de León y su etiqueta UTC−6; esta actualización no añade zonas horarias por campo.

Referencias de implementación: [MDN: geolocalización y permiso en HTTPS](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) y [BigDataCloud: API de ciudad desde el navegador](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api). Las pruebas cubren entrada manual, normalización, errores, cancelación, ausencia de consulta tras denegar permiso, coordenadas aproximadas, filtros del calendario y permisos de guardado en PostgreSQL/PGlite. Chrome no respondió al control de interfaz: quedan pendientes el permiso real de ubicación, la respuesta del proveedor desde un navegador y la revisión visual en móvil/escritorio.
