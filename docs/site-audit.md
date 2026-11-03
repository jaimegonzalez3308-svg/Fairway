# Revisión del sitio · 19 de octubre de 2026

**Estado más reciente: 25 de octubre de 2026.** La tabla original es histórica; las actualizaciones al final documentan los cambios posteriores.

Revisión del código y la exportación estática frente a la lista compartida por el propietario. No constituye certificación legal ni WCAG. No incluye una auditoría de contratos, logs, respaldos o configuración interna de proveedores.

| Punto | Resultado y alcance |
| --- | --- |
| Privacidad | Página pública `/legal/privacidad/`, accesible antes del registro. Responsables, domicilio y correo confirmados por el propietario. **Pendiente completar la conservación y el proceso operativo de solicitudes**. No se inventaron plazos ni dirección. |
| Términos | Página pública `/legal/terminos/`: mayores de 18, convivencia, derechos sobre contenido, datos declarados y alcance de partidas/directorio. Requiere revisión del responsable antes de considerarse documento definitivo. |
| Reembolsos | `/legal/pagos/` explica el estado actual sin cobros o suscripciones de Fairway. No hay pasarela de pago en el código revisado. Los acuerdos con clubes son externos; no se presenta una cláusula ficticia de «sin reembolsos». |
| Almacenamiento/cookies | `/legal/cookies/` documenta sesión Supabase, preferencia de accesibilidad y marca local de pregunta de ubicación. No se detectaron analítica, píxeles publicitarios o embeds sociales en el código. No se añadió un banner de consentimiento ficticio para rastreadores inexistentes. Reevaluar antes de integrar seguimiento opcional. |
| Proveedores externos | Supabase y Google para las funciones de cuenta. BigDataCloud recibe coordenadas aproximadas e IP al usar ubicación con permiso; existe alternativa manual. El alojamiento recibe datos técnicos al servir la página. No se auditó el tratamiento interno de proveedores. |
| Consentimiento/formularios | Enlaces legibles a privacidad y términos antes del registro por correo/Google, abren una pestaña nueva para conservar el formulario. Checkbox obligatorio sin preselección. Esto no equivale a un registro probatorio completo de versiones de consentimiento. |
| Datos necesarios | No se solicitan género/ocupación a nuevos perfiles. Se conservan los datos anteriores salvo eliminación elegida por el usuario al guardar. Se pide nombre para el perfil, edad (18+), ciudad y preferencias de golf. No se añade fecha de nacimiento, teléfono ni dirección personal. |
| Imágenes/atribución | Fotos de diseño y directorio servidas localmente; fuente verificable Keith Tanner/Unsplash. Directorio marcado como ilustrativo. Retratos ficticios de demo sustituidos por avatar SVG. Antigua foto sin atribución comprobada conservada fuera de `public`, en `docs/assets`. Créditos y licencias públicas en `/legal/creditos/`. Las subidas de miembros siguen requiriendo permisos del autor; no se certifican sus derechos. |
| Opiniones/afirmaciones | En producción configurada no se usa demo como sustituto de datos vacíos o errores. La demo identificada conserva datos ficticios. Evaluaciones requieren partida compartida y finalizada; no se afirma acreditar asistencia real mediante GPS. Handicap/membresía declarados y clubes pendientes de confirmar identificados. |
| Alt text | Revisión de etiquetas `img`: todas tienen atributo `alt`; los avatares repetidos junto al nombre usan `alt` vacío. Fondos decorativos no se presentan como fotos verificadas del club. No se inventan descripciones detalladas de contenido subido por usuarios. |
| Teclado/etiquetas | Se conservan los arreglos de etiquetas, errores, foco y navegación de la revisión de accesibilidad anterior. Pestañas del perfil anuncian selección. Documentos legales con HTML estático, un h1, secciones h2, enlaces reales, foco visible y salto al contenido. Pendiente verificación completa con teclado y lectores de pantalla. |
| Contraste | Se conserva el modo opcional solicitado. El modo estándar **aún tiene pares de bajo contraste** documentados en `docs/accessibility.md`. El verificador cubre 49 pares declarados del modo activado; no prueba todos los estados renderizados. Los documentos nuevos usan colores oscuros sobre fondo claro en ambos modos. |
| Leyes locales/datos reales | Se consultaron fuentes oficiales de México para identificar información faltante; no se declara cumplimiento integral. Contacto confirmado: Jaime Gonzalez Alvarez y Rodrigo Calderon Knight, fairway.rj@gmail.com; Jardín de los Cardenales 630, El Bosque Country Club. Falta el proceso operativo de privacidad y revisión final de textos/retención por el responsable. |

