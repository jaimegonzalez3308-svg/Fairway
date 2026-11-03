#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeRunState,
  createRunState,
  decide,
  hookSettings,
  listPending,
  watchPending,
} from "./claude-permissions.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contextFiles = [
  "AGENTS.md",
  "docs/agent-context.md",
  "docs/agent-workflow.md",
];
export const impeccableSkill = "Skill(impeccable:impeccable)";
// Exact plugin skills pre-approved for bridge runs. Explicit names only; no
// wildcards. Approval makes a skill invocable, it does not load it per task.
export const approvedSkills = Object.freeze([
  impeccableSkill,
  "Skill(ui-ux-pro-max:ui-ux-pro-max)",
  "Skill(caveman:caveman)",
]);
const help = `Fairway → Claude Code
  pnpm agent:claude doctor
  pnpm agent:claude login
  pnpm agent:claude run <brief.md> [--edit]
  pnpm agent:claude permissions [run-id]
  pnpm agent:claude decide <run-id> <request-id> <allow|deny> <input-sha256> '<reason>'

Read-only by default. --edit permits coding in manual permission mode: each
permission request Claude makes waits for Codex's explicit decision (deny on
timeout). Both modes pre-approve only these exact plugin skills:
impeccable:impeccable, ui-ux-pro-max:ui-ux-pro-max, caveman:caveman.
permissions/decide need no Claude sign-in and never
run the requested action. Codex reviews and verifies afterward.`;

export function findClaude(env = process.env) {
  const home = env.HOME || os.homedir();
  const candidates = env.FAIRWAY_CLAUDE_BIN
    ? [env.FAIRWAY_CLAUDE_BIN]
    : [
        ...(env.PATH || "")
          .split(path.delimiter)
          .filter(Boolean)
          .map((p) => path.join(p, "claude")),
        path.join(home, ".local/bin/claude"),
        path.join(home, ".claude/local/claude"),
        "/opt/homebrew/bin/claude",
        "/usr/local/bin/claude",
      ];
  if (!env.FAIRWAY_CLAUDE_BIN) {
    for (const base of [".vscode/extensions", ".vscode-insiders/extensions"]) {
      const dir = path.join(home, base);
      if (existsSync(dir)) {
        const versions = readdirSync(dir)
          .filter((n) => n.startsWith("anthropic.claude-code-"))
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        candidates.push(
          ...versions.map((n) =>
            path.join(dir, n, "resources/native-binary/claude"),
          ),
        );
      }
    }
  }
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      /* Try next install. */
    }
  }
  throw new Error(
    "Claude Code was not found. Install/sign in to the Claude Code VS Code extension or set FAIRWAY_CLAUDE_BIN to its executable.",
  );
}

function execute(
  binary,
  args,
  { root, env, input, interactive = false, timeout = 900000 },
) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: root,
      env,
      stdio: interactive ? "inherit" : ["pipe", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "",
      stderr = "",
      failure;
    const stop = (reason) => {
      failure = reason;
      child.kill("SIGTERM");
    };
    const interrupt = () =>
      stop("Claude was interrupted. Inspect any edits before retrying.");
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    const timer = interactive
      ? undefined
      : setTimeout(
          () => stop("Claude timed out. Inspect any edits before retrying."),
          timeout,
        );
    const cleanup = () => {
      clearTimeout(timer);
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
    };
    if (!interactive) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 16000000)
          stop("Claude output exceeded the 16 MB limit.");
      });
      child.stderr.on("data", (chunk) => {
        stderr = (stderr + chunk).slice(-16000);
      });
      child.stdin.on("error", () => {}); // An early auth/argument failure can close stdin.
      child.stdin.end(input || "");
    }
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("close", (code) => {
      cleanup();
      if (failure) reject(new Error(failure));
      else resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function authStatus(binary, root, env) {
  const result = await execute(binary, ["auth", "status"], {
    root,
    env,
    timeout: 20000,
  });
  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      "Claude's authentication status could not be read. Run pnpm agent:claude login.",
    );
  }
  return {
    loggedIn: result.code === 0 && status.loggedIn === true,
    authMethod: status.authMethod || "unknown",
  };
}

