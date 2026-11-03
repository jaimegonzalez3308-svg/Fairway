import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  realpathSync,
  existsSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  approvedSkills,
  findClaude,
  impeccableSkill,
  main,
} from "../scripts/claude-bridge.mjs";

const expectedSkills = [
  "Skill(impeccable:impeccable)",
  "Skill(ui-ux-pro-max:ui-ux-pro-max)",
  "Skill(caveman:caveman)",
];

test("approved skill list is exact and wildcard-free", () => {
  assert.equal(impeccableSkill, "Skill(impeccable:impeccable)");
  assert.deepEqual([...approvedSkills], expectedSkills);
  assert.ok(Object.isFrozen(approvedSkills));
  for (const skill of approvedSkills) {
    assert.match(skill, /^Skill\([a-z0-9-]+:[a-z0-9-]+\)$/);
    assert.ok(!skill.includes("*"));
  }
});

function assertRestrictedTools(args: string[], tools: string) {
  assert.equal(args[args.indexOf("--tools") + 1], tools);
  // Skill is available, but only the exact listed plugin skills are pre-approved.
  assert.equal(args.filter((s) => s === "--allowedTools").length, 1);
  const allowed = args[args.indexOf("--allowedTools") + 1];
  assert.equal(allowed, expectedSkills.join(","));
  assert.deepEqual(allowed.split(","), expectedSkills);
  assert.ok(!allowed.includes("*"));
  assert.ok(!args.includes("Skill") && !args.includes("Skill(*)"));
  assert.ok(!args.some((s) => /Skill\([^)]*\*/.test(s)));
  assert.equal(
    args[args.indexOf("--disallowedTools") + 1],
    "Agent,Task,mcp__*",
  );
  assert.ok(args.includes("--strict-mcp-config"));
  assert.equal(args[args.indexOf("--mcp-config") + 1], '{"mcpServers":{}}');
  assert.ok(
    !args.some((s) => s.includes("bypass") || s.includes("skip-permissions")),
  );
}

