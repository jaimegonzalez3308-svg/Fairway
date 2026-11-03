# Fairway shared instructions

@AGENTS.md
@docs/agent-context.md
@docs/agent-workflow.md

## Revisión con Codex

Aplica cuando el usuario trabaja directamente con Claude Code. No aplica cuando Codex lanza a Claude por el bridge (`pnpm agent:claude run`): ahí Claude no llama a Codex (sin delegación recursiva) y sigue `docs/agent-workflow.md`.

Codex se usa solo con `codex exec`, nunca por MCP (`codex mcp-server` ya no existe desde Codex CLI 0.154). Siempre en solo lectura y sin guardar sesión:

```bash
codex exec -s read-only --ephemeral -C "$(git rev-parse --show-toplevel)" "<prompt>" </dev/null
```

Codex nunca edita archivos en este flujo; solo lee y opina. Claude implementa.

1. **Antes de empezar:** si existe `.agent-runs/active.lock` o el usuario dice que Codex está trabajando (VS Code o bridge), no tocar esos mismos archivos. Guardar `git status --short` previo para separar el trabajo de la tarea de cambios ya existentes.
2. **Plan:** en cada tarea de código, pedir a Codex un plan breve (archivos, riesgos, tests) antes de implementar. Claude decide qué adoptar.
3. **Revisión:** al terminar, guardar el diff de la tarea en `.agent-runs/codex-review/<fecha>-<tema>.diff` (ignorado por Git; archivos nuevos con `git diff --no-index /dev/null <archivo>`) y pedir a Codex que lo lea y revise: errores, seguridad (RLS, columnas privadas de `profiles`), regresiones web e iOS nativo, y tests faltantes. Nunca incluir `.env`, tokens ni datos privados.
4. **Rondas:** corregir lo que proceda, correr los checks relevantes (`pnpm typecheck`, tests afectados) y repetir la revisión. Máximo 3 rondas. Si siguen en desacuerdo, preguntar al usuario con ambas posturas.
5. **Confirmación:** pedir confirmación al usuario antes de cualquier push, migración o Edge Function en Supabase, o cambio en el proyecto Xcode (`ios/`).
6. **Resumen final en español:** qué cambió, qué dijo Codex, qué se corrigió y qué queda pendiente (incluye checks no ejecutados).
