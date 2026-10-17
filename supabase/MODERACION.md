# Moderación del chat — Fairway / JR

Filtro de texto en español de México que vive **dentro de Supabase**, como un
trigger (`moderation_guard`) en cada tabla donde los usuarios escriben. Se aplica a
cualquier insert o update, venga del navegador o de una función, así que nadie se lo salta.

- **block**: el texto NO se guarda. La persona ve un aviso.
- **flag**: el texto se guarda, pero queda en `moderation_flags` (con `source`, p. ej.
  `posts.body`) para que un admin lo revise.

## Dónde aplica

| Lugar | Tabla y columnas |
|---|---|
| Chats (partidas, matches) | `messages.body` |
| Comunidad: publicaciones | `posts.body` |
| Comunidad: comentarios | `comments.body` |
| Historias | `stories.caption` |
| Perfil | `profiles.name`, `bio`, `city`, `occupation`, `additional_clubs` |
| Partidas | `games.description`, `access_conditions` |
| Evaluaciones | `reviews.body` |
| Rondas | `rounds.notes`, `course` |
| Clubes (admins) | `clubs.name`, `description`, `access_info` |

Fuera a propósito: `reports` y `verification_requests` (un reporte puede citar el texto
ofensivo y no debe bloquearse) y los textos que genera el sistema.

En un update solo se revisan las columnas que cambiaron, para no marcar el mismo texto
cada vez que alguien guarda su perfil.

Migraciones: `202610160009_moderation.sql` (reglas y tablas) y
`202610160010_moderation_everywhere.sql` (triggers en todas las tablas).
Prueba automática: `tests/moderation.test.ts`.
Proyecto de Supabase: `zmahtiecioxiflbblofa`.

El front no necesita cambios: cada pantalla ya muestra el error que devuelve Supabase
(`data.run` en `lib/use-fairway.ts`; las historias usan su propio aviso y borran la foto
subida si no se publica).

## Casos probados

`tests/moderation.test.ts` ejecuta estos casos en el chat y además prueba publicaciones,
comentarios, historias, perfil y partidas en PostgreSQL (PGlite).

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
- **Solo texto.** Revisa el texto de las historias, pero no las fotos (`story-images`, fotos de perfil y galería).
- **Registro.** Si alguien se registra con un nombre bloqueado, el registro falla con un error genérico de Supabase.
- Los `flag` de insultos como `puto` o `pendejo` pueden ser bromas entre amigos; por eso solo se revisan, no se bloquean.

## Siguiente nivel (opcional)

Para lo ambiguo, se puede sumar la API de moderación de OpenAI desde una función de Supabase
(gratis con límites, funciona en español). Requiere una API key guardada como secreto en Supabase,
nunca en el código.
