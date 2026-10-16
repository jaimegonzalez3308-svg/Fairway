# Trabajar en Fairway

## Preparar tu computadora

Acepta la invitación al repositorio en GitHub. Instala Node.js LTS y Git. En VS Code, ejecuta **Git: Clone** desde la paleta de comandos y pega:

```text
https://github.com/rodrigoelgu11-svg/Fairway.git
```

Abre la carpeta clonada y ejecuta en su terminal:

```bash
npx --yes pnpm@10.28.2 install
npx --yes pnpm@10.28.2 dev
```

Abre la dirección que imprima el servidor, normalmente http://localhost:3000. Sin variables de entorno se muestra la demostración. Para usar Supabase, copia `.env.example` a `.env.local` y configura las dos variables siguiendo el README. Cada persona mantiene su propio `.env.local`; nunca lo subas a GitHub.

## Compartir cambios

1. Antes de empezar, cambia a `main` en VS Code y ejecuta **Git: Pull**.
2. Crea una rama para tu tarea, por ejemplo `jaime/perfil` o `rodrigo/calendario`.
3. Edita y guarda tus archivos. Revisa los cambios en **Source Control**, prepara los archivos y crea un **Commit** con una descripción clara.
4. Usa **Publish Branch** la primera vez; después, **Push**.
5. En GitHub, abre un **Pull request** hacia `main` para que la otra persona revise el cambio antes de integrarlo.
6. Tras integrarlo, vuelve a `main` y ejecuta **Git: Pull** antes de empezar otra tarea.

Antes de compartir cambios de código, ejecuta:

```bash
npx --yes pnpm@10.28.2 typecheck
npx --yes pnpm@10.28.2 test
npx --yes pnpm@10.28.2 build
```

## Editar juntos en vivo

Instalen la extensión **Live Share** de Microsoft en VS Code. Una persona abre Fairway, inicia la sesión de Live Share y envía el enlace a la otra. Para ver la aplicación, comparte el puerto que usa el servidor de desarrollo. Al terminar, el anfitrión revisa, crea el commit y hace push de los cambios de la sesión.

Las migraciones de Supabase están en `supabase/migrations`; consulta el README y coordina su ejecución para no aplicar el mismo SQL dos veces.