## Verificación

- Suite de pruebas del proyecto, TypeScript, colores declarados y construcción/exportación de Next.
- `scripts/check-site-output.mjs` comprueba HTML estático, títulos, canonical, descripciones, imagen social, sitemap público y ausencia de source maps de producción. Incluye las cinco páginas nuevas, sin enlaces a perfiles, chats o recuperación en sitemap.
- No se dispone de un navegador controlable en este entorno. No se afirma ausencia de errores de consola ni conformidad de todos los recorridos renderizados; falta revisión visual, de teclado y con tecnologías de asistencia.

## Referencias primarias

- [Ley Federal de Protección de Datos Personales en Posesión de los Particulares, artículos 15 y 16](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf): identidad/domicilio y contenido del aviso; disponibilidad al recabar datos.
- [Ley Federal de Protección al Consumidor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf): revisar obligaciones de comercio electrónico antes de incorporar cobros.
- [Licencia Unsplash](https://unsplash.com/license) y [fotografía de Keith Tanner](https://unsplash.com/photos/aerial-view-of-a-beautiful-golf-course-4WSLeNydrlo).
- [Funcionamiento del servicio de BigDataCloud](https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free).
- [WCAG: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Actualización · 20 de octubre de 2026

- Fotos: corregida y aplicada la política `view_images` de Storage; se verificó en Chrome que una foto guardada aparece en el perfil y menú de cuenta. El bucket sigue privado. La prueba PostgreSQL reproduce el fallo anterior y verifica visibilidad, bloqueos y suspensiones tras la corrección.
- Rendimiento: reducción medida de JavaScript inicial, fuentes e imágenes, con carga diferida de pantallas y fotos secundarias. Suite completa: 152 pruebas aprobadas. Ver [informe de rendimiento](performance.md) para cifras, método, caché y limitaciones. No hay todavía una puntuación Lighthouse ni medición de LCP/CLS/INP.
- El control de Chrome funcionó para la verificación de la foto, pero falló durante el intento de Lighthouse. Esto no completa la revisión visual, de teclado o de lectores de pantalla pendiente en la revisión original.

## Actualización · 25 de octubre de 2026

- **Lectura por defecto:** la paleta de contraste se aplica en ambos modos, conservando crema y verde. Los 50 pares declarados pasan tanto con `--standard` como con el modo opcional; esto no certifica todos los estados renderizados. El modo opcional conserva ajustes de tamaño y foco.
- **Primera ronda:** el alta con disponibilidad vacía abre tres pasos: días/modalidad, ciudad/club opcional y elección entre descubrir golfistas o crear una partida. Se puede omitir y retomar desde Descubrir. Se guardan únicamente esos cinco campos; un error conserva las selecciones y permite reintentar.
- **Comunidad pequeña:** Descubrir distingue ausencia de miembros, perfiles ya revisados y filtros restrictivos. Ofrece crear una partida, invitar con un enlace a Fairway y compartir el perfil. Favoritos ya no se limita a seis tarjetas. La búsqueda se mantiene visible en móvil.
- **Navegación y enlaces:** los cambios de sección crean entradas de historial; Atrás/Adelante restauran la sección y los detalles de una partida. Los enlaces `?partida=UUID#partidas` mantienen el destino al autenticarse y consultan los permisos existentes. Hay estados diferenciados de carga, fallo con reintento y partida no disponible. Compartir no concede acceso al club ni confirma un lugar.
- **Mantenimiento:** extraídos Descubrir, detalle de partida, tarjetas, historial, filtros, disponibilidad y galería. Las reglas consecutivas de la paleta compartida se agruparon sin alterar su orden. Se añadió restauración de foco al cerrar diálogos y títulos independientes de la descarga de pantallas.
- **Verificación:** 161 pruebas aprobadas, TypeScript, construcción/exportación, metadatos y presupuestos de tamaño. Chrome local con API ficticia: acceso por correo, preparación de primera ronda, búsqueda/estados vacíos, invitación copiada, enlace de partida tras recarga, historial, unión y chat con respuestas demoradas y fallos simulados. La selección de foto quedó bloqueada por el permiso de archivos de la extensión; no se afirma una subida completa. No se usaron cuentas ni mensajes reales. No se verificaron SMTP, OAuth real, iOS/Safari, lectores de pantalla ni métricas de campo.

Detalles y reproducción: [mejoras de experiencia y verificación](member-experience.md). Estos cambios son locales; esta revisión no acredita un nuevo despliegue público.
