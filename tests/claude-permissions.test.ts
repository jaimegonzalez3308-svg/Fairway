import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  allowOutput,
  closeRunState,
  createRunState,
  decide,
  hookCommand,
  hookScript,
  hookSettings,
  invocationHash,
  listPending,
  runHook as evaluateHook,
  shellQuote,
} from "../scripts/claude-permissions.mjs";

type HookOutput = {
  hookSpecificOutput: {
    hookEventName: string;
    decision: { behavior: string; message?: string; interrupt?: boolean };
  };
};

// Root deliberately contains a space and an apostrophe to exercise shell quoting.
function fixture({ timeoutMs = 4000, ownerPid = process.pid } = {}) {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "fairway it's perm-")),
  );
  const runId = randomUUID();
  const runDir = path.join(root, ".agent-runs", runId);
  createRunState(runDir, {
    runId,
    root,
    mode: "edit",
    brief: "task.md",
    ownerPid,
    decisionTimeoutMs: timeoutMs,
    pollMs: 20,
  });
  writeFileSync(path.join(runDir, "brief.md"), "# Task\n", { mode: 0o600 });
  return {
    root,
    runId,
    runDir,
    queue: () => readdirSync(path.join(runDir, "permissions")),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const request = (root: string, extra: Record<string, unknown> = {}) => ({
  hook_event_name: "PermissionRequest",
  session_id: "session-1",
  cwd: root,
  tool_name: "Bash",
  tool_input: { command: "echo fairway-marker", description: "Marker" },
  permission_suggestions: [
    { type: "addRules", rules: [{ toolName: "Bash" }], behavior: "allow" },
  ],
  ...extra,
});

/** Runs the real hook exactly as Claude Code would: a shell command string. */
function runHook(runDir: string, cwd: string, stdin: string, direct = false) {
  // `direct` skips the shell so a signal reaches the hook process itself.
  const child = direct
    ? spawn(process.execPath, [hookScript, "hook", runDir], { cwd })
    : spawn("/bin/sh", ["-c", hookCommand(runDir)], { cwd });
  let stdout = "";
  let exited = false;
  child.stdout.on("data", (c) => (stdout += c));
  child.stdin.on("error", () => {}); // Oversize input: the hook stops reading early.
  child.stdin.end(stdin);
  const done = new Promise<HookOutput>((resolve, reject) =>
    child.once("close", (code) => {
      exited = true;
      try {
        assert.equal(code, 0);
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    }),
  );
  return { done, exited: () => exited, kill: () => child.kill("SIGTERM") };
}

async function waitPending(root: string, runId: string) {
  for (let i = 0; i < 300; i++) {
    const pending = listPending(root, runId);
    if (pending.length) return pending;
    await delay(10);
  }
  throw new Error("No pending request appeared.");
}

function assertDeny(output: HookOutput, pattern?: RegExp) {
  assert.equal(output.hookSpecificOutput.hookEventName, "PermissionRequest");
  assert.equal(output.hookSpecificOutput.decision.behavior, "deny");
  assert.equal(output.hookSpecificOutput.decision.interrupt, false);
  if (pattern)
    assert.match(output.hookSpecificOutput.decision.message!, pattern);
}

test("hook settings quote the node path, hook script and run dir for the shell", () => {
  const f = fixture();
  try {
    const settings = hookSettings(f.runDir);
    const entry = settings.hooks.PermissionRequest[0];
    assert.equal(entry.matcher, "*");
    assert.equal(entry.hooks[0].type, "command");
    assert.ok(entry.hooks[0].timeout > 4 && entry.hooks[0].timeout <= 640);
    assert.equal(
      entry.hooks[0].command,
      [process.execPath, hookScript, "hook", f.runDir]
        .map(shellQuote)
        .join(" "),
    );
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
    const echoed = spawnSync(
      "/bin/sh",
      ["-c", `printf %s ${shellQuote(f.runDir)}`],
      {
        encoding: "utf8",
      },
    );
    assert.equal(echoed.stdout, f.runDir);
    assert.equal(
      statSync(path.join(f.runDir, "permission-state.json")).mode & 0o777,
      0o600,
    );
  } finally {
    f.cleanup();
  }
});

test("hook waits for Codex, then allows only that exact invocation once", async () => {
  const f = fixture();
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const [pending] = await waitPending(f.root, f.runId);
    await delay(200);
    assert.equal(hook.exited(), false, "hook must not decide on its own");
    assert.deepEqual(pending.toolInput, {
      command: "echo fairway-marker",
      description: "Marker",
    });
    assert.equal(pending.toolName, "Bash");
    assert.equal(pending.hashMatchesInput, true);
    assert.equal(pending.taskBrief, `.agent-runs/${f.runId}/brief.md`);
    assert.equal(
      pending.inputSha256,
      invocationHash("Bash", {
        description: "Marker",
        command: "echo fairway-marker",
      }),
    );
    const requestFile = path.join(
      f.runDir,
      "permissions",
      `${pending.requestId}.request.json`,
    );
    assert.equal(statSync(requestFile).mode & 0o777, 0o600);
    assert.doesNotMatch(
      readFileSync(requestFile, "utf8"),
      /addRules|permission_suggestions/,
    );
    decide(
      f.root,
      f.runId,
      pending.requestId,
      "allow",
      pending.inputSha256,
      "In-scope marker",
    );
    const output = await hook.done;
    // Exact allow shape: no updatedInput, updatedPermissions or echoed suggestions.
    assert.deepEqual(output, allowOutput());
    const result = JSON.parse(
      readFileSync(
        path.join(f.runDir, "permissions", `${pending.requestId}.result.json`),
        "utf8",
      ),
    );
    assert.equal(result.status, "allowed");
    assert.equal(JSON.stringify(result).includes("fairway-marker"), false);
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          pending.requestId,
          "allow",
          pending.inputSha256,
          "Replay",
        ),
      /already/,
    );
    assert.deepEqual(listPending(f.root, f.runId), []);
  } finally {
    f.cleanup();
  }
});

