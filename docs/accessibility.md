# Revisión de accesibilidad de Fairway

Desde el 25 de octubre de 2026, la paleta de contraste legible se aplica por defecto a todas las personas en `app/readability.css`. El modo opcional de **Ajustes → Accesibilidad → Modo de accesibilidad** añade tamaños mínimos de texto y controles y foco de dos colores; también se puede activar desde la página pública y recuperación de contraseña. La elección se guarda en este navegador, se aplica antes de la hidratación y se sincroniza entre pestañas. Si el navegador bloquea el almacenamiento, el control funciona durante la visita sin prometer persistencia.

Objetivo: WCAG 2.2 AA. Esta revisión aplica correcciones de código y verificaciones de colores declarados; no constituye una certificación ni una auditoría completa del sitio renderizado. La columna «Before» documenta los colores históricos; desde el 25 de octubre, los valores de «Modo activado» también corresponden a la paleta estándar. Desactivar el modo opcional conserva el contraste legible.

## Trabajo realizado

- En ambos modos: texto secundario, enlaces, avisos, errores, metadatos, resultados de golf y estados del calendario con colores más oscuros de las mismas familias verde, dorado y rojo. Las mediciones se basan en las declaraciones finales de las hojas de estilo.
- En ambos modos: límites de campos visibles. Con el modo activado: tamaños mínimos de texto y controles, y foco de teclado más destacado. El foco usa dos colores para funcionar sobre crema y verde. Las fotos reciben un fondo oscuro detrás del texto y los controles.
- En ambos modos: enlace para saltar al contenido en la app y la landing. Las transiciones de pantalla mueven el foco al contenido; la página actual se identifica en navegación y se actualiza el título del documento.
- Etiquetas, ayuda y errores asociados por identificador en el componente Field. Los errores de inicio de sesión marcan el campo inválido; los errores de perfil se anuncian como alertas. Se conservan las referencias y manejadores de React Hook Form.
- Estado de filtros, favoritos y reacciones mediante aria-pressed. Los contadores de búsqueda y mensajes nuevos se anuncian de forma no interruptiva. El historial del chat se puede enfocar y desplazar con teclado.
- Tablas de scores e historial con títulos, cabeceras de columna/fila y zonas de desplazamiento enfocables. Los valores numéricos y textos de estado acompañan al color.
- Preferencias de movimiento reducido y colores forzados de Windows. Se conservan la navegación por flechas del calendario y el control de pausa del visor de historias.

## Validación automatizada

Ejecutar `node scripts/check-contrast.mjs --standard` y `node scripts/check-contrast.mjs` para comprobar las parejas de la paleta estándar y del modo activado, respectivamente. Se puede pasar una revisión Git para mostrar el antes: `node scripts/check-contrast.mjs 865a84c8ab2343963e9b4eb2836c591689befd79`. El script usa PostCSS instalado por Next, resuelve las variables compartidas y calcula luminancia sRGB y composición alfa. Un resultado inferior al mínimo provoca un código de salida distinto de cero; no redondea antes de decidir. La lista es representativa y explícita: no recorre el DOM ni reproduce toda la cascada del navegador.

Las pruebas de `tests/accessibility.test.ts` comprueban etiquetas, identificadores únicos, ayuda, descripciones existentes y errores. Las pruebas de `tests/accessibility-mode.test.ts` comprueban la preferencia desactivada por defecto, su persistencia, el arranque con la preferencia guardada y la tolerancia a almacenamiento bloqueado.

