# Fairway en iOS

La app usa Capacitor 8 y el proyecto nativo de `ios/App/App.xcodeproj`, con dependencias mediante Swift Package Manager. Requiere macOS, Node.js 22 o superior, pnpm 10.28.2 y Xcode 26 o superior.

Desde la carpeta `fairway`:

```bash
pnpm install --frozen-lockfile
pnpm ios:sync
pnpm ios:open
```

`ios:sync` compila la exportación estática de Next.js en `out/` y copia sus archivos al proyecto nativo. Ejecútalo después de cambiar la web o instalar plugins. `ios:open` abre el proyecto en Xcode; selecciona un simulador de iPhone y pulsa Run. También puedes usar `pnpm ios:run` para compilar, sincronizar y elegir un dispositivo desde la terminal.

La configuración está en `capacitor.config.ts`: nombre **Fairway**, identificador inicial **com.fairway.app** y archivos web en `out`. La app incluye esos archivos localmente; no necesita ejecutar el servidor de desarrollo. Supabase y otros servicios remotos siguen necesitando conexión. Las variables públicas de `.env.local` se incorporan al compilar, igual que en la web; sin ellas aparece la demostración.

`SceneDelegate.swift` coloca el controlador de Capacitor dentro del área segura de iOS mediante Auto Layout. Así los encabezados, menús y diálogos quedan fuera de la barra de estado, el recorte de cámara y el indicador de inicio, también al girar el dispositivo. El espacio se aplica en el contenedor nativo, sin añadir márgenes al sitio web.

La interfaz de la app se activa únicamente cuando el puente de Capacitor informa `getPlatform() === "ios"`. Safari y los demás navegadores, incluso en móvil, conservan la portada y los diseños web. `lib/use-native-app.ts` añade la clase `native-ios`; `app/native-app.css` limita todos sus estilos a esa clase. No se detecta la app por el tamaño de pantalla ni por el user agent.

En iOS el primer uso muestra tres pasos que se pueden omitir; al volver hay una entrada compacta y las sesiones existentes entran directamente. Hay acceso a entrar, crear cuenta o explorar clubes. Las cinco pestañas principales son Descubrir, Partidas, Scores, Mensajes y Mi perfil. El menú superior conserva Comunidad, Amigos, Estadísticas, Clubes y Ajustes. Descubrir añade acciones para crear partida, anotar score y crear una historia. Amigos sigue en el menú. Partidas comienza en lista, con el calendario disponible; Mensajes alterna entre conversaciones y el chat elegido. Los formularios se presentan como paneles inferiores con campos y controles táctiles más grandes. Se reutilizan los mismos datos, permisos y operaciones de la web.

Las transiciones de sección son inmediatas en la app, las pantallas secundarias siguen cargándose al abrirlas y no se muestra la portada web extensa. Estos cambios reducen pasos y desplazamiento; no representan una medición de velocidad de red ni de rendimiento en un iPhone físico.

Para un iPhone físico, selecciona tu equipo en **Signing & Capabilities** de Xcode y un identificador disponible en tu cuenta Apple. Si cambias el identificador, actualiza tanto `appId` como **Product Bundle Identifier** del target App. No se configura automáticamente una cuenta de Apple ni se publica la app.

El proyecto nativo se conserva en Git; los archivos web copiados, los builds y el estado personal de Xcode se ignoran. No edites `ios/App/CapApp-SPM/Package.swift` manualmente: Capacitor lo actualiza al sincronizar plugins.

## Historias con cámara

Desde **Descubrir → Crear historia** o **Comunidad → Crear historia**, pulsa **Tomar foto** o **Elegir de Fotos**. La app abre la interfaz nativa de iOS y solicita permisos cuando corresponde. También conserva **Elegir un archivo**. Revisa la vista previa, añade un texto opcional, elige miembros o amigos y pulsa **Compartir historia**. Puedes volver a tomar la foto; cancelar o fallar conserva la última vista previa válida. No se publica al capturar ni se guarda automáticamente una copia en Fotos.

La captura usa las API actuales `takePhoto` y `chooseFromGallery` de `@capacitor/camera`; solo admite fotos, una a la vez. La imagen se normaliza a JPEG de hasta 1600 px y se eliminan sus metadatos mediante canvas antes de subir. Se conservan el bucket privado `story-images`, el RPC `publish_story`, la audiencia y la caducidad de 24 horas de la web. No requiere una migración nueva. La web mantiene su selector habitual, sin botones de cámara exclusivos de iOS.

En el simulador se puede comprobar la interfaz y elegir imágenes de prueba; la cámara física, las orientaciones de la foto y los permisos reales requieren una prueba en iPhone. Si la cámara no está disponible o se deniega el permiso, se explica cómo usar Fotos o el selector de archivos. No se solicitan permisos de micrófono ni se incorporan vídeos.

## Accesibilidad y teclado

Los controles de iOS tienen un área mínima de 44 puntos CSS. Los paneles abren con foco en su título, sin activar el teclado hasta tocar un campo. Los eventos de `@capacitor/keyboard` desplazan el panel y sus campos por encima del teclado; el tab bar se oculta mientras se escribe. Se conserva el contenedor nativo dentro del área segura.

`@capacitor/screen-reader` detecta VoiceOver. Las historias empiezan en pausa cuando está activo, al activar el modo de accesibilidad de Fairway o al preferir movimiento reducido en iOS. Se puede reanudar expresamente. Los controles mantienen sus etiquetas y las historias se pausan al pasar la app al fondo. El modo de texto ampliado de Fairway mejora el tamaño de campos, acciones y pestañas sin cambiar la web. Las pruebas automatizadas no sustituyen la comprobación con VoiceOver en un iPhone.