function gitStatus(root, env) {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: root,
    env,
    encoding: "utf8",
    shell: false,
  });
  return result.status === 0 ? result.stdout : "Git status unavailable";
}

/**
 * @param {string[]} args
 * @param {{root?: string, env?: NodeJS.ProcessEnv, write?: (s: string) => void,
 *   permissionTimeoutMs?: number, permissionPollMs?: number,
 *   watchIntervalMs?: number, runTimeoutMs?: number}} [options]
 */
export async function main(
  args,
  {
    root = projectRoot,
    env = process.env,
    write = console.log,
    // Test hooks; production defaults: 10-minute decision wait, 45-minute coding run.
    permissionTimeoutMs,
    permissionPollMs,
    watchIntervalMs = 500,
    runTimeoutMs,
  } = {},
) {
  if (!args.length || args[0] === "--help") {
    write(help);
    return 0;
  }
  if (args[0] === "permissions") {
    if (args.length > 2) throw new Error(help);
    write(JSON.stringify(listPending(root, args[1]), null, 2));
    return 0;
  }
  if (args[0] === "decide") {
    if (args.length !== 6) throw new Error(help);
    const record = decide(root, ...args.slice(1));
    write(
      `Recorded ${record.decision} for request ${record.requestId} in run ${record.runId}.`,
    );
    return 0;
  }
  const [command, brief, ...options] = args;
  if (
    !["doctor", "login", "run"].includes(command) ||
    (command !== "run" && args.length !== 1) ||
    (command === "run" &&
      (!brief || options.some((o) => o !== "--edit") || options.length > 1))
  ) {
    throw new Error(help);
  }
  root = realpathSync(root);
  const binary = findClaude(env);
  if (command === "login") {
    const result = await execute(binary, ["auth", "login"], {
      root,
      env,
      interactive: true,
    });
    return result.code;
  }
  const auth = await authStatus(binary, root, env);
  if (command === "doctor") {
    write(
      JSON.stringify(
        {
          binary,
          ...auth,
          contextFiles: contextFiles.map((file) => ({
            file,
            exists: existsSync(path.join(root, file)),
          })),
        },
        null,
        2,
      ),
    );
    return auth.loggedIn ? 0 : 1;
  }
  if (!auth.loggedIn)
    throw new Error(
      "Claude Code is installed but not signed in. Complete pnpm agent:claude login, then retry. No task was sent.",
    );
  const briefPath = realpathSync(path.resolve(root, brief));
  const relative = path.relative(root, briefPath);
  if (
    relative.startsWith(".." + path.sep) ||
    relative === ".." ||
    path.isAbsolute(relative) ||
    !briefPath.endsWith(".md")
  )
    throw new Error("The task brief must be a Markdown file inside Fairway.");
  const task = readFileSync(briefPath, "utf8");
  if (
    task.length > 64000 ||
    !["Scope", "Allowed files", "Acceptance checks"].every((h) =>
      new RegExp(`^## ${h}\\s*$`, "m").test(task),
    )
  )
    throw new Error(
      "Use a brief under 64 KB with Scope, Allowed files, and Acceptance checks sections.",
    );
  const context = contextFiles
    .map(
      (file) =>
        `--- ${file} ---\n${readFileSync(path.join(root, file), "utf8")}`,
    )
    .join("\n\n");
  const edit = options.includes("--edit");
  const prompt = `Codex is delegating this Fairway task directly to Claude Code.\n${edit ? "Edit only the brief's allowed scope; preserve existing edits." : "READ ONLY: do not change files or execute commands."}\nDo not open UI or delegate to another assistant. Return your work and actual checks to Codex, then stop. Never read or include credentials or .env contents.\n\nSHARED PROJECT CONTEXT\n${context}\n\nCURRENT TASK (fresh for this call)\n${task}`;
  const runs = path.join(root, ".agent-runs");
  mkdirSync(runs, { recursive: true, mode: 0o700 });
  const lock = path.join(runs, "active.lock");
  try {
    writeFileSync(
      lock,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "Another bridge run owns .agent-runs/active.lock. Wait for it to stop; inspect the lock before removing a stale one.",
      );
    throw error;
  }
  const id = randomUUID();
  const dir = path.join(runs, id);
  let record,
    stopWatching,
    reviewOpen = false;
  try {
    mkdirSync(dir, { mode: 0o700 });
    const reviewArgs = [];
    if (edit) {
      // Per-run PermissionRequest hook: --settings merges with installed
      // plugin hooks (Impeccable) and leaves global/project settings untouched.
      createRunState(dir, {
        runId: id,
        root,
        mode: "edit",
        brief: relative,
        decisionTimeoutMs: permissionTimeoutMs,
        pollMs: permissionPollMs,
      });
      reviewOpen = true;
      const settings = path.join(dir, "settings.json");
      writeFileSync(settings, JSON.stringify(hookSettings(dir), null, 2), {
        mode: 0o600,
      });
      reviewArgs.push("--settings", settings);
      stopWatching = watchPending(
        root,
        id,
        (request) =>
          write(
            `Permission review pending: run ${id} request ${request.requestId} (${request.toolName}). Inspect with pnpm agent:claude permissions ${id}`,
          ),
        watchIntervalMs,
      );
    }
    record = {
      id,
      startedAt: new Date().toISOString(),
      mode: edit ? "edit" : "read-only",
      brief: relative,
      contextHash: createHash("sha256").update(context).digest("hex"),
      before: gitStatus(root, env),
    };
    writeFileSync(path.join(dir, "brief.md"), task, { mode: 0o600 });
    writeFileSync(path.join(dir, "request.md"), prompt, { mode: 0o600 });
    write(
      `Sending ${edit ? "coding" : "read-only"} task to Claude Code. Run: ${id}`,
    );
    const result = await execute(
      binary,
      [
        "--print",
        "--output-format",
        "json",
        "--tools",
        edit ? "Read,Grep,Glob,Edit,Write,Bash,Skill" : "Read,Grep,Glob,Skill",
        // Pre-approve only the exact listed plugin skills; other skills still need approval.
        "--allowedTools",
        approvedSkills.join(","),
        "--permission-mode",
        edit ? "manual" : "dontAsk",
        ...reviewArgs,
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
        "--disallowedTools",
        "Agent,Task,mcp__*",
      ],
      {
        root,
        env,
        input: prompt,
        timeout: runTimeoutMs ?? (edit ? 2700000 : 900000),
      },
    );
    writeFileSync(path.join(dir, "response.json"), result.stdout, {
      mode: 0o600,
    });
    if (result.stderr)
      writeFileSync(path.join(dir, "stderr.log"), result.stderr, {
        mode: 0o600,
      });
    let response;
    try {
      response = JSON.parse(result.stdout);
    } catch {
      throw new Error(
        `Claude returned no valid JSON result (exit ${result.code}). Inspect .agent-runs/${id}/ before retrying.`,
      );
    }
    record.sessionId = response.session_id;
    record.exitCode = result.code;
    record.success =
      result.code === 0 &&
      response.is_error !== true &&
      response.type === "result" &&
      response.subtype === "success";
    write(
      response.result ||
        `Claude returned ${response.subtype || "an empty result"}.`,
    );
    write(`Review record: .agent-runs/${id}/`);
    return record.success ? 0 : 1;
  } catch (error) {
    if (record) record.error = error.message;
    throw error;
  } finally {
    stopWatching?.();
    if (reviewOpen) {
      try {
        closeRunState(dir);
      } catch (error) {
        if (record) record.reviewCloseError = error.message;
      }
    }
    if (record) {
      record.after = gitStatus(root, env);
      record.finishedAt = new Date().toISOString();
      try {
        writeFileSync(
          path.join(dir, "run.json"),
          JSON.stringify(record, null, 2),
          { mode: 0o600 },
        );
      } finally {
        rmSync(lock, { force: true });
      }
    } else rmSync(lock, { force: true });
  }
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