Referencias: [WCAG 2.2, contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste de componentes](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Los mínimos son 4.5:1 para texto normal y 3:1 para componentes gráficos necesarios. No se exige contraste a controles deshabilitados o decoración.

| Component / state | Before | Modo activado | Minimum |
| --- | ---: | ---: | ---: |
| Primary text | 11.57:1 | 11.57:1 | 4.5:1 |
| Secondary text | 4.39:1 | 5.84:1 | 4.5:1 |
| Sidebar location | 4.05:1 | 5.39:1 | 4.5:1 |
| Sidebar labels | 4.17:1 | 5.39:1 | 4.5:1 |
| Navigation | 4.56:1 | 6.44:1 | 4.5:1 |
| Selected navigation | 11.50:1 | 11.50:1 | 4.5:1 |
| Tabs | 4.46:1 | 5.84:1 | 4.5:1 |
| Primary button | 12.15:1 | 12.15:1 | 4.5:1 |
| Button hover | 9.21:1 | 9.21:1 | 4.5:1 |
| Outline button | 11.77:1 | 11.77:1 | 4.5:1 |
| Profile link | 2.47:1 | 6.47:1 | 4.5:1 |
| Profile biography | 4.86:1 | 6.47:1 | 4.5:1 |
| Profile tags | 2.79:1 | 6.26:1 | 4.5:1 |
| Rating | 2.61:1 | 6.57:1 | 4.5:1 |
| Game details | 2.46:1 | 6.47:1 | 4.5:1 |
| Game action | 3.69:1 | 6.47:1 | 4.5:1 |
| Field label | 3.87:1 | 6.47:1 | 4.5:1 |
| Placeholder | 4.20:1 | 6.47:1 | 4.5:1 |
| Password link | 3.70:1 | 6.47:1 | 4.5:1 |
| Auth security note | 2.65:1 | 6.47:1 | 4.5:1 |
| Auth divider | 3.53:1 | 6.47:1 | 4.5:1 |
| Notice | 2.92:1 | 5.88:1 | 4.5:1 |
| Field error | 4.40:1 | 6.92:1 | 4.5:1 |
| Error banner | 3.99:1 | 6.56:1 | 4.5:1 |
| Round headers | 2.26:1 | 6.47:1 | 4.5:1 |
| Round values | 2.69:1 | 6.47:1 | 4.5:1 |
| Birdie score | 3.38:1 | 5.56:1 | 4.5:1 |
| Bogey score | 2.55:1 | 5.63:1 | 4.5:1 |
| Double bogey score | 2.69:1 | 5.42:1 | 4.5:1 |
| Eagle score | 2.69:1 | 5.50:1 | 4.5:1 |
| Chat metadata | 1.81:1 | 5.74:1 | 4.5:1 |
| Own chat metadata | — | 8.54:1 | 4.5:1 |
| Own chat sender | — | 8.54:1 | 4.5:1 |
| Calendar full | 3.27:1 | 5.92:1 | 4.5:1 |
| Calendar past | 2.57:1 | 5.88:1 | 4.5:1 |
| Outside-month date | 1.45:1 | 5.44:1 | 4.5:1 |
| Calendar time | 2.95:1 | 6.47:1 | 4.5:1 |
| Story count | 3.70:1 | 5.80:1 | 4.5:1 |
| Footer | 4.39:1 | 5.84:1 | 4.5:1 |
| Landing secondary | 4.87:1 | 6.01:1 | 4.5:1 |
| Landing photo credit | 3.58:1 | 6.01:1 | 4.5:1 |
| Landing club details | 3.76:1 | 6.01:1 | 4.5:1 |
| Landing note | 4.66:1 | 6.32:1 | 4.5:1 |
| Selected planner option | 7.35:1 | 7.35:1 | 4.5:1 |
| Planner option | 9.25:1 | 9.25:1 | 4.5:1 |
| Hero photo text | — | 12.15:1 | 4.5:1 |
| Field boundary | — | 4.38:1 | 3:1 |
| Outline boundary | 1.72:1 | 4.38:1 | 3:1 |
| Focus on cream | — | 11.77:1 | 3:1 |
| Focus on green | — | 11.77:1 | 3:1 |

50/50 declared-color checks passed in each mode. Browser rendering, photos, forced-colors and real assistive technology still require manual review.

## Verificación manual pendiente

La revisión inicial no tuvo navegador controlable. El 25 de octubre se comprobaron recorridos locales en Chrome a 390 y 320 CSS px con datos ficticios; ver [la revisión de experiencia](member-experience.md). Esa verificación parcial no sustituye las siguientes comprobaciones en la instancia publicada:

1. Activar y desactivar el modo en Ajustes, landing y recuperación; refrescar, abrir otra pestaña y cerrar sesión. Comprobar que los tamaños opcionales y el foco destacado se desactivan, se conserva el contraste legible y la preferencia persiste en este navegador.
2. Solo teclado: salto al contenido, menú móvil, navegación, formularios, modales y retorno de foco, calendario, chat y visor de historias, sin trampas de teclado.
3. VoiceOver/Safari y NVDA/Firefox o Chrome: títulos, etiquetas/errores, anuncios de mensajes/resultados, estados seleccionados y lectura de las tablas con datos reales.
4. Zoom al 200% y 400%, ancho equivalente a 320 CSS px y espaciado de texto personalizado. No debe perderse contenido; el desplazamiento horizontal debe limitarse a tablas que lo necesiten.
5. Contraste renderizado en todos los estados, sobre fotos de usuarios, textura del fondo, hover/foco y colores forzados. Verificar también que el foco no quede tapado por barras fijas.
6. Registro, Google, recuperación, alta/edición de perfil, creación de partidas y scores con una cuenta de prueba, incluidos fallos de validación y red. Los cambios no requieren SQL ni configuración nueva de autenticación.