test("denial returns deny with the reason and without interrupting Claude", async () => {
  const f = fixture();
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const [pending] = await waitPending(f.root, f.runId);
    decide(
      f.root,
      f.runId,
      pending.requestId,
      "deny",
      pending.inputSha256,
      "Outside the brief",
    );
    assertDeny(await hook.done, /denied: Outside the brief/);
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          pending.requestId,
          "allow",
          pending.inputSha256,
          "Flip",
        ),
      /already/,
    );
  } finally {
    f.cleanup();
  }
});

test("no decision means denial after the timeout; late answers are rejected", async () => {
  const f = fixture({ timeoutMs: 300 });
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const output = await hook.done;
    assertDeny(output, /timeout/);
    const [name] = f.queue().filter((n) => n.endsWith(".request.json"));
    const record = JSON.parse(
      readFileSync(path.join(f.runDir, "permissions", name), "utf8"),
    );
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          record.requestId,
          "allow",
          record.inputSha256,
          "Late",
        ),
      /resolved|expired/,
    );
  } finally {
    f.cleanup();
  }
});

test("an approval cannot revive a request whose deadline passed while the hook slept", async () => {
  const f = fixture({ timeoutMs: 1000 });
  let now = Date.now();
  try {
    const pendingHook = evaluateHook(
      f.runDir,
      JSON.stringify(request(f.root)),
      {
        now: () => now,
      },
    );
    const [pending] = listPending(f.root, f.runId);
    decide(
      f.root,
      f.runId,
      pending.requestId,
      "allow",
      pending.inputSha256,
      "In scope",
      {
        now: () => now,
      },
    );
    now += 1001;
    assertDeny(await pendingHook, /timeout/);
  } finally {
    f.cleanup();
  }
});

test("tampered hashes, rewritten inputs and forged decisions fail closed", async () => {
  const f = fixture();
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const [pending] = await waitPending(f.root, f.runId);
    const file = path.join(
      f.runDir,
      "permissions",
      `${pending.requestId}.request.json`,
    );
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          pending.requestId,
          "allow",
          "0".repeat(64),
          "Wrong hash",
        ),
      /does not match/,
    );
    // Rewriting the reviewed input without updating the hash is detected.
    const original = JSON.parse(readFileSync(file, "utf8"));
    const forgedInput = { command: "rm -rf ~", description: "Marker" };
    writeFileSync(
      file,
      JSON.stringify({ ...original, toolInput: forgedInput }),
    );
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          pending.requestId,
          "allow",
          pending.inputSha256,
          "Tampered",
        ),
      /does not match/,
    );
    // Even a consistent rewrite (new input + new hash) cannot approve the real
    // invocation: the hook compares against the hash of what Claude asked for.
    const forgedHash = invocationHash("Bash", forgedInput);
    writeFileSync(
      file,
      JSON.stringify({
        ...original,
        toolInput: forgedInput,
        inputSha256: forgedHash,
      }),
    );
    decide(f.root, f.runId, pending.requestId, "allow", forgedHash, "Forged");
    assertDeny(await hook.done, /did not match/);
  } finally {
    f.cleanup();
  }

  const g = fixture();
  try {
    const hook = runHook(g.runDir, g.root, JSON.stringify(request(g.root)));
    const [pending] = await waitPending(g.root, g.runId);
    writeFileSync(
      path.join(g.runDir, "permissions", `${pending.requestId}.decision.json`),
      "{not json",
    );
    assertDeny(await hook.done, /malformed/);
  } finally {
    g.cleanup();
  }
});

