# Revisión del entorno de terminal · 3 de noviembre de 2026

Revisión de solo lectura hecha desde una sesión de Claude Code en terminal (Codex no participó), para igualar lo que hace la extensión de VS Code: cambios en Supabase, push a GitHub y compilar/abrir en Xcode. No se aplicaron migraciones, no se hizo push ni se cambió configuración. Los únicos comandos con red fueron `git fetch --dry-run`, `git ls-remote` y `git push --dry-run` (no envía commits). La compilación de Xcode usó DerivedData fuera del repositorio; `git status` quedó igual antes y después. No se incluyen claves ni valores de `.env`.

## Hallazgos

### Claude Code

- `~/.claude/settings.json`: plugins `impeccable`, `ui-ux-pro-max` y `caveman`, sus marketplaces y el tema. Sin reglas de permisos.
- `~/.claude.json`: no había servidores MCP ni `allowedTools`. No existen `.claude/settings.json`, `.claude/settings.local.json` ni `.mcp.json` en `fairway/` o `Matrix/`.
- La extensión de VS Code (2.1.317) comparte esa configuración, así que la diferencia con la terminal no venía de Claude Code sino de las herramientas instaladas en la Mac.
- `scripts/claude-bridge.mjs` y `scripts/claude-permissions.mjs` solo sirven para que Codex lance Claude sin interfaz y revise sus permisos (ver `agent-workflow.md`). No afectan una sesión de Claude Code interactiva.

### Herramientas

- En ese momento no había `node`, `pnpm`, `npx`, `gh`, `supabase`, `brew` ni `deno` en el PATH. El único `node` del disco estaba dentro de ChatGPT.app (`/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node`, v24). Sospecha no verificada: los tests, builds y `cap sync` anteriores los corrió Codex con ese node.
- Sí estaban disponibles `git` y `xcodebuild`/`xcrun`.

### GitHub

- `origin` = `https://github.com/rodrigoelgu11-svg/Fairway.git`, con credenciales en el llavero (`osxkeychain`).
- `git fetch` funciona y `git push --dry-run` se autenticó, así que push funciona.
- `ios-social-ui` no tiene upstream y no existe en el remoto; tiene 49 commits que no están en `origin/main`. El `main` local va 47 commits por delante de `origin/main`. Ramas remotas: `main` y `jaime/moderacion`.

### Supabase

- La CLI no estaba instalada y el proyecto no está enlazado (no existen `supabase/.temp` ni `~/.supabase`), así que no se pudo correr `supabase migration list`.
- Según el README, las migraciones se han aplicado pegándolas a mano en SQL Editor (los `.sql` de `~/Matrix` parecen copias para eso). Si es así, el historial de migraciones remoto probablemente está vacío. **No ejecutar `supabase db push` a ciegas**: primero comparar el esquema y marcar lo ya aplicado con `supabase migration repair --status applied <versión>`.
- La migración `202611020013_native_services.sql` y las Edge Functions (`push-dispatch`, `delete-apple-account`) están documentadas como no desplegadas.

### Variables de entorno