## Datos y enlaces compartidos

La app y la web usan la misma URL y clave pública de Supabase y las mismas tablas, almacenamiento, permisos y operaciones. Una cuenta existente sirve en ambos; cada instalación mantiene su propia sesión. Las operaciones compartidas requieren conexión. iOS conserva una copia privada reciente de datos propios y permite guardar tarjetas nuevas como borradores privados para sincronizarlas al reconectar; no fusiona ediciones entre dispositivos. Al volver la app al primer plano, se actualizan en segundo plano perfiles, partidas, scores, mensajes, amigos, comunidad e historias. La web mantiene sus suscripciones y recargas habituales; las historias abiertas se actualizan periódicamente cada 30 segundos.

`lib/public-origin.ts` convierte el origen local de iOS (`capacitor://localhost`, que puede serializarse como `null`) al dominio público de `lib/site.ts`. Los enlaces de partidas, perfiles, QR y correos de confirmación/recuperación apuntan al sitio web y conservan solo sus parámetros permitidos, sin tokens de sesión. Compartir desde iOS usa su hoja nativa mediante `@capacitor/share`. Los navegadores conservan el origen de su propio despliegue. Si cambias el dominio publicado, actualiza `lib/site.ts` y las URL permitidas de Supabase.

Los enlaces públicos siguen abriendo la web hasta configurar y publicar Universal Links. El router nativo y el generador de capacidades/AASA están preparados; falta la asociación con un equipo Apple real. Confirmar correo o recuperar contraseña desde el enlace web no inicia automáticamente la sesión de la app. No se cambiaron ajustes de producción ni se publicó una nueva versión del sitio como parte de esta integración.

## Google dentro de la app

**Continuar con Google** en iOS abre una hoja de autenticación del sistema sobre Fairway mediante `ASWebAuthenticationSession`. iOS puede pedir permiso para compartir el inicio de sesión con el dominio de Supabase. Google muestra su selector de cuenta en esa hoja y, al terminar, la hoja se cierra y la sesión se incorpora a la app. No se navega el WebView a Google ni se abre una pestaña independiente. Safari y otros navegadores mantienen el flujo web anterior.

Antes de probar un acceso real, añade este valor exacto en **Supabase → Authentication → URL Configuration → Redirect URLs** del proyecto que usa `.env.local`:

```text
com.fairway.app://auth/callback
```

Conserva el Site URL y los Redirect URLs existentes de la web. Google debe seguir habilitado en el proveedor de Supabase; su callback HTTPS de Google Cloud sigue siendo el de Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`), no el esquema de la app. Este flujo usa el proveedor web existente, sin incorporar un secreto de Google ni requerir un cliente OAuth iOS distinto.

El código local está preparado y el esquema está registrado en `Info.plist`, pero el permiso remoto de redirección no se ha configurado ni verificado desde este entorno. Si falta, Supabase puede regresar al sitio web dentro de la hoja en lugar de finalizar en Fairway. Cierra la hoja, configura la URL y vuelve a intentar. Si cambias el esquema, actualiza `NATIVE_GOOGLE_CALLBACK`, `FairwayAuthPlugin.swift`, `Info.plist` y la lista de Supabase.

`FairwayAuthPlugin.swift` se registra en el controlador de Capacitor de `SceneDelegate.swift`. `lib/native-google-auth.ts` crea un cliente temporal con PKCE S256 y un verificador solo en memoria durante ese intento. Solo acepta el callback esperado y canjea su código con Supabase antes de pasar los tokens verificados al cliente persistente de Fairway. No cambia el flujo de correo ni el de la web. Cancelar conserva la sesión y permite reintentar; los taps simultáneos comparten una única hoja. No se imprimen callbacks ni tokens. Si iOS termina el proceso durante el acceso, se inicia un intento nuevo al reabrir; no se aceptan callbacks recibidos fuera de la hoja activa.

Validación pendiente con una cuenta de prueba: completar el acceso, cancelar y reintentar, volver como usuario existente, completar el alta de Google si es una cuenta nueva y confirmar que la sesión permanece al reiniciar. Las pruebas automatizadas verifican el intercambio PKCE con el SDK real, callbacks inválidos, cancelación, errores y exclusión de intentos simultáneos; no equivalen a un acceso real con Google.

Referencias: [instalación de Capacitor](https://capacitorjs.com/docs/getting-started), [iOS](https://capacitorjs.com/docs/ios) y [Swift Package Manager](https://capacitorjs.com/docs/ios/spm).

API de los plugins: [Cámara](https://capacitorjs.com/docs/apis/camera), [Teclado](https://capacitorjs.com/docs/apis/keyboard), [Lector de pantalla](https://capacitorjs.com/docs/apis/screen-reader), [Ciclo de vida](https://capacitorjs.com/docs/apis/app) y [Compartir](https://capacitorjs.com/docs/apis/share).

Google en iOS: [ASWebAuthenticationSession de Apple](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession), [código nativo de Capacitor](https://capacitorjs.com/docs/ios/custom-code), [PKCE de Supabase](https://supabase.com/docs/guides/auth/sessions/pkce-flow) y [redirecciones de Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## Servicios y preparación de distribución

Consulta [ios-services.md](./ios-services.md) para Keychain, biometría, offline, gestos, widget, Apple, push, Universal Links y la revisión de pagos. Apple/push comienzan inactivos hasta configurar y verificar sus servicios. No se cambiaron credenciales remotas ni se publicó una nueva versión del sitio.
