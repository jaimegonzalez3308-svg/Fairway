# Codex ↔ Claude Code in Fairway

The local bridge calls Claude Code directly and returns its response to the calling terminal. Codex can use it during a task. Each call includes fresh copies of the shared instructions, project context, workflow, and task brief. Both assistants edit the same repository, so files do not need to be manually uploaded.

This does not merge the chat products, synchronize their private histories, or create an always-running background conversation. New facts from this chat must be recorded in the shared context or the next task brief. Existing Claude chats are not automatically resumed. No new API key, MCP server, daemon, or global permission bypass is required.

## Connection

From `fairway`:

```bash
pnpm agent:claude doctor
pnpm agent:claude login
pnpm agent:claude run docs/agent-connection-check.md
```

`login` opens Claude Code's own account sign-in flow. Complete it yourself; never put passwords or tokens in a brief or this chat. The bridge reuses your existing Claude Code authentication. Usage is subject to that account's access and limits. The binary is discovered from PATH, the normal local install locations, or the Claude Code VS Code extension. `FAIRWAY_CLAUDE_BIN` can point to a different executable without storing credentials.

Status on 2026-11-02: the bridge discovered the VS Code extension's Claude Code binary, `doctor` reported `loggedIn: true` through claude.ai, and bridge run `c7a458f0-c3a2-49ac-880f-646a8f696f07` returned a successful live Claude response. That verified binary discovery, an authenticated request/reply, and receipt of the curated shared context on that date. It does not guarantee permanent authentication, sync private chat histories, or test app, Simulator, or physical-device behavior. Only a successful real request/reply establishes a working model connection; a successful simulated test does not establish authentication. If authentication later expires or a call fails, sign in again and re-run `doctor` and the connection check.

## Delegation

Choose the owner before starting a bridge call. Codex handles very small tasks directly: quick questions, typo/copy fixes, small documentation or instruction updates, and obvious localized fixes with straightforward checks. Do not invoke Claude just to classify or review these tasks, and do not require a delegation brief for Codex-only work. Use judgment about complexity and handoff cost; file count or an unmeasured time estimate alone does not determine the owner. Codex still runs appropriate checks. Delegate larger, well-scoped repository/terminal work when the handoff is useful and Claude is available. UI/app/browser/Simulator work stays with Codex regardless of task size. A Claude usage pause overrides all delegation.

1. Codex reproduces/understands the issue, chooses a terminal-verifiable scope, and makes a brief using `docs/agent-task-template.md`. Store task-specific private briefs under `.agent-runs/`, which is ignored by Git.
2. Use `pnpm agent:claude run <brief.md>` for read-only work, or add `--edit` for coding. Read-only calls expose only Read/Grep/Glob/Skill in `dontAsk` mode. Editing calls add Edit/Write/Bash in `manual` permission mode; requests that reach Claude's permission prompt wait for Codex's review (see Permission review below). In both modes the bridge explicitly pre-approves `Skill(impeccable:impeccable)`, `Skill(ui-ux-pro-max:ui-ux-pro-max)`, and `Skill(caveman:caveman)` (`approvedSkills` in `scripts/claude-bridge.mjs`, no wildcards). Impeccable leads design work; UI/UX Pro Max is an optional targeted design knowledge/search source; Caveman is for concise prose/handoffs only and never abbreviates exact code, commands, errors, or verification/permission details. Approval does not invoke a skill; installed plugins can still provide metadata and lifecycle hooks. The bridge does not force Caveman on in headless runs. Other skills are not explicitly pre-approved by the bridge, and Agent/Task/`mcp__*` tools stay disallowed with an empty strict MCP config. Report denied checks for Codex to run. Never bypass all permissions.
3. The bridge records the task, context hash, before/after Git status, and JSON response in a private, ignored `.agent-runs/<id>/` directory. It prevents overlapping bridge invocations. This lock does not stop a separately launched editor; Codex must coordinate other sessions too. Do not blindly delete a lock while Claude is running.
4. Claude implements only the allowed scope and returns changed files, checks/results, remaining concerns, and any denied commands. Do not start another assistant or delegate back to Codex. Do not open UI, log in, deploy, publish, commit, or modify unrelated work.
5. After Claude exits, Codex inspects its actual diff against the pre-task state, checks newly created files, runs relevant verification, resolves problems, and reports the result. `git diff` against HEAD alone can include the user's earlier work. Capture relevant pre-task file copies when needed.
6. UI/Simulator/browser-dependent behavior belongs to Codex. Stop Claude's edits before taking over, then reproduce, fix, and verify in the same UI. If UI tools are unavailable, state that limitation and identify the exact manual checks.

## Permission review