- Solo existen `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) y `.env.example`.
- Next las lee del archivo al compilar, y la shell no tiene variables `NEXT_PUBLIC_*` ni `SUPABASE_*` que las pisen. Por eso cargan igual desde la terminal que desde VS Code, siempre que el build corra en `fairway/`.
- Los secretos de Apple, APNs y push deben vivir en los Edge Function Secrets de Supabase, no en local.

### Xcode e iOS

- `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer`; Xcode 27.2 (27B52).
- Simuladores con iOS 27.2: iPhone 18 Pro (arrancado), 18 Pro Max, 17, 17e, Air y Duo. Esquemas: `App` y `FairwayWidgets`.
- `xcodebuild -project App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build` → **BUILD SUCCEEDED**. Usó el `ios/App/App/public` sincronizado a las 08:43, que corresponde al último código.
- `pnpm ios:sync` no se probó porque no había Node.

### Flujo "cambio → Supabase → GitHub → Xcode" según los docs

1. **Cambio:** Codex dirige y delega en Claude por el bridge. Se verifica con `pnpm test`, `pnpm typecheck` y `pnpm build`.
2. **Supabase:** SQL pegado a mano en SQL Editor. No hay ningún flujo con la CLI documentado.
3. **GitHub:** commits desde Source Control de VS Code (`CONTRIBUTING.md`). Los commits "Update Site source" parecen venir de la publicación en ChatGPT Sites. No hay ningún flujo con `gh` documentado.
4. **Xcode:** `pnpm ios:sync` y luego `pnpm ios:open`, con Run en el simulador. La firma y los servicios de Apple siguen pendientes porque no hay membresía de Apple Developer.

## Cambios posteriores del usuario (mismo día)

Después del reporte, el usuario:

- instaló Homebrew en `/opt/homebrew` y Node con brew,
- instaló Codex CLI (`npm install -g @openai/codex`) e hizo `codex login`,
- registró `claude mcp add --scope user codex -- codex mcp-server`.

Comprobación rápida en disco:

- Existen `/opt/homebrew/bin/brew`, `node` (v26.13.0), `npm` y `codex`.
- `~/.claude.json` ya tiene el servidor MCP de usuario `codex`.
- `/opt/homebrew/bin` todavía no estaba en el PATH de la sesión abierta antes de instalarlo.
- `pnpm`, `gh` y `supabase` siguen sin instalarse.

**Resuelto (ver abajo):** `claude mcp list` mostraba `codex` como "Failed to connect — CONNECTION_CLOSED".

## Actualización (3 nov, tarde)

- pnpm 10.28.2 instalado con `npm install -g pnpm@10.28.2`: Node 26 ya no trae corepack.
- `pnpm install --frozen-lockfile` sin cambios (aviso: build script de `esbuild@0.28.2` ignorado). `pnpm typecheck` OK. `pnpm test`: 212 de 212 pasan.
- MCP `codex`: Codex CLI 0.166.0 ya no tiene `codex mcp-server` (eliminado en 0.154). La CLI lo trataba como prompt interactivo (`Error: stdin is not a terminal`) y por eso Claude veía CONNECTION_CLOSED. El reemplazo oficial, `codex app-server`, no habla MCP. Se eliminó el registro con `claude mcp remove codex -s user`. Claude consulta a Codex con `codex exec -s read-only` (sección "Revisión con Codex" de `CLAUDE.md`). Prueba de solo lectura OK.
- `git push -u origin ios-social-ui` hecho. GitHub avisó que el repositorio se movió a `jaimegonzalez3308-svg/Fairway`; `origin` se actualizó a `https://github.com/jaimegonzalez3308-svg/Fairway.git`.

## Estado y siguientes pasos

| Capacidad | Estado | Siguiente paso |
| --- | --- | --- |
| git commit, fetch y push | Hecho: `ios-social-ui` subida con upstream; `origin` apunta a `jaimegonzalez3308-svg/Fairway` | — |
| Node | Instalado con brew; falta en el PATH de sesiones viejas | Abrir una terminal o sesión nueva (`/opt/homebrew/bin` en el PATH) |
| pnpm | Hecho: 10.28.2 con `npm install -g` (Node 26 no trae corepack) | — |
| Tests, typecheck, build, `cap sync` | Tests (212/212) y typecheck OK; build y `cap sync` sin probar | `pnpm build && pnpm ios:sync` |
| Compilar en Xcode | Funciona | Comando `xcodebuild` de arriba, o `pnpm ios:open` |
| `gh` | Falta | `brew install gh && gh auth login` |
| CLI de Supabase | Falta; proyecto sin enlazar | `brew install supabase/tap/supabase`, `supabase login`, `supabase link --project-ref <ref>`, `supabase migration list` |
| Edge Functions | No desplegadas | Requiere la CLI, los secretos y el Team ID de Apple (ver `ios-services.md`) |
| MCP `codex` | Eliminado: `codex mcp-server` ya no existe | Usar `codex exec -s read-only` |
| Permisos de Claude por proyecto | Sin allowlist | Opcional: `.claude/settings.local.json` con reglas `allow` |
