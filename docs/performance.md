# Rendimiento · 20 de octubre de 2026

Medición de la exportación de producción de Fairway, antes y después de esta revisión. La referencia anterior es el código `8e5ee93` (versión publicada 50). Son tamaños de archivos; **no son tiempos de carga, puntuaciones Lighthouse ni métricas de usuarios reales**. KB usa 1.000 bytes.

| Recurso | Antes | Después | Reducción |
| --- | ---: | ---: | ---: |
| JavaScript inicial moderno, gzip | 343,0 KB | 272,1 KB | 20,7% |
| JavaScript inicial moderno, sin comprimir | 1.180,5 KB | 936,3 KB | 20,7% |
| Dos fuentes WOFF2 precargadas | 740,2 KB | 225,6 KB | 69,5% |
| Foto principal WebP, escritorio | 542,8 KB | 213,2 KB | 60,7% |
| Foto principal AVIF, candidato 1024 px | 542,8 KB (WebP original) | 65,2 KB | 88,0% |

El navegador elige el tamaño y formato según ancho de pantalla, densidad de píxeles y compatibilidad. El AVIF de 1600 px pesa 136,8 KB; el de 640 px, 29,7 KB. No todos los móviles descargan la variante de 1024 px.

## Cambios

- Editores, formularios, recuperación, comunidad, partidas, QR, ajustes, tarjetas deslizables y administración se descargan al abrirse. Las estadísticas ya estaban separadas. La validación completa del perfil queda con sus formularios; el alta conserva validación ligera equivalente para la ciudad.
- La portada utiliza `picture`, AVIF con alternativa WebP y candidatos de 640/1024/1600 px. La foto inicial tiene prioridad alta; la segunda se carga de forma diferida. Ambas conservan texto alternativo, dimensiones y los contenedores con proporción reservada.
- Inter normal/cursiva conserva los ejes variables de peso 100–900 y tamaño óptico 14–32, acentos españoles, signos y cifras tabulares. Se recortaron los conjuntos de caracteres a latín básico/extendido A, diacríticos y puntuación. Otros alfabetos usan las fuentes de respaldo. Se mantiene `font-display: swap`, el ajuste de métricas de Next y la licencia OFL.
- Los paneles diferidos reservan espacio y anuncian carga. El mazo reserva su altura durante la descarga. Esto reduce oportunidades de salto; no acredita un valor CLS medido.

## Reproducir

```sh
pnpm test
pnpm build
node scripts/check-site-output.mjs
node scripts/measure-performance.mjs out --check
node scripts/optimize-static-images.mjs
```

La medición cuenta los scripts presentes en `out/index.html`, excluye `noModule` sin distinguir mayúsculas y suma gzip por archivo. Las pantallas diferidas no forman parte de esa cifra inicial. No cuenta HTML, CSS, respuestas de Supabase ni recursos solicitados después de una interacción. Los presupuestos del script detectan futuras regresiones de tamaño; no sustituyen una auditoría de navegación.

Las imágenes se regeneran con Sharp, disponible en las dependencias de Next, desde `docs/assets/fairway-aerial-source.webp`. El original y las variantes conservan la atribución de Keith Tanner/Unsplash.

Las fuentes originales están en el commit de referencia. Para regenerar cada archivo con FontTools 4.67.0 y Brotli, usar `pyftsubset` sobre ese original con:

```text
--flavor=woff2
--unicodes=U+0000-017F,U+0300-036F,U+2000-206F,U+20A0-20CF,U+2113,U+2212,U+FEFF,U+FFFD
--layout-features+=tnum
--name-IDs=* --name-legacy --name-languages=*
--notdef-glyph --notdef-outline --recommended-glyphs
--output-file=<archivo WOFF2 de destino>
```

## Verificación y pendientes

Las 152 pruebas pasaron, incluida la equivalencia de validación de ciudad y la corrección de permisos de lectura de fotos. La construcción de producción con TypeScript terminó correctamente. Se verificaron con FontTools los glifos españoles, ejes variables y función `tnum` de ambos archivos.

PageSpeed Insights respondió HTTP 429 por cuota del servicio. Chrome permitió inspeccionar la portada y abrir Lighthouse, pero el control de interfaz falló al ejecutar el análisis (`elementHasNoFrame`/`noWindowsAvailable`). **Quedan pendientes Lighthouse móvil con red lenta, LCP, CLS, TBT/INP y navegación interactiva bajo limitación de red.** No se asigna una puntuación ni se presenta una estimación de descarga como prueba de carga real. La restauración de sesión permanece antes de mostrar la portada; no se retiró para simular una carga más rápida.

Los encabezados públicos observados incluyen ETag y `cache-control: public, max-age=0, must-revalidate`; Cloudflare informa `cf-cache-status: HIT`. Esto confirma caché de CDN y revalidación, no almacenamiento largo en el navegador. Los chunks de Next usan nombres con hash. No se añadió un service worker que pudiera retener datos de sesión. Configurar un TTL de navegador más largo requiere soporte del alojamiento y sigue pendiente.

Referencias: [Next: carga diferida](https://nextjs.org/docs/app/guides/lazy-loading), [Next: fuentes locales](https://nextjs.org/docs/app/api-reference/components/font), [Chrome: Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse).
