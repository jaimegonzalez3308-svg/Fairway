#!/usr/bin/env node
// Fairway bridge permission review: a Claude Code PermissionRequest command hook
// plus the helpers Codex's controller commands use to list and answer requests.
// Nothing here approves an action automatically, and nothing here runs the
// requested action. Every failure path denies.
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const hookScript = fileURLToPath(import.meta.url);
export const MAX_DECISION_TIMEOUT_MS = 600000; // 10 minutes.
export const DEFAULT_POLL_MS = 250;
export const MAX_HOOK_INPUT_BYTES = 2 * 1024 * 1024;
const STATE_FILE = "permission-state.json";
const QUEUE_DIR = "permissions";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;

const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Deterministic JSON (sorted object keys) so the hash binds exact content. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function invocationHash(toolName, toolInput) {
  return createHash("sha256")
    .update(canonicalJson({ tool_name: toolName, tool_input: toolInput }))
    .digest("hex");
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

export function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return MAX_DECISION_TIMEOUT_MS;
  return Math.min(Math.max(Math.floor(n), 50), MAX_DECISION_TIMEOUT_MS);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Atomic write via temp + rename (replaces). */
function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(tmp, file);
}

/** Atomic, exclusive write: fails with EEXIST if the target already exists. */
function writeExclusive(file, data) {
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  try {
    linkSync(tmp, file);
  } finally {
    rmSync(tmp, { force: true });
  }
}

function tryWriteExclusive(file, data) {
  try {
    writeExclusive(file, data);
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

const files = (runDir, requestId) => {
  const queue = path.join(runDir, QUEUE_DIR);
  return {
    request: path.join(queue, `${requestId}.request.json`),
    decision: path.join(queue, `${requestId}.decision.json`),
    result: path.join(queue, `${requestId}.result.json`),
  };
};

// ---------------------------------------------------------------------------
// Run state (written by the bridge parent).

export function createRunState(
  runDir,
  {
    runId,
    root,
    mode,
    brief,
    ownerPid = process.pid,
    decisionTimeoutMs,
    pollMs,
  },
) {
  mkdirSync(path.join(runDir, QUEUE_DIR), { recursive: true, mode: 0o700 });
  const state = {
    runId,
    root: realpathSync(root),
    mode,
    brief,
    ownerPid,
    decisionTimeoutMs: clampTimeout(decisionTimeoutMs),
    pollMs: Math.max(10, Math.min(Number(pollMs) || DEFAULT_POLL_MS, 5000)),
    closed: false,
    createdAt: new Date().toISOString(),
  };
  writeAtomic(path.join(runDir, STATE_FILE), state);
  return state;
}

/** Mark the run closed and close every unresolved request (fail closed). */
export function closeRunState(runDir) {
  const stateFile = path.join(runDir, STATE_FILE);
  if (!existsSync(stateFile)) return;
  const state = readJson(stateFile);
  writeAtomic(stateFile, {
    ...state,
    closed: true,
    closedAt: new Date().toISOString(),
  });
  const queue = path.join(runDir, QUEUE_DIR);
  if (!existsSync(queue)) return;
  for (const name of readdirSync(queue)) {
    const match = /^(.+)\.request\.json$/.exec(name);
    if (!match) continue;
    tryWriteExclusive(files(runDir, match[1]).result, {
      requestId: match[1],
      status: "closed",
      behavior: "deny",
      at: new Date().toISOString(),
    });
  }
}

/** Per-run settings passed with --settings; merges with installed plugin hooks. */
export function hookSettings(runDir, { execPath = process.execPath } = {}) {
  const state = readJson(path.join(runDir, STATE_FILE));
  return {
    hooks: {
      PermissionRequest: [
        {
          matcher: "*",
          hooks: [
            {
              type: "command",
              command: hookCommand(runDir, { execPath }),
              // Seconds; slightly longer than the decision wait so the hook decides.
              timeout: Math.ceil(state.decisionTimeoutMs / 1000) + 30,
            },
          ],
        },
      ],
    },
  };
}

export function hookCommand(runDir, { execPath = process.execPath } = {}) {
  return [execPath, hookScript, "hook", runDir].map(shellQuote).join(" ");
}

/** Validate the run directory/state; returns {state} or {error}. */
export function activeRun(runDir) {
  let state;
  try {
    state = readJson(path.join(runDir, STATE_FILE));
  } catch {
    return { error: "run state is missing or unreadable" };
  }
  if (!isObject(state) || !UUID.test(String(state.runId)))
    return { error: "run state is malformed" };
  if (path.basename(runDir) !== state.runId)
    return { error: "run ID does not match its directory" };
  try {
    if (
      realpathSync(runDir) !==
      path.join(realpathSync(state.root), ".agent-runs", state.runId)
    )
      return { error: "run directory is outside the recorded repository" };
  } catch {
    return { error: "run directory or repository root is missing" };
  }
  if (state.closed !== false) return { error: "run is closed" };
  if (!pidAlive(state.ownerPid))
    return { error: "bridge owner is not running" };
  return { state };
}

// ---------------------------------------------------------------------------
// Hook (runs inside Claude Code's PermissionRequest command hook).

export function allowOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  };
}