function fixture() {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "fairway-claude-test-")),
  );
  mkdirSync(path.join(root, "docs"));
  writeFileSync(
    path.join(root, "AGENTS.md"),
    "Preserve existing edits. Codex owns review.",
  );
  writeFileSync(
    path.join(root, "docs/agent-context.md"),
    "Shared website/app. No Apple membership.",
  );
  writeFileSync(
    path.join(root, "docs/agent-workflow.md"),
    "UI checks belong to Codex.",
  );
  writeFileSync(
    path.join(root, "task.md"),
    "# Task\nCheck connection.\n## Scope\nRead context.\n## Allowed files\nNone.\n## Acceptance checks\nConfirm requirements.",
  );
  writeFileSync(
    path.join(root, ".env.local"),
    "PRIVATE_FIXTURE_SENTINEL=do-not-transmit",
  );
  const binary = path.join(root, "claude");
  writeFileSync(
    binary,
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'auth') {
  console.log(JSON.stringify({loggedIn:process.env.FAKE_AUTH !== 'false',authMethod:'fixture'}));
  process.exit(process.env.FAKE_AUTH === 'false' ? 1 : 0);
}
let input='';
process.stdin.on('data',chunk=>input+=chunk);
process.stdin.on('end',()=>{
  fs.writeFileSync('received.json',JSON.stringify({args,input,cwd:process.cwd()}));
  if(process.env.FAKE_PERMISSION && args.includes('--settings')){
    // Act like Claude Code: run the configured PermissionRequest command hook via a shell.
    const settings=JSON.parse(fs.readFileSync(args[args.indexOf('--settings')+1],'utf8'));
    const hook=settings.hooks.PermissionRequest[0].hooks[0];
    const out=require('node:child_process').spawnSync('/bin/sh',['-c',hook.command],{encoding:'utf8',input:JSON.stringify({hook_event_name:'PermissionRequest',session_id:'fixture-session',cwd:process.cwd(),tool_name:'Bash',tool_input:{command:'echo fairway-marker'},permission_suggestions:[{type:'addRules',behavior:'allow'}]})});
    fs.writeFileSync('hook-output.json',out.stdout);
  }
  const finish=()=>{
    console.log(JSON.stringify({type:'result',subtype:process.env.FAKE_FAIL ? 'error_during_execution' : 'success',is_error:!!process.env.FAKE_FAIL,result:process.env.FAKE_FAIL ? 'Permission denied; no changes.' : 'Context received. No files changed.',session_id:'fixture-session'}));
  };
  if(process.env.FAKE_HOLD){
    const timer=setInterval(()=>{if(fs.existsSync('release')){clearInterval(timer);finish();}},20);
  }else finish();
});
`,
    { mode: 0o700 },
  );
  return {
    root,
    binary,
    env: { ...process.env, FAIRWAY_CLAUDE_BIN: binary },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    records: () =>
      readdirSync(path.join(root, ".agent-runs")).filter(
        (n) => n !== "active.lock",
      ),
  };
}

test("bridge discovers the VS Code binary and rejects an invalid explicit override", () => {
  const f = fixture();
  try {
    const dir = path.join(
      f.root,
      ".vscode/extensions/anthropic.claude-code-2.1.317-darwin-arm64/resources/native-binary",
    );
    mkdirSync(dir, { recursive: true });
    const binary = path.join(dir, "claude");
    writeFileSync(binary, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    assert.equal(
      findClaude({ ...process.env, HOME: f.root, PATH: "" }),
      binary.replace(/^\/var\//, "/private/var/"),
    );
    assert.throws(
      () =>
        findClaude({
          ...process.env,
          HOME: f.root,
          PATH: "",
          FAIRWAY_CLAUDE_BIN: path.join(f.root, "missing"),
        }),
      /not found/,
    );
  } finally {
    f.cleanup();
  }
});

test("bridge sends fresh curated context over stdin, receives a result, and keeps records private", async () => {
  const f = fixture();
  const output: string[] = [];
  try {
    assert.equal(
      await main(["run", "task.md"], {
        root: f.root,
        env: f.env,
        write: (s: string) => output.push(s),
      }),
      0,
    );
    const received = JSON.parse(
      readFileSync(path.join(f.root, "received.json"), "utf8"),
    );
    assert.match(received.input, /No Apple membership/);
    assert.match(received.input, /Check connection/);
    assert.doesNotMatch(
      received.input,
      /PRIVATE_FIXTURE_SENTINEL|do-not-transmit/,
    );
    assertRestrictedTools(received.args, "Read,Grep,Glob,Skill");
    assert.equal(
      received.args[received.args.indexOf("--permission-mode") + 1],
      "dontAsk",
    );
    assert.ok(
      !received.args.includes("--settings"),
      "read-only runs get no review hook",
    );
    const dir = path.join(f.root, ".agent-runs", f.records()[0]);
    const record = JSON.parse(readFileSync(path.join(dir, "run.json"), "utf8"));
    assert.equal(record.success, true);
    assert.equal(record.sessionId, "fixture-session");
    assert.equal(statSync(path.join(dir, "request.md")).mode & 0o777, 0o600);
    assert.equal(
      existsSync(path.join(f.root, ".agent-runs/active.lock")),
      false,
    );
    assert.ok(output.some((s) => s.includes("Context received")));
    writeFileSync(
      path.join(f.root, "docs/agent-context.md"),
      "Updated project decision.",
    );
    assert.equal(
      await main(["run", "task.md", "--edit"], {
        root: f.root,
        env: f.env,
        write: () => {},
      }),
      0,
    );
    const next = JSON.parse(
      readFileSync(path.join(f.root, "received.json"), "utf8"),
    );
    assert.match(next.input, /Updated project decision/);
    assert.doesNotMatch(next.input, /No Apple membership/);
    assert.equal(
      next.args[next.args.indexOf("--permission-mode") + 1],
      "manual",
    );
    assert.ok(!next.args.some((s: string) => s === "acceptEdits"));
    assertRestrictedTools(next.args, "Read,Grep,Glob,Edit,Write,Bash,Skill");
    // Per-run settings file in the private run dir; no global/project settings written.
    const settingsPath = next.args[next.args.indexOf("--settings") + 1];
    const editDir = path.join(
      f.root,
      ".agent-runs",
      f.records().find((n) => n !== path.basename(dir))!,
    );
    assert.equal(settingsPath, path.join(editDir, "settings.json"));
    assert.equal(statSync(settingsPath).mode & 0o777, 0o600);
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    assert.deepEqual(Object.keys(settings), ["hooks"]);
    assert.match(
      settings.hooks.PermissionRequest[0].hooks[0].command,
      /claude-permissions\.mjs' 'hook' '/,
    );
    assert.equal(existsSync(path.join(f.root, ".claude")), false);
    assert.equal(
      JSON.parse(
        readFileSync(path.join(editDir, "permission-state.json"), "utf8"),
      ).closed,
      true,
    );
    assert.notEqual(
      JSON.parse(
        readFileSync(
          path.join(
            f.root,
            ".agent-runs",
            f.records().find((n) => n !== path.basename(dir))!,
            "run.json",
          ),
          "utf8",
        ),
      ).contextHash,
      record.contextHash,
    );
  } finally {
    f.cleanup();
  }
});

test("unauthenticated and failed model calls never count as a successful connection", async () => {
  const f = fixture();
  try {
    await assert.rejects(
      main(["run", "task.md"], {
        root: f.root,
        env: { ...f.env, FAKE_AUTH: "false" },
        write: () => {},
      }),
      /not signed in/,
    );
    assert.equal(existsSync(path.join(f.root, "received.json")), false);
    assert.equal(existsSync(path.join(f.root, ".agent-runs")), false);
    assert.equal(
      await main(["run", "task.md"], {
        root: f.root,
        env: { ...f.env, FAKE_FAIL: "true" },
        write: () => {},
      }),
      1,
    );
    const record = JSON.parse(
      readFileSync(
        path.join(f.root, ".agent-runs", f.records()[0], "run.json"),
        "utf8",
      ),
    );
    assert.equal(record.success, false);
    assert.equal(
      existsSync(path.join(f.root, ".agent-runs/active.lock")),
      false,
    );
    await assert.rejects(
      main(["run", ".env.local"], {
        root: f.root,
        env: f.env,
        write: () => {},
      }),
      /Markdown/,
    );
  } finally {
    f.cleanup();
  }
});

async function reviewedRun(
  f: ReturnType<typeof fixture>,
  answer?: "allow" | "deny",
  permissionTimeoutMs = 5000,
) {
  const output: string[] = [];
  const run = main(["run", "task.md", "--edit"], {
    root: f.root,
    env: { ...f.env, FAKE_PERMISSION: "true" },
    write: (s: string) => output.push(s),
    permissionTimeoutMs,
    permissionPollMs: 20,
    watchIntervalMs: 20,
  });
  if (answer) {
    let line: string | undefined;
    for (let i = 0; i < 500 && !line; i++) {
      line = output.find((s) => s.startsWith("Permission review pending"));
      if (!line) await delay(10);
    }
    assert.ok(line, "the bridge announces the pending request");
    assert.doesNotMatch(line!, /fairway-marker/, "tool input is not printed");
    const [, runId, requestId] = /run (\S+) request (\S+)/.exec(line!)!;
    // Controller commands work with no Claude binary or sign-in available.
    const noClaude = {
      ...process.env,
      FAIRWAY_CLAUDE_BIN: path.join(f.root, "missing"),
    };
    const listed: string[] = [];
    assert.equal(
      await main(["permissions", runId], {
        root: f.root,
        env: noClaude,
        write: (s: string) => listed.push(s),
      }),
      0,
    );
    const [pending] = JSON.parse(listed[0]);
    assert.equal(pending.requestId, requestId);
    assert.deepEqual(pending.toolInput, { command: "echo fairway-marker" });
    await assert.rejects(
      main(["decide", runId, requestId, answer, "f".repeat(64), "Wrong hash"], {
        root: f.root,
        env: noClaude,
        write: () => {},
      }),
      /does not match/,
    );
    assert.equal(
      await main(
        [
          "decide",
          runId,
          requestId,
          answer,
          pending.inputSha256,
          "Harmless in-scope marker",
        ],
        { root: f.root, env: noClaude, write: () => {} },
      ),
      0,
    );
  }
  assert.equal(await run, 0);
  const hook = JSON.parse(
    readFileSync(path.join(f.root, "hook-output.json"), "utf8"),
  );
  assert.equal(existsSync(path.join(f.root, ".agent-runs/active.lock")), false);
  return hook.hookSpecificOutput.decision;
}

test("coding runs route permission requests to Codex's explicit decision", async () => {
  const f = fixture();
  try {
    assert.deepEqual(await reviewedRun(f, "allow"), { behavior: "allow" });
    const denied = await reviewedRun(f, "deny");
    assert.equal(denied.behavior, "deny");
    assert.equal(denied.interrupt, false);
    assert.match(denied.message, /Harmless in-scope marker/);
    // Nobody answers: the model's request is denied, never allowed by default.
    const unanswered = await reviewedRun(f, undefined, 300);
    assert.equal(unanswered.behavior, "deny");
    assert.match(unanswered.message, /timeout/);
    for (const id of f.records()) {
      const state = JSON.parse(
        readFileSync(
          path.join(f.root, ".agent-runs", id, "permission-state.json"),
          "utf8",
        ),
      );
      assert.equal(state.closed, true);
    }
  } finally {
    f.cleanup();
  }
});

test("overlapping bridge runs cannot edit concurrently and a finished run releases its lock", async () => {
  const f = fixture();
  const first = main(["run", "task.md", "--edit"], {
    root: f.root,
    env: { ...f.env, FAKE_HOLD: "true" },
    write: () => {},
  });
  try {
    for (
      let i = 0;
      i < 200 && !existsSync(path.join(f.root, "received.json"));
      i++
    )
      await delay(10);
    assert.ok(existsSync(path.join(f.root, "received.json")));
    await assert.rejects(
      main(["run", "task.md", "--edit"], {
        root: f.root,
        env: f.env,
        write: () => {},
      }),
      /Another bridge run/,
    );
  } finally {
    writeFileSync(path.join(f.root, "release"), "");
    try {
      assert.equal(await first, 0);
      assert.equal(
        existsSync(path.join(f.root, ".agent-runs/active.lock")),
        false,
      );
    } finally {
      f.cleanup();
    }
  }
});
