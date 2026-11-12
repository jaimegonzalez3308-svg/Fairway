<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Fairway collaboration

Read `docs/agent-context.md` and `docs/agent-workflow.md` before starting a Fairway task. They preserve the user's product requirements, current limitations, and delegation rules for both Codex and Claude Code.

Codex owns planning, review, verification, and the final report. Handle very small tasks directly, including quick questions, typo/copy fixes, small documentation or instruction updates, and obvious localized fixes; do not start Claude just to decide or review a small task. Delegate larger scoped repository work when the handoff is useful through `pnpm agent:claude run <brief.md> --edit`; use `run <brief.md>` for read-only work. Inspect the returned result and actual diff. For app, browser, Simulator, or observed UI work, Codex takes over editing after Claude has stopped. Never run both editors on the same files or recursively delegate between assistants. During `--edit` runs, answer Claude's pending permission requests with `pnpm agent:claude permissions` / `decide` after inspecting the exact request against the brief; never rubber-stamp.

If Claude reports a usage/quota limit, or the user says Claude is exhausted, Codex stops delegating, lets Claude stop, inspects partial changes and run records, and takes over all remaining implementation, debugging, review, verification, and reporting. Continue the already authorized task without requiring the user to restart it or approve the handoff. Delegation stays paused until the user says Claude's allowance is available again or that is confirmed without a billable model request. See "Claude usage limit fallback" in `docs/agent-workflow.md`.

## Read-only reviewer for Claude Code

When the user works directly in Claude Code, Claude implements and calls you through `codex exec -s read-only` for a short plan before coding or a review of its diff afterwards. In those calls you only read and give an opinion: do not edit files, run commands that write, delegate, or start Claude. Plans: files, risks, tests, briefly. Reviews: bugs, security (RLS, private `profiles` columns), web and native iOS regressions, missing tests; cite `file:line` and say plainly when nothing blocks. Full rules: "Revisión con Codex" in `CLAUDE.md`. This does not change the bridge flow above, where you lead and Claude implements.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