test("decide validates IDs, decision, hash and reason and never needs Claude", async () => {
  const f = fixture();
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const [p] = await waitPending(f.root, f.runId);
    const ok = [
      f.root,
      f.runId,
      p.requestId,
      "allow",
      p.inputSha256,
      "Fine",
    ] as const;
    const cases: [unknown[], RegExp][] = [
      [[f.root, "../etc", p.requestId, "allow", p.inputSha256, "x"], /run ID/],
      [[f.root, f.runId, "nope", "allow", p.inputSha256, "x"], /request ID/],
      [[f.root, f.runId, randomUUID(), "allow", p.inputSha256, "x"], /No such/],
      [
        [f.root, randomUUID(), p.requestId, "allow", p.inputSha256, "x"],
        /missing/,
      ],
      [
        [f.root, f.runId, p.requestId, "yes", p.inputSha256, "x"],
        /allow or deny/,
      ],
      [[f.root, f.runId, p.requestId, "allow", "ABC", "x"], /SHA-256/],
      [[f.root, f.runId, p.requestId, "allow", p.inputSha256, "   "], /reason/],
      [
        [f.root, f.runId, p.requestId, "allow", p.inputSha256, "a\nb"],
        /reason/,
      ],
      [
        [f.root, f.runId, p.requestId, "allow", p.inputSha256, "x".repeat(501)],
        /reason/,
      ],
    ];
    for (const [args, pattern] of cases)
      assert.throws(
        () => (decide as (...a: unknown[]) => unknown)(...args),
        pattern,
      );
    await delay(100);
    assert.equal(
      hook.exited(),
      false,
      "rejected answers must not resolve the request",
    );
    decide(...ok);
    assert.deepEqual(await hook.done, allowOutput());
    assert.throws(() => listPending(f.root, "bad-id"), /run ID/);
  } finally {
    f.cleanup();
  }
});

test("closing the run or losing the bridge owner denies pending and new requests", async () => {
  const f = fixture();
  try {
    const hook = runHook(f.runDir, f.root, JSON.stringify(request(f.root)));
    const [pending] = await waitPending(f.root, f.runId);
    closeRunState(f.runDir);
    assertDeny(await hook.done, /closed/);
    assert.throws(
      () =>
        decide(
          f.root,
          f.runId,
          pending.requestId,
          "allow",
          pending.inputSha256,
          "Late",
        ),
      /closed/,
    );
    const status = JSON.parse(
      readFileSync(
        path.join(f.runDir, "permissions", `${pending.requestId}.result.json`),
        "utf8",
      ),
    ).status;
    assert.equal(status, "closed");
    const before = f.queue().length;
    assertDeny(
      await runHook(f.runDir, f.root, JSON.stringify(request(f.root))).done,
      /run is closed/,
    );
    assert.equal(
      f.queue().length,
      before,
      "closed runs create no new requests",
    );
  } finally {
    f.cleanup();
  }

  const dead = spawnSync(process.execPath, ["-e", ""]).pid;
  const g = fixture({ ownerPid: dead });
  try {
    assertDeny(
      await runHook(g.runDir, g.root, JSON.stringify(request(g.root))).done,
      /owner is not running/,
    );
    assert.deepEqual(g.queue(), []);
    assert.throws(() => listPending(g.root, g.runId), /owner/);
    assert.deepEqual(listPending(g.root), []);
  } finally {
    g.cleanup();
  }
});

test("cancelling the hook denies and records the cancellation", async () => {
  const f = fixture();
  try {
    const hook = runHook(
      f.runDir,
      f.root,
      JSON.stringify(request(f.root)),
      true,
    );
    const [pending] = await waitPending(f.root, f.runId);
    hook.kill();
    assertDeny(await hook.done, /cancelled/);
    const result = JSON.parse(
      readFileSync(
        path.join(f.runDir, "permissions", `${pending.requestId}.result.json`),
        "utf8",
      ),
    );
    assert.equal(result.status, "cancelled");
  } finally {
    f.cleanup();
  }
});

test("malformed or out-of-scope hook input is denied without a pending request", async () => {
  const f = fixture();
  try {
    const inputs = [
      "",
      "not json",
      "[]",
      JSON.stringify(request(f.root, { hook_event_name: "PreToolUse" })),
      JSON.stringify(request(f.root, { tool_name: "" })),
      JSON.stringify(request(f.root, { tool_name: "Bash; rm" })),
      JSON.stringify(request(f.root, { tool_input: "echo" })),
      JSON.stringify(request(f.root, { session_id: 5 })),
      JSON.stringify(request(f.root, { cwd: "relative" })),
      JSON.stringify(request(f.root, { cwd: os.tmpdir() })),
      JSON.stringify(request(f.root, { cwd: path.join(f.root, "missing") })),
      JSON.stringify(
        request(f.root, {
          tool_input: { content: "x".repeat(3 * 1024 * 1024) },
        }),
      ),
    ];
    for (const input of inputs)
      assertDeny(await runHook(f.runDir, f.root, input).done);
    assert.deepEqual(f.queue(), []);
    const missing = path.join(f.root, ".agent-runs", randomUUID());
    assertDeny(
      await runHook(missing, f.root, JSON.stringify(request(f.root))).done,
      /missing/,
    );
    assert.equal(existsSync(missing), false);
  } finally {
    f.cleanup();
  }
});
