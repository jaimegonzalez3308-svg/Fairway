# Fairway: app y servicios de iOS

Estado del 2 de noviembre de 2026. El código local no equivale a servicios de Apple activados ni a una publicación en App Store.

## Cobertura

| Área | Implementado | Pendiente |
| --- | --- | --- |
| Navegación | Cinco pestañas, drawer, Volver, swipe desde el borde, pull to refresh y botón Actualizar | Pruebas táctiles en iPhone |
| Listas | Swipe para marcar conversación leída y botón equivalente | Verificar interacción con VoiceOver |
| Inicio | Tres pasos, omitir, entrada compacta al volver; sesión existente entra directamente | Sin portada comercial en iOS |
| Accesibilidad | 44 puntos táctiles, safe areas, teclado, foco en títulos, historias pausadas con VoiceOver, movimiento reducido | Hardware, texto grande y tamaños distintos |
| Offline | Perfil propio, clubes y hasta 100 scores propios durante 24 h; cola de 20 borradores nuevos privados | Sesión recuperable; no prolonga una sesión vencida |
| Sesión | Refresh tokens de Supabase en Keychain, migración desde almacenamiento anterior | Verificar restauración y revocación en teléfono |
| Biometría | Bloqueo opcional al salir; Face ID/Touch ID y código alternativo | Biometría configurada en el iPhone |
| Google | Hoja del sistema, PKCE y retorno | Allowlist de Supabase y acceso real |
| Apple | Autenticación nativa, nonce, alta con edad/consentimiento y control de revocación | Equipo/capability de Apple, proveedor Supabase, SQL y función de borrado |
| Eliminación | Contraseña/correo existentes; Apple exige reautenticación, revocación y borrado | Desplegar/verificar la ruta de Apple antes de activarla |
| Push | Explicación previa, permiso al pulsar, registro por cuenta, outbox, APNs, preferencias y badge | Firma, APNs, SQL, secretos y programador |
| Links | Router verificado para widget/avisos y enlaces de perfil/partida | Universal Links necesita Team ID, entitlement y AASA publicado |
| Permisos | Cámara/Fotos al elegir foto; ubicación solo al pulsar su botón | Probar permisos reales |
| Compartir/Contactos | Hoja nativa e invitaciones por enlace | Sin importar agenda ni solicitar acceso innecesario a contactos |
| Widget | Extensión pequeña/mediana: Scores y Partidas, sin datos personales | Añadir y probar ambos tamaños |
| Rendimiento | Marketing fuera del bundle inicial, pantallas diferidas, esqueletos, imágenes normalizadas y esperas de red acotadas | Medir arranque/scroll en dispositivos y redes lentas |
| Pagos | No hay productos, checkout ni suscripciones activos | Definir productos/regiones antes de StoreKit; no se inventó un paywall |

## Offline y seguridad

`lib/native-offline.ts` guarda copia y cola en Keychain, asociadas al usuario y proyecto Supabase. No incluye perfiles ajenos, chats, historias, fotos, enlaces firmados ni permisos administrativos. La copia vence a las 24 horas. Un rechazo de permisos online no se sustituye por la copia: se restaura solo ante fallo de red.

Las tarjetas nuevas guardadas como borrador en iOS se conservan primero en el dispositivo y siempre son privadas. Con conexión se sincronizan inmediatamente; sin ella se reintenta al reconectar o volver al primer plano. Un UUID estable evita duplicados tras una respuesta perdida. Los errores conservan la tarjeta. Scores/Ajustes permiten leer los hoyos, reintentar y eliminar la copia local. Eliminar esa copia no cancela una petición ya recibida por el servidor.

No se encolan mensajes, cupos de partidas, likes, pagos ni publicaciones. No hay edición offline de rondas existentes ni fusión de cambios entre dispositivos. Los borradores sincronizados aparecen como scores de la misma cuenta en la web.

