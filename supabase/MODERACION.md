# Moderación del chat — Fairway / JR

Filtro de mensajes en español de México que vive **dentro de Supabase**, en la
función `send_message`. Como los usuarios solo pueden escribir mensajes por esa
función, nadie se lo salta desde el navegador.

- **block**: el mensaje NO se envía. La persona ve un aviso.
- **flag**: el mensaje se envía, pero queda en `moderation_flags` para que un admin lo revise.

Migración: `supabase/migrations/202610160009_moderation.sql` (nueva; no edita ninguna anterior).
Prueba automática: `tests/moderation.test.ts`.
Proyecto de Supabase: `zmahtiecioxiflbblofa`.

El front no necesita cambios: el chat ya muestra el mensaje de error de `send_message`
como aviso (`data.run` en `lib/use-fairway.ts`), así que el texto
"Tu mensaje no se envió porque no cumple las reglas de la comunidad..." aparece al bloquearse.

## Casos probados

`tests/moderation.test.ts` ejecuta todos estos casos contra la función `send_message`
completa en PostgreSQL (PGlite).

| Mensaje | Resultado esperado |
|---|---|
| `Mándame nudes` | block |
| `nuuuudes` | block |
| `quiero coger contigo` | block |
| `cuánto cobras?` | block |
| `Sexting?` | block |
| `ven a mi cuarto, estoy encuerada` | block |
| `eres un pendejo` | flag (insulto) |
| `n4lg4s` | flag (vulgar_sexual) |
| `soy menor de edad` | flag (menores) |
| `vamos a coger` | flag (ambigua) |
| `vamos a coger el carrito` | pasa |
| `hay descuento en pelotas de golf` | pasa |
| `me quedé sin pelotas en el hoyo 7` | pasa |
| `vamos al hoyo 19 por unas chelas` | pasa |
| `n.u.d.e.s` | pasa (limitación, ver abajo) |

## Límites que conviene saber

- **Se esquiva con separadores** (`n.u.d.e.s`) o con palabras partidas. Una lista nunca es suficiente sola.
- **Los `block` no quedan registrados.** El error revierte la transacción, y con ella el registro.
  Si quieren guardar los intentos bloqueados, hay que cambiar `send_message` para que devuelva un
  resultado en vez de un error, y el front tendría que mostrarlo.
- **Regionalismos.** `coger` es vulgar en México pero inocente en otros países; por eso solo se bloquea
  en frases claras y lo ambiguo va a revisión. Todo se afina con `update moderation_terms`.
- **Solo texto.** No revisa fotos ni historias (`story-images`).
- Los `flag` de insultos como `puto` o `pendejo` pueden ser bromas entre amigos; por eso solo se revisan, no se bloquean.

## Siguiente nivel (opcional)

Para lo ambiguo, se puede sumar la API de moderación de OpenAI desde una función de Supabase
(gratis con límites, funciona en español). Requiere una API key guardada como secreto en Supabase,
nunca en el código.