export function denyOutput(message) {
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "deny",
        message: `Fairway Codex review: ${message}`.slice(0, 500),
        interrupt: false,
      },
    },
  };
}

/** Parse and validate raw hook stdin. Returns {input} or {error}. */
export function parseHookInput(raw, state) {
  if (typeof raw !== "string" || !raw.length) return { error: "empty input" };
  if (Buffer.byteLength(raw) > MAX_HOOK_INPUT_BYTES)
    return { error: "input exceeds the size limit" };
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return { error: "input is not JSON" };
  }
  if (!isObject(input)) return { error: "input is not an object" };
  if (input.hook_event_name !== "PermissionRequest")
    return { error: "unexpected hook event" };
  if (
    typeof input.tool_name !== "string" ||
    !/^[A-Za-z0-9_:.()*-]{1,200}$/.test(input.tool_name)
  )
    return { error: "invalid tool name" };
  if (!isObject(input.tool_input)) return { error: "invalid tool input" };
  if (typeof input.session_id !== "string" || input.session_id.length > 200)
    return { error: "invalid session" };
  if (typeof input.cwd !== "string" || !path.isAbsolute(input.cwd))
    return { error: "invalid working directory" };
  let cwd;
  try {
    cwd = realpathSync(input.cwd);
  } catch {
    return { error: "working directory does not exist" };
  }
  const rel = path.relative(state.root, cwd);
  if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel))
    return { error: "working directory is outside the repository" };
  return { input: { ...input, cwd } };
}

function validDecision(decision, { runId, requestId, hash, expiresAt }) {
  return (
    isObject(decision) &&
    decision.runId === runId &&
    decision.requestId === requestId &&
    decision.inputSha256 === hash &&
    (decision.decision === "allow" || decision.decision === "deny") &&
    typeof decision.reason === "string" &&
    decision.reason.trim().length > 0 &&
    Date.parse(decision.decidedAt) <= expiresAt
  );
}

/**
 * Full hook flow. Writes a pending request, waits for a one-time matching
 * decision, and returns hook output. Every non-approval path denies.
 */
export async function runHook(runDir, raw, { signal, now = Date.now } = {}) {
  const run = activeRun(runDir);
  if (run.error) return denyOutput(`${run.error}; not approved.`);
  const { state } = run;
  const parsed = parseHookInput(raw, state);
  if (parsed.error) return denyOutput(`${parsed.error}; not approved.`);
  const { input } = parsed;
  const requestId = randomUUID();
  const hash = invocationHash(input.tool_name, input.tool_input);
  const createdAt = now();
  const expiresAt = createdAt + clampTimeout(state.decisionTimeoutMs);
  const f = files(runDir, requestId);
  writeExclusive(f.request, {
    runId: state.runId,
    requestId,
    toolName: input.tool_name,
    toolInput: input.tool_input,
    inputSha256: hash,
    sessionId: input.session_id,
    cwd: input.cwd,
    hookPid: process.pid,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });
  const finish = (status, output) => {
    // A pre-existing result (closed by the bridge) wins and forces denial.
    const recorded = tryWriteExclusive(f.result, {
      requestId,
      status,
      behavior: output.hookSpecificOutput.decision.behavior,
      at: new Date().toISOString(),
    });
    return recorded ? output : denyOutput("run closed; not approved.");
  };
  for (;;) {
    if (signal?.aborted)
      return finish("cancelled", denyOutput("review cancelled; not approved."));
    if (existsSync(f.result))
      return denyOutput("request was closed; not approved.");
    if (now() >= expiresAt)
      return finish(
        "expired",
        denyOutput("no decision before the timeout; not approved."),
      );
    if (existsSync(f.decision)) {
      let decision;
      try {
        decision = readJson(f.decision);
      } catch {
        decision = undefined;
      }
      if (
        !validDecision(decision, {
          runId: state.runId,
          requestId,
          hash,
          expiresAt,
        })
      )
        return finish(
          "invalid-decision",
          denyOutput("decision was malformed or did not match; not approved."),
        );
      const still = activeRun(runDir);
      if (still.error)
        return finish("closed", denyOutput(`${still.error}; not approved.`));
      if (now() >= expiresAt)
        return finish(
          "expired",
          denyOutput("no decision before the timeout; not approved."),
        );
      return decision.decision === "allow"
        ? finish("allowed", allowOutput())
        : finish(
            "denied",
            denyOutput(`denied: ${decision.reason.trim().slice(0, 300)}`),
          );
    }
    const check = activeRun(runDir);
    if (check.error)
      return finish("closed", denyOutput(`${check.error}; not approved.`));
    await new Promise((r) => setTimeout(r, state.pollMs));
  }
}

function readStdin(limit, timeoutMs) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    const done = (value) => {
      clearTimeout(timer);
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(value);
    };
    const timer = setTimeout(() => done(""), timeoutMs);
    process.stdin.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) done(null);
      else chunks.push(chunk);
    });
    process.stdin.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => done(""));
  });
}