Cerrar sesión elimina copia y borradores pendientes; se avisa antes si hay scores por subir. Cambiar de cuenta impide reproducir acciones del usuario anterior. Una sesión vencida o revocada puede requerir internet para entrar.

`FairwayDevicePlugin` usa `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, sin iCloud. El primer arranque tras reinstalar limpia el Keychain que pudiera haber sobrevivido. `ios.loggingBehavior: "none"` evita imprimir respuestas de plugins con tokens o datos privados. Los tiempos de expiración de Supabase siguen iguales.

La biometría desbloquea una sesión existente; no reemplaza la identidad de Supabase. Una pantalla nativa cubre el contenido al pasar al fondo y antes de mostrar un arranque protegido. Hay código del dispositivo como alternativa.

## Capacidades y Universal Links

No hay Team ID configurado. El build básico sigue funcionando en simulador sin capacidades pagadas ficticias. Con el equipo real:

```bash
pnpm ios:services --team TU_TEAM_ID --host tu-dominio.example --dry-run
pnpm ios:services --team TU_TEAM_ID --host tu-dominio.example
```

Sustituir `TU_TEAM_ID` por los 10 caracteres reales de Membership details. El comando prepara `App.entitlements`, el equipo de App/FairwayWidgets y `public/.well-known/apple-app-site-association`. Conserva capacidades y asociaciones anteriores. Por defecto prepara Apple y links; `--no-apple` / `--no-links` omiten una capacidad nueva. No cambia el portal ni publica. Si se usa `--app-id`, actualizar también `appId` en Capacitor.

Añadir `--push` solo después de desplegar y verificar su backend: activa `FairwayPushEnabled` y APNs. Debug usa `development`; Release, `production`. Habilitar las capacidades correspondientes del App ID en Apple Developer y revisar la firma de ambos targets.

El AASA debe publicarse en el dominio de `lib/site.ts` y del entitlement, por HTTPS, sin redirección, como JSON válido en `/.well-known/apple-app-site-association`. Verificar la respuesta real y la asociación de Apple. No se publicó el sitio ni un AASA con un equipo inventado.

El router acepta ese origen HTTPS o `com.fairway.app://open?screen=...`, páginas conocidas y UUID válidos. Rechaza tokens, callbacks de autenticación y destinos arbitrarios. Los permisos del backend siguen aplicándose. Google mantiene su callback exclusivo `com.fairway.app://auth/callback` en la hoja de autenticación.

## Activar Apple y push