Coding runs pass a per-run `--settings` file (`.agent-runs/<run-id>/settings.json`) that adds a `PermissionRequest` command hook (`scripts/claude-permissions.mjs`). It merges with installed plugin hooks such as Impeccable and never changes global or project Claude settings. Tools Claude already treats as allowed, including the three pre-approved plugin skills, keep normal behavior; the hook only sees requests that would otherwise prompt. It is a review step, not a sandbox over every tool or plugin hook.

For each request the hook validates the input, run state, live bridge owner, and repository working directory. It then writes a private pending record to `.agent-runs/<run-id>/permissions/` with a fresh request ID and a SHA-256 hash of the exact tool name and input, and waits. Nothing is approved automatically. Only a one-time decision that matches the hash allows that single invocation. Denial, missing or malformed answers, hash mismatch, expiry (10 minutes), cancellation, a closed run, or a dead bridge all deny. Claude's suggested permanent rules are never applied, and no updated input or permissions are returned. While Claude waits, the bridge prints `Permission review pending: run <id> request <id> (<tool>)` without the tool input. The run is closed when the bridge exits.

From another terminal call (no Claude sign-in needed; neither command runs the requested action):

```bash
pnpm agent:claude permissions [run-id]
pnpm agent:claude decide <run-id> <request-id> <allow|deny> <input-sha256> '<short reason>'
```

Codex procedure: keep polling the running terminal while Claude works, and answer pending reviews before waiting for its final result. Read the pending record's exact command, path, or edit content and the run's `brief.md`, then decide. Approve routine, reversible work the brief authorizes, such as allowed-file edits and the listed checks. Deny unrelated or destructive actions, deployment, publishing, commits, credential/`.env` access, and data or account actions the brief does not authorize. Ask the user only when authority is actually missing. The user has authorized Codex to answer Claude's requests with judgment. Do not ask again for normal in-scope edits or checks, and never auto-approve or rubber-stamp a request.

This is active review during Codex's own bridge runs, not a daemon. Standalone Claude Code sessions (VS Code or terminal), password prompts, macOS/OS permission dialogs, and sign-ins still need the user.

There is no automatic replay/retry after a partial editing failure. Inspect changes before sending a new brief. Update `docs/agent-context.md` with durable decisions and verification status, excluding secrets.

## Claude usage limit fallback

Standing user preference: when Claude Code exhausts its usage/token allowance, Codex continues alone. This is an instruction the active agent follows, not a background service, quota detector, or automatic CLI-to-Codex launch. An exhausted-account handoff has not been exercised.

1. Treat only a reported Claude usage, quota, or allowance-limit message (or the user saying Claude is exhausted) as a quota failure. Handle authentication, permission denials, crashes, lock, and other errors normally.
2. On a quota failure, stop delegating. Let the Claude process exit or stop; do not kill a run that is still editing without checking its state.
3. Inspect all partial changes against the pre-task state, plus the run's private `.agent-runs/<id>/` records (brief, before/after Git status, response, permissions). Preserve existing edits and Claude's useful partial work.
4. Codex takes over all remaining implementation, debugging, review, verification, and reporting for the original task. Continue within its existing authorization without asking the user to restart the task, approve the handoff, wait for Claude, or buy credits. If something else blocks completion, report that specific blocker and continue independent work where possible.
5. Record the active delegation pause, observation date, and any reported reset time in `docs/agent-context.md` so later tasks retain it; exclude credentials and private response contents. Keep delegation paused until the user says Claude's allowance is available/reset and wants to resume, or availability is confirmed without a billable model request. Clear that recorded pause only after confirmation. If the user reports Claude is exhausted before a run, use Codex directly.
6. Do not probe or retry Claude with model calls, silently switch accounts, models, or providers, or enable paid overages/API billing. Codex is not unlimited; it remains subject to its own access and limits, and reports when those block progress.

When Claude is available again, apply the task-size and UI ownership rules above; very small tasks still stay with Codex.

## Verification commands

- Focused tests: `pnpm exec tsx --test tests/<relevant>.test.ts`.
- Types: `pnpm typecheck`; full tests: `pnpm test` when warranted.
- Web/export: `pnpm build` and `node scripts/check-site-output.mjs`.
- Native assets: `pnpm ios:sync`; opening Xcode alone is not build verification.
- Run native builds and UI checks when a task affects native code or behavior; see `docs/ios.md`.

References: [Claude programmatic CLI](https://code.claude.com/docs/en/headless), [PermissionRequest hook](https://code.claude.com/docs/en/hooks#permissionrequest), [shared Claude instructions](https://code.claude.com/docs/en/memory), [Codex project instructions](https://developers.openai.com/codex/guides/agents-md/).