async function hookMain(runDir) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGTERM", abort);
  process.once("SIGINT", abort);
  let output;
  try {
    if (!runDir || !path.isAbsolute(runDir))
      output = denyOutput("hook run directory is invalid; not approved.");
    else {
      const raw = await readStdin(MAX_HOOK_INPUT_BYTES, 10000);
      output =
        raw === null
          ? denyOutput("input exceeds the size limit; not approved.")
          : await runHook(runDir, raw, { signal: controller.signal });
    }
  } catch {
    output = denyOutput("review failed; not approved.");
  }
  process.stdout.write(JSON.stringify(output) + "\n", () => process.exit(0));
}

// ---------------------------------------------------------------------------
// Controller helpers (Codex's `permissions` and `decide` commands).

function runDirs(root, runId) {
  const runs = path.join(root, ".agent-runs");
  if (runId !== undefined) {
    if (!UUID.test(runId)) throw new Error("Invalid run ID.");
    return [path.join(runs, runId)];
  }
  if (!existsSync(runs)) return [];
  return readdirSync(runs)
    .filter((n) => UUID.test(n))
    .map((n) => path.join(runs, n));
}

/** Active, unresolved, unexpired requests (full detail for Codex's review). */
export function listPending(root, runId, { now = Date.now } = {}) {
  root = realpathSync(root);
  const pending = [];
  for (const dir of runDirs(root, runId)) {
    const run = activeRun(dir);
    if (run.error) {
      if (runId !== undefined) throw new Error(`Run ${runId}: ${run.error}.`);
      continue;
    }
    const queue = path.join(dir, QUEUE_DIR);
    if (!existsSync(queue)) continue;
    for (const name of readdirSync(queue).sort()) {
      const match = /^(.+)\.request\.json$/.exec(name);
      if (!match || !UUID.test(match[1])) continue;
      const f = files(dir, match[1]);
      if (existsSync(f.result) || existsSync(f.decision)) continue;
      let request;
      try {
        request = readJson(f.request);
      } catch {
        continue;
      }
      if (Date.parse(request.expiresAt) <= now()) continue;
      pending.push({
        runId: run.state.runId,
        requestId: request.requestId,
        toolName: request.toolName,
        toolInput: request.toolInput,
        inputSha256: request.inputSha256,
        hashMatchesInput:
          invocationHash(request.toolName, request.toolInput) ===
          request.inputSha256,
        cwd: request.cwd,
        mode: run.state.mode,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        taskBrief: path.relative(root, path.join(dir, "brief.md")),
        originalBrief: run.state.brief,
      });
    }
  }
  return pending;
}

/** Record a one-time decision for an active request. Never runs the action. */
export function decide(
  root,
  runId,
  requestId,
  decision,
  inputSha256,
  reason,
  { now = Date.now } = {},
) {
  root = realpathSync(root);
  if (!UUID.test(String(runId))) throw new Error("Invalid run ID.");
  if (!UUID.test(String(requestId))) throw new Error("Invalid request ID.");
  if (decision !== "allow" && decision !== "deny")
    throw new Error("Decision must be allow or deny.");
  if (!SHA256.test(String(inputSha256)))
    throw new Error("Input hash must be a lowercase SHA-256 hex digest.");
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!trimmed || trimmed.length > 500 || /[\u0000-\u001f\u007f]/.test(trimmed))
    throw new Error("Give a short, single-line reason (1–500 characters).");
  const dir = path.join(root, ".agent-runs", runId);
  const run = activeRun(dir);
  if (run.error) throw new Error(`Run ${runId}: ${run.error}.`);
  const f = files(dir, requestId);
  let request;
  try {
    request = readJson(f.request);
  } catch {
    throw new Error("No such permission request in this run.");
  }
  if (request.runId !== runId || request.requestId !== requestId)
    throw new Error("Request record does not match its IDs.");
  if (
    invocationHash(request.toolName, request.toolInput) !==
      request.inputSha256 ||
    request.inputSha256 !== inputSha256
  )
    throw new Error(
      "Input hash does not match the current request; re-inspect it.",
    );
  if (existsSync(f.result))
    throw new Error("Request is already resolved or closed.");
  if (Date.parse(request.expiresAt) <= now())
    throw new Error("Request has expired.");
  const record = {
    runId,
    requestId,
    decision,
    inputSha256,
    reason: trimmed,
    decidedAt: new Date(now()).toISOString(),
  };
  if (!tryWriteExclusive(f.decision, record))
    throw new Error("A decision was already recorded for this request.");
  return record;
}

/** Poll a run's queue and report each newly pending request once. */
export function watchPending(root, runId, onPending, intervalMs = 500) {
  const seen = new Set();
  const tick = () => {
    try {
      for (const request of listPending(root, runId)) {
        if (seen.has(request.requestId)) continue;
        seen.add(request.requestId);
        onPending(request);
      }
    } catch {
      /* Run not active yet or already closed. */
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(hookScript) &&
  process.argv[2] === "hook"
) {
  hookMain(process.argv[3]).catch(() => {
    process.stdout.write(
      JSON.stringify(denyOutput("review failed; not approved.")) + "\n",
      () => process.exit(0),
    );
  });
}
