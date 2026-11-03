# Mejoras de experiencia · 25 de octubre de 2026

## Cambios

1. **Lectura en ambos modos.** `app/readability.css` contiene la paleta compartida de texto, estados, campos, imágenes y controles. Se agruparon reglas consecutivas con declaraciones idénticas, manteniendo su posición en la cascada. `app/accessibility.css` conserva preferencias de movimiento/colores del sistema, reflujo y los ajustes opcionales de tamaño y foco. Desactivar el modo opcional no vuelve a introducir los colores de bajo contraste anteriores.
2. **Preparar la primera ronda.** Una cuenta con disponibilidad vacía ve tres pasos: días/modalidad/estilo, ciudad/club opcional y elección de siguiente acción. El usuario puede omitirlos y retomarlos desde Descubrir. Solo se actualizan `availability`, `holes`, `style`, `city` y `club_id`, con lectura de la fila actualizada. No se solicitan nuevos datos ni se cambia la visibilidad. Un fallo conserva las selecciones; los clics repetidos no duplican el guardado. Cerrar el diálogo durante una petición no provoca navegación al completarse.
3. **Estados vacíos útiles.** Descubrir distingue comunidad sin miembros, perfiles agotados y búsqueda restrictiva. Ofrece ampliar búsqueda cuando corresponde, crear una partida, copiar la invitación a Fairway y abrir el QR/enlace del perfil existente. Si falla el portapapeles, se muestra el enlace seleccionable. No se envían invitaciones automáticamente. Favoritos ya no oculta las tarjetas posteriores a la sexta.
4. **Historial y enlaces.** La navegación usa `pushState` para cambios reales y escucha `popstate` y `hashchange`. Repetir la misma sección no añade entradas. Las partidas se pueden compartir mediante `?partida=UUID#partidas`; se conservan a través del acceso por correo y las redirecciones de autenticación. La URL compartida se construye desde cero, sin tokens ni parámetros del enlace actual. Los UUID se validan y la lectura sigue pasando por Supabase/RLS. Hay carga, error con reintento y ausencia de permisos/registro. No se cambian permisos ni reglas de unión. Los títulos dependen de la sección, aunque su código aún esté descargándose.
5. **Móvil y teclado.** La búsqueda permanece visible en móvil y usa texto de 16 px para evitar ampliación automática al enfocar en navegadores compatibles. Las acciones nuevas se apilan en pantallas estrechas. Los diálogos intentan devolver el foco al control que los abrió o al contenido si ese control ya no existe, sin robar el foco a otro diálogo que los haya reemplazado.
6. **Separación de componentes.** Descubrir y el detalle de partida se descargan al abrirse. Tarjetas de perfiles/partidas, historial, filtros, disponibilidad, galería y elementos de perfil tienen archivos propios. La coordinación de cuenta y navegación permanece en `fairway-app.tsx`; esta es una reducción acotada, no una reescritura completa de la aplicación ni de todas sus hojas de estilo.

## Pruebas automatizadas

```sh
pnpm typecheck
pnpm test
pnpm build
node scripts/check-site-output.mjs
node scripts/check-contrast.mjs --standard
node scripts/check-contrast.mjs
node scripts/measure-performance.mjs out --check
```

Resultado final: **161 pruebas aprobadas**, TypeScript y construcción/exportación correctos, y **50/50 pares de contraste declarados en cada modo**. El JavaScript inicial moderno mide 270,6 KB gzip; fuentes precargadas 225,6 KB, WebP principal 213,2 KB y AVIF de 1024 px 65,2 KB. Los presupuestos existentes pasan; son tamaños de archivos, no tiempos de carga. `fairway-app.tsx` pasó de 3.233 a 2.329 líneas.

Las nuevas pruebas de DOM cubren bloqueo por días vacíos, conservación de elecciones al fallar, reintento, exclusión de guardados duplicados, omisión, navegación posterior al guardar y cierre durante guardado. También se prueban enlaces sin tokens, conservación del destino al autenticar, eliminación de parámetros al cambiar sección, historial real de JSDOM, Atrás/Adelante, títulos y retorno de foco de diálogos. Las pruebas existentes de PostgreSQL continúan verificando las reglas de acceso y las partidas; la API ficticia de navegador no sustituye esas pruebas.

## Reproducción de la revisión de navegador

En dos terminales, desde la raíz de Fairway:

```sh
pnpm test:browser-api
```

```sh
pnpm dev:browser-test
```

Abrir `http://127.0.0.1:3100/`. El script de desarrollo dirige ese proceso únicamente a la API ficticia `127.0.0.1:4101`; no modifica `.env.local`. La API escucha solo en loopback y sus datos viven en memoria. Cuenta de prueba: `golfer@example.test`, contraseña ficticia `fairway-local-fixture`. Nunca usar esta API como backend real ni publicar una compilación con estas variables.

Para demorar respuestas y provocar un fallo recuperable del guardado:

```sh
curl -X POST http://127.0.0.1:4101/__test/control \
  -H 'content-type: application/json' \
  --data '{"delay":300,"failures":{"/rest/v1/profiles":1}}'
```

El fallo se aplica a la próxima petición a esa ruta; para probar el guardado, enviarlo justo antes de guardar. Otros ejemplos de rutas: `/rest/v1/rpc/request_join` y `/rest/v1/rpc/send_message`. `{"reset":true}` restablece los datos, `{"empty":true}` deja solo el perfil propio y quita las partidas, y `{"delay":0,"failures":{}}` quita demora y fallos. La demora es latencia de API simulada, no una medición con ancho de banda limitado. La fixture no implementa SMTP, OAuth ni entrega Realtime; los recorridos comprobados utilizan las lecturas y recargas normales de la aplicación.

## Resultado observado en Chrome

- Viewports de 390 × 844 y 320 × 740 CSS px: sin desbordamiento horizontal de documento en las vistas inspeccionadas. También se comprobó reflujo de escritorio a 1280 × 900.
- Acceso por correo a la cuenta ficticia, apertura automática de preparación, validación de días, cambio de paso, persistencia tras fallo y reintento exitoso hacia Descubrir.
- Búsqueda visible en móvil, resultados vacíos con acciones, copia de invitación y apertura del formulario de partida desde ese estado.
- Atrás cierra detalles de partida y Adelante los recupera. El enlace directo funciona tras recarga, pide cuenta al estar desconectado y vuelve a la partida al iniciar sesión. Un UUID sin registro muestra «Partida no disponible». Se comprobó la copia del enlace limpio.
- Unión a una partida con fallo y reintento; apertura del chat de esa partida; envío ficticio con fallo, borrador conservado y reintento que muestra el mensaje y limpia el campo.
- Apertura de filtros por teclado y cierre con Escape. La restauración de foco se verifica adicionalmente en la prueba de DOM dedicada.

**Límites:** la extensión rechazó `fileChooser.setFiles` por no tener acceso a archivos locales. Se abrió el editor y se inspeccionaron sus controles, pero no se completaron selector, decodificación/canvas ni subida en navegador. Para habilitar esa prueba, la extensión de ChatGPT en Chrome necesita «Allow access to file URLs». No se subieron fotos personales ni se cambiaron esos permisos. La suite conserva las pruebas de preparación, subida y políticas de imágenes existentes.

No se verificaron registro/confirmación por correo real, SMTP, OAuth de Google, Realtime real, dispositivos táctiles físicos, Safari/iOS, lectores de pantalla, Lighthouse ni métricas LCP/CLS/INP. Esta revisión no acredita conformidad WCAG completa ni un despliegue público nuevo.