1. Revisar/aplicar las migraciones previas y `202611020013_native_services.sql`. `apple_ready` y `push_ready` comienzan en `false`; los clientes no pueden activarlas ni leer registros o secretos de dispositivos.
2. Configurar el proveedor Apple de Supabase con el bundle ID nativo y la capability del mismo App ID. Conservar el proveedor/callback HTTPS de Google.
3. Con un CLI autenticado al proyecto correcto, desplegar `supabase functions deploy delete-apple-account` y `supabase functions deploy push-dispatch`.
4. Guardar secretos en Supabase Edge Function Secrets, nunca en `NEXT_PUBLIC_*`, Git o el bundle:

   | Secreto | Uso |
   | --- | --- |
   | `APPLE_TEAM_ID`, `APPLE_BUNDLE_ID` | Equipo y bundle reales |
   | `APPLE_SIGN_IN_KEY_ID`, `APPLE_SIGN_IN_PRIVATE_KEY` | Clave de Sign in with Apple para canjear/revocar |
   | `APNS_BUNDLE_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY` | Topic de la app y clave APNs `.p8` |
   | `PUSH_DISPATCH_SECRET` | Secreto aleatorio de al menos 32 caracteres para el programador |

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` pertenecen al runtime servidor y no se copian a iOS. Las claves Apple de ambos servicios pueden ser diferentes.

5. Programar POST a `/functions/v1/push-dispatch` cada minuto con `Authorization: Bearer <PUSH_DISPATCH_SECRET>`. Guardar el secreto en Vault o el gestor del programador, sin SQL versionado que lo exponga. La función rechaza llamadas sin él. `delete-apple-account` verifica cada bearer con `Auth.getUser`, sin depender de la comprobación JWT heredada del gateway.
6. Después de probar con cuentas desechables, habilitar únicamente el servicio verificado desde una sesión administrativa:

   ```sql
   update public.native_service_configuration set apple_ready = true where singleton;
   -- Después de comprobar APNs, el registro y el programador:
   update public.native_service_configuration set push_ready = true where singleton;
   ```

7. Para push, preparar capacidades locales con `--push`, ejecutar `pnpm ios:sync`, firmar e instalar. El usuario activa los avisos en **Ajustes → Tu iPhone**. No hay petición al arrancar.

Los push son genéricos: sin nombres, contenido de mensajes, fotos o tokens de sesión. El badge cuenta pendientes y se actualiza al abrir la app. El outbox respeta destinatario, suspensión, preferencias, lectura y antigüedad, con leases y máximo cinco intentos. Cerrar sesión desconecta avisos, retira los entregados y conserva una capacidad secreta para revocar al reconectar. Cambiar de cuenta desconecta el registro anterior. APNs 410 elimina registros caducados; el dispatcher purga colas antiguas.

Apple exige confirmación escrita y código de autorización nuevo. El backend verifica firma RSA/JWKS, nonce, audiencia, caducidad y cuenta coincidente; revoca el refresh token antes de borrar fotos y cuenta. No guarda claves Apple en el cliente. El RPC antiguo rechaza cuentas vinculadas a Apple para impedir omitir la revocación; desde la web se indica abrir la app para confirmar. Correo/Google conservan contraseña y confirmación por correo; el enlace público permite completar el flujo existente en la web. Si falla la limpieza, algunas fotos pueden haberse eliminado: se informa y se permite reintentar.

## Pagos y rendimiento

No hay checkout ni productos digitales activos, por lo que no se añadió Stripe/StoreKit sin catálogo real. Las reglas de Apple consultadas el 2 de noviembre de 2026 distinguen bienes/servicios físicos de funcionalidad digital; enlaces y métodos alternativos varían por storefront y entitlement. No hay una prohibición idéntica para todos los países. Antes de monetizar, definir productos, regiones y validación de derechos en servidor. No se configuró Google Play Billing ni un proyecto Android.

La regla 4.8 requiere una alternativa de acceso con las características de privacidad indicadas, con excepciones. Apple es la opción implementada; el código no acredita aprobación de tienda. Medir arranque frío y scroll con Instruments en un iPhone de menor rendimiento y red lenta: las pruebas automatizadas no demuestran 60 fps constantes.

## Validación física pendiente

- iPhone pequeño y grande, horizontal, teclado, texto ampliado, VoiceOver y movimiento reducido; botones equivalentes a cada gesto.
- Cargar scores, activar modo avión, reiniciar, guardar borrador, reconectar y confirmar una sola fila en app/web. Repetir con error y cambio de cuenta.
- Logout con cola, sesión vencida, Keychain bloqueado, reinstalación, Face ID y código sin perder formularios.
- Google/Apple reales, alta mayor de edad, cancelación, revocación y borrado de cuenta desechable.
- APNs desarrollo/distribución, permiso rechazado, preferencias, suspensión, logout offline y tap con app cerrada. Ambos tamaños del widget.
- Universal Links desde Notas/Mensajes y AASA real; escribir la URL en Safari no prueba apertura de app.

Fuentes: [reglas Apple](https://developer.apple.com/app-store/review/guidelines/), [revocación Apple](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple), [associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains), [WidgetKit](https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension), [Supabase Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple), [despliegue](https://supabase.com/docs/guides/functions/deploy), [programador](https://supabase.com/docs/guides/functions/schedule-functions) y [Capacitor push](https://capacitorjs.com/docs/apis/push-notifications).
